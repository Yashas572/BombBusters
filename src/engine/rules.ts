import type { GameState, PlayerSide, Rack, Tile } from './types';

export function getRack(state: GameState, side: PlayerSide): Rack {
  return side === 'player' ? state.playerRack : state.aiRack;
}

export function getOpponent(side: PlayerSide): PlayerSide {
  return side === 'player' ? 'ai' : 'player';
}

export function findTile(state: GameState, tileId: string): { tile: Tile; rack: PlayerSide } | null {
  const p = state.playerRack.tiles.find(t => t.id === tileId);
  if (p) return { tile: p, rack: 'player' };
  const a = state.aiRack.tiles.find(t => t.id === tileId);
  if (a) return { tile: a, rack: 'ai' };
  return null;
}

export function activeTiles(rack: Rack): Tile[] {
  return rack.tiles.filter(t => !t.cut);
}

export function holdsValue(rack: Rack, value: number): boolean {
  return rack.tiles.some(t => !t.cut && t.value === value);
}

export function countCopiesInPlay(state: GameState, value: number): number {
  let count = 0;
  for (const t of state.playerRack.tiles) if (!t.cut && t.value === value) count++;
  for (const t of state.aiRack.tiles) if (!t.cut && t.value === value) count++;
  return count;
}

export function copiesByValueInRack(rack: Rack, value: number): Tile[] {
  return rack.tiles.filter(t => !t.cut && t.value === value);
}

export function hasGuaranteedSoloCut(state: GameState, side: PlayerSide): { value: number; tiles: [Tile, Tile] } | null {
  const ownRack = getRack(state, side);
  const oppRack = getRack(state, getOpponent(side));

  const byValue = new Map<number, Tile[]>();
  for (const t of ownRack.tiles) {
    if (t.cut) continue;
    const list = byValue.get(t.value) ?? [];
    list.push(t);
    byValue.set(t.value, list);
  }

  for (const [value, tiles] of byValue.entries()) {
    if (tiles.length < 2) continue;
    const oppCopies = oppRack.tiles.filter(t => !t.cut && t.value === value).length;
    if (oppCopies === 0) {
      return { value, tiles: [tiles[0], tiles[1]] };
    }
  }
  return null;
}

export function isWireFullyCut(state: GameState, value: number): boolean {
  return countCopiesInPlay(state, value) === 0;
}

export function allNonRedCut(state: GameState): boolean {
  const remaining = [
    ...state.playerRack.tiles,
    ...state.aiRack.tiles,
  ].filter(t => !t.cut && t.color !== 'red');
  return remaining.length === 0;
}

export function validateGuess(
  state: GameState,
  actor: PlayerSide,
  targetTileId: string,
  declaredValue: number
): { ok: true } | { ok: false; reason: string } {
  if (state.phase !== 'playing') return { ok: false, reason: 'Game not in playing phase' };
  if (state.currentTurn !== actor) return { ok: false, reason: 'Not your turn' };

  const found = findTile(state, targetTileId);
  if (!found) return { ok: false, reason: 'Tile not found' };
  if (found.rack === actor) return { ok: false, reason: 'Cannot guess your own tile' };
  if (found.tile.cut) return { ok: false, reason: 'Tile already cut' };

  const ownRack = getRack(state, actor);
  if (!holdsValue(ownRack, declaredValue)) {
    return { ok: false, reason: 'You must hold the declared value to guess it' };
  }
  return { ok: true };
}

export function validateSoloCut(
  state: GameState,
  actor: PlayerSide,
  tileIds: [string, string]
): { ok: true; value: number } | { ok: false; reason: string } {
  if (state.phase !== 'playing') return { ok: false, reason: 'Game not in playing phase' };
  if (state.currentTurn !== actor) return { ok: false, reason: 'Not your turn' };

  const ownRack = getRack(state, actor);
  const opp = getRack(state, getOpponent(actor));

  const t1 = ownRack.tiles.find(t => t.id === tileIds[0] && !t.cut);
  const t2 = ownRack.tiles.find(t => t.id === tileIds[1] && !t.cut);
  if (!t1 || !t2) return { ok: false, reason: 'Tiles must be active and in your own rack' };
  if (t1.id === t2.id) return { ok: false, reason: 'Must select two different tiles' };
  if (t1.value !== t2.value) return { ok: false, reason: 'Solo cut requires same-value tiles' };

  const oppRemaining = opp.tiles.filter(t => !t.cut && t.value === t1.value).length;
  if (oppRemaining > 0) return { ok: false, reason: 'Opponent still holds copies of this value' };
  return { ok: true, value: t1.value };
}
