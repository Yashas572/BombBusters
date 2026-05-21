import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/engine/deck';
import { applyAction, startGame } from '../../src/engine/gameState';
import { TRAINING_MISSIONS } from '../../src/engine/missions/missions';
import { planAiTurn } from '../../src/engine/ai/aiOpponent';
import { bestGuessCandidates } from '../../src/engine/ai/probabilityModel';
import type { Difficulty, GameAction, GameState } from '../../src/engine/types';

function autoPlayerMove(state: GameState): GameAction {
  const candidates = bestGuessCandidates(state, 'player');
  if (candidates.length === 0) {
    const ownTile = state.playerRack.tiles.find(t => !t.cut);
    if (!ownTile) throw new Error('No tiles left to act on');
    const aiTile = state.aiRack.tiles.find(t => !t.cut);
    if (!aiTile) throw new Error('No AI tile to target');
    return { type: 'GUESS_WIRE', actor: 'player', targetTileId: aiTile.id, declaredValue: ownTile.value };
  }
  const pick = candidates[0];
  return { type: 'GUESS_WIRE', actor: 'player', targetTileId: pick.tileId, declaredValue: pick.declaredValue };
}

function playOneGame(missionIdx: number, difficulty: Difficulty, seed: number, autoPlayer: boolean): GameState {
  let state = startGame(createInitialState(TRAINING_MISSIONS[missionIdx], difficulty, seed));
  let safety = 500;
  while (state.phase === 'playing' && safety-- > 0) {
    let action: GameAction;
    if (state.currentTurn === 'ai') {
      action = planAiTurn(state, difficulty).action;
    } else if (autoPlayer) {
      action = autoPlayerMove(state);
    } else {
      const aiTile = state.aiRack.tiles.find(t => !t.cut);
      const playerTile = state.playerRack.tiles.find(t => !t.cut);
      if (!aiTile || !playerTile) break;
      action = {
        type: 'GUESS_WIRE',
        actor: 'player',
        targetTileId: aiTile.id,
        declaredValue: playerTile.value,
      };
    }
    try {
      const result = applyAction(state, action);
      state = result.state;
    } catch (err) {
      break;
    }
  }
  return state;
}

describe('full-game end-to-end simulations', () => {
  it('completes Mission 1 to a terminal state at every difficulty', () => {
    for (const d of ['easy', 'medium', 'hard'] as Difficulty[]) {
      const final = playOneGame(0, d, 100 + Math.floor(Math.random() * 1000), true);
      expect(final.phase).toBe('gameover');
      expect(final.outcome).not.toBeNull();
    }
  });

  it('plays 30 full games on Mission 1 without crashing (Medium)', () => {
    const outcomes: Record<string, number> = {};
    for (let seed = 1; seed <= 30; seed++) {
      const final = playOneGame(0, 'medium', seed, true);
      expect(final.phase).toBe('gameover');
      expect(final.outcome).not.toBeNull();
      const key = final.outcome ?? 'unknown';
      outcomes[key] = (outcomes[key] ?? 0) + 1;
    }
    const total = Object.values(outcomes).reduce((a, b) => a + b, 0);
    expect(total).toBe(30);
  });

  it('plays Mission 7 (red wires) without uncaught exceptions', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const final = playOneGame(6, 'medium', seed, true);
      expect(final.phase).toBe('gameover');
    }
  });

  it('detonation tracker never goes negative', () => {
    for (let seed = 50; seed < 60; seed++) {
      const final = playOneGame(2, 'medium', seed, true);
      expect(final.detonationTracker.current).toBeGreaterThanOrEqual(0);
      expect(final.detonationTracker.current).toBeLessThanOrEqual(final.detonationTracker.max);
    }
  });

  it('cut count never exceeds the deal size', () => {
    for (let seed = 200; seed < 210; seed++) {
      const final = playOneGame(1, 'medium', seed, true);
      const m = TRAINING_MISSIONS[1];
      const totalDealt = m.tilesPerPlayer * 2;
      const cut = [...final.playerRack.tiles, ...final.aiRack.tiles].filter(t => t.cut).length;
      expect(cut).toBeLessThanOrEqual(totalDealt);
    }
  });

  it('player+AI score never exceeds total non-red tiles cut', () => {
    for (let seed = 300; seed < 310; seed++) {
      const final = playOneGame(0, 'medium', seed, true);
      const cut = [...final.playerRack.tiles, ...final.aiRack.tiles].filter(t => t.cut && t.color !== 'red').length;
      expect(final.playerScore + final.aiScore).toBeLessThanOrEqual(cut);
    }
  });

  it('Hard AI outscores a random player over 20 games', () => {
    let aiTotalScore = 0;
    let playerTotalScore = 0;
    for (let seed = 500; seed < 520; seed++) {
      const final = playOneGame(0, 'hard', seed, false);
      aiTotalScore += final.aiScore;
      playerTotalScore += final.playerScore;
    }
    expect(aiTotalScore).toBeGreaterThan(playerTotalScore);
  });
});
