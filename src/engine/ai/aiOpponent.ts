import type { Difficulty, GameAction, GameState, PlayerSide } from '../types';
import { getOpponent, getRack, hasGuaranteedSoloCut } from '../rules';
import { bestGuessCandidates, expectedValueOfGuess } from './probabilityModel';

export interface AiPlan {
  action: GameAction;
  reasoning: string;
  confidence: number;
}

function countUnknownTiles(state: GameState, side: PlayerSide): number {
  return getRack(state, side).tiles.filter(t => !t.cut && !t.revealed).length;
}

function countRedWiresInPlay(state: GameState): number {
  let count = 0;
  for (const t of state.playerRack.tiles) if (!t.cut && t.color === 'red') count++;
  for (const t of state.aiRack.tiles) if (!t.cut && t.color === 'red') count++;
  return count;
}

function placeStartingInfoToken(state: GameState, actor: PlayerSide): GameAction {
  const rack = getRack(state, actor);
  const unrevealed = rack.tiles.filter(t => !t.cut && !t.revealed);
  const middle = unrevealed[Math.floor(unrevealed.length / 2)] ?? unrevealed[0] ?? rack.tiles[0];
  return { type: 'PLACE_STARTING_INFO_TOKEN', actor, tileId: middle.id };
}

export function planAiTurn(state: GameState, difficulty: Difficulty = state.difficulty): AiPlan {
  const actor: PlayerSide = 'ai';

  if (state.phase === 'setup') {
    return {
      action: placeStartingInfoToken(state, actor),
      reasoning: 'Placing starting info token on a middle tile',
      confidence: 1,
    };
  }

  const soloCut = hasGuaranteedSoloCut(state, actor);
  if (soloCut) {
    return {
      action: { type: 'SOLO_CUT', actor, tileIds: [soloCut.tiles[0].id, soloCut.tiles[1].id] },
      reasoning: `Guaranteed solo cut available for value ${soloCut.value}`,
      confidence: 1,
    };
  }

  const opponent = getOpponent(actor);
  const candidates = bestGuessCandidates(state, actor);
  const unknownTiles = countUnknownTiles(state, opponent);
  const redInPlay = countRedWiresInPlay(state);

  const ranked = candidates.map(c => ({
    ...c,
    ev: expectedValueOfGuess(
      c.probability,
      state.detonationTracker.current,
      redInPlay,
      unknownTiles
    ),
  }));
  ranked.sort((a, b) => b.ev - a.ev);

  const doubleDetector = state.equipment.find(e => e.name === 'double_detector' && e.unlocked && !e.used);
  if (doubleDetector && ranked.length >= 2) {
    const top = ranked[0];
    const sameValueAlt = ranked.find(c => c.tileId !== top.tileId && c.declaredValue === top.declaredValue);
    if (sameValueAlt && top.probability < 0.8 && sameValueAlt.probability > 0.2) {
      const combined = top.probability + sameValueAlt.probability - top.probability * sameValueAlt.probability;
      if (combined > top.probability + 0.15) {
        return {
          action: {
            type: 'USE_EQUIPMENT_DOUBLE_DETECTOR',
            actor,
            targetTileIds: [top.tileId, sameValueAlt.tileId],
            declaredValue: top.declaredValue,
          },
          reasoning: `Double Detector: ${(combined * 100).toFixed(0)}% combined success on value ${top.declaredValue}`,
          confidence: combined,
        };
      }
    }
  }

  let pick = ranked[0];

  if (difficulty === 'easy') {
    if (Math.random() < 0.25 && ranked.length > 1) {
      pick = ranked[1];
    }
  } else if (difficulty === 'hard') {
    const freeze = state.equipment.find(e => e.name === 'freeze' && e.unlocked && !e.used);
    if (freeze && state.detonationTracker.current <= 2 && pick && pick.probability < 0.7) {
      return {
        action: { type: 'USE_EQUIPMENT_FREEZE', actor },
        reasoning: 'Detonator low, freeze to protect risky guess next turn',
        confidence: 1,
      };
    }
  }

  if (!pick) {
    return {
      action: placeStartingInfoToken(state, actor),
      reasoning: 'Fallback: no viable guess found',
      confidence: 0,
    };
  }

  return {
    action: {
      type: 'GUESS_WIRE',
      actor,
      targetTileId: pick.tileId,
      declaredValue: pick.declaredValue,
    },
    reasoning: `Best guess: ${(pick.probability * 100).toFixed(0)}% chance value ${pick.declaredValue}`,
    confidence: pick.probability,
  };
}
