import type { GameState, PlayerSide, Tile } from '../types';
import { getOpponent, getRack } from '../rules';

export interface PositionBelief {
  tileId: string;
  position: number;
  knownValue: number | null;
  candidateValues: Map<number, number>;
  isRevealed: boolean;
  color: 'blue' | 'yellow' | 'red' | 'unknown';
}

export interface OpponentBelief {
  side: PlayerSide;
  positions: PositionBelief[];
}

function blueCopiesRemainingInOpponent(state: GameState, opponentSide: PlayerSide, value: number): number {
  const own = getRack(state, getOpponent(opponentSide));
  const opp = getRack(state, opponentSide);
  const ownActive = own.tiles.filter(t => !t.cut && t.value === value && t.color === 'blue').length;
  const oppRevealedActive = opp.tiles.filter(t => !t.cut && t.value === value && t.color === 'blue' && t.revealed).length;
  const totalCutOfValue =
    own.tiles.filter(t => t.cut && t.value === value && t.color === 'blue').length +
    opp.tiles.filter(t => t.cut && t.value === value && t.color === 'blue').length;
  const remaining = 4 - totalCutOfValue - ownActive - oppRevealedActive;
  return Math.max(0, remaining);
}

export function buildBelief(state: GameState, perspectiveOf: PlayerSide): OpponentBelief {
  const opponent = getOpponent(perspectiveOf);
  const oppRack = getRack(state, opponent);

  const activeTiles = oppRack.tiles.filter(t => !t.cut);
  const positions: PositionBelief[] = activeTiles.map((tile, idx) => ({
    tileId: tile.id,
    position: idx,
    knownValue: tile.revealed ? tile.value : null,
    candidateValues: new Map<number, number>(),
    isRevealed: tile.revealed,
    color: tile.revealed ? tile.color : 'unknown',
  }));

  const candidatePool = new Map<number, number>();
  for (let v = 1; v <= 12; v++) {
    const rem = blueCopiesRemainingInOpponent(state, opponent, v);
    if (rem > 0) candidatePool.set(v, rem);
  }

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    if (pos.knownValue !== null) {
      pos.candidateValues.set(pos.knownValue, 1);
      continue;
    }

    let lowerBound = 1;
    let upperBound = 12;
    for (let j = i - 1; j >= 0; j--) {
      if (positions[j].knownValue !== null) {
        lowerBound = Math.max(lowerBound, Math.ceil(positions[j].knownValue!));
        break;
      }
    }
    for (let j = i + 1; j < positions.length; j++) {
      if (positions[j].knownValue !== null) {
        upperBound = Math.min(upperBound, Math.floor(positions[j].knownValue!));
        break;
      }
    }

    let total = 0;
    for (let v = lowerBound; v <= upperBound; v++) {
      const rem = candidatePool.get(v) ?? 0;
      if (rem > 0) {
        pos.candidateValues.set(v, rem);
        total += rem;
      }
    }
    if (total > 0) {
      for (const [v, c] of pos.candidateValues.entries()) {
        pos.candidateValues.set(v, c / total);
      }
    }
  }

  return { side: opponent, positions };
}

export function probabilityOfMatch(belief: OpponentBelief, tileId: string, declaredValue: number): number {
  const pos = belief.positions.find(p => p.tileId === tileId);
  if (!pos) return 0;
  if (pos.knownValue !== null) return pos.knownValue === declaredValue ? 1 : 0;
  return pos.candidateValues.get(declaredValue) ?? 0;
}

export function bestGuessCandidates(
  state: GameState,
  side: PlayerSide
): Array<{ tileId: string; declaredValue: number; probability: number; tile: Tile }> {
  const belief = buildBelief(state, side);
  const ownRack = getRack(state, side);
  const heldValues = new Set(ownRack.tiles.filter(t => !t.cut).map(t => t.value));
  const oppRack = getRack(state, getOpponent(side));

  const candidates: Array<{ tileId: string; declaredValue: number; probability: number; tile: Tile }> = [];
  for (const pos of belief.positions) {
    const tile = oppRack.tiles.find(t => t.id === pos.tileId);
    if (!tile) continue;
    for (const value of heldValues) {
      const prob = probabilityOfMatch(belief, pos.tileId, value);
      if (prob > 0) {
        candidates.push({ tileId: pos.tileId, declaredValue: value, probability: prob, tile });
      }
    }
  }
  candidates.sort((a, b) => b.probability - a.probability);
  return candidates;
}

export function expectedValueOfGuess(
  successProbability: number,
  detonatorRemaining: number,
  redWiresInPlay: number,
  unknownTilesRemaining: number
): number {
  const redRisk = unknownTilesRemaining > 0 ? redWiresInPlay / unknownTilesRemaining : 0;
  const failureCost = 1 + redRisk * 100;
  const detonatorWeight = detonatorRemaining <= 1 ? 5 : detonatorRemaining <= 2 ? 2 : 1;
  return successProbability * 1 - (1 - successProbability) * failureCost * detonatorWeight;
}
