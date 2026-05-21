import type {
  ActionResult,
  GameAction,
  GameEvent,
  GamePhase,
  GameState,
  PlayerSide,
  Tile,
} from './types';
import {
  allNonRedCut,
  copiesByValueInRack,
  findTile,
  getOpponent,
  getRack,
  hasGuaranteedSoloCut,
  isWireFullyCut,
  validateGuess,
  validateSoloCut,
} from './rules';

function cloneState(state: GameState): GameState {
  return {
    ...state,
    playerRack: { owner: state.playerRack.owner, tiles: state.playerRack.tiles.map(t => ({ ...t })) },
    aiRack: { owner: state.aiRack.owner, tiles: state.aiRack.tiles.map(t => ({ ...t })) },
    detonationTracker: { ...state.detonationTracker },
    cutHistory: [...state.cutHistory],
    revealedInfo: [...state.revealedInfo],
    equipment: state.equipment.map(e => ({ ...e })),
    characterCards: state.characterCards.map(c => ({ ...c })),
  };
}

function markTileCut(state: GameState, tileId: string): void {
  const found = findTile(state, tileId);
  if (!found) return;
  const rack = found.rack === 'player' ? state.playerRack : state.aiRack;
  const tile = rack.tiles.find(t => t.id === tileId);
  if (tile) {
    tile.cut = true;
    tile.revealed = true;
  }
}

function tilePosition(state: GameState, tileId: string): number {
  const found = findTile(state, tileId);
  if (!found) return -1;
  const rack = found.rack === 'player' ? state.playerRack : state.aiRack;
  return rack.tiles.filter(t => !t.cut || t.id === tileId).findIndex(t => t.id === tileId);
}

function recordInfoToken(state: GameState, tileId: string, source: 'info_token' | 'wrong_guess' | 'scanner'): void {
  const found = findTile(state, tileId);
  if (!found) return;
  if (state.revealedInfo.some(r => r.tileId === tileId)) return;
  state.revealedInfo.push({
    tileId,
    rack: found.rack,
    position: tilePosition(state, tileId),
    value: found.tile.value,
    source,
  });
}

function checkEquipmentUnlocks(state: GameState, events: GameEvent[]): void {
  for (const eq of state.equipment) {
    if (!eq.unlocked && isWireFullyCut(state, eq.unlockPair)) {
      eq.unlocked = true;
      events.push({ type: 'EQUIPMENT_UNLOCKED', name: eq.name });
    }
  }
}

function checkGameEnd(state: GameState, events: GameEvent[]): void {
  if (state.phase === 'gameover') return;
  if (state.detonationTracker.current <= 0) {
    state.phase = 'gameover';
    state.outcome = 'loss_detonation';
    events.push({ type: 'GAME_LOST_DETONATION' });
    return;
  }
  if (allNonRedCut(state)) {
    state.phase = 'gameover';
    if (state.playerScore > state.aiScore) state.outcome = 'win_player';
    else if (state.aiScore > state.playerScore) state.outcome = 'win_ai';
    else state.outcome = 'win_draw';
    events.push({ type: 'GAME_WON' });
  }
}

function applySoloCutPenaltyCheck(state: GameState, actor: PlayerSide, events: GameEvent[]): void {
  const flagKey = actor === 'player' ? 'pendingSoloCutForPlayer' : 'pendingSoloCutForAi';
  if (state[flagKey]) {
    if (actor === 'player') state.playerScore = Math.max(0, state.playerScore - 1);
    else state.aiScore = Math.max(0, state.aiScore - 1);
    events.push({ type: 'SCORE_PENALTY', actor, reason: 'missed_solo_cut' });
  }
}

function refreshSoloCutFlags(state: GameState): void {
  state.pendingSoloCutForPlayer = hasGuaranteedSoloCut(state, 'player') !== null;
  state.pendingSoloCutForAi = hasGuaranteedSoloCut(state, 'ai') !== null;
}

function endTurn(state: GameState): void {
  state.currentTurn = getOpponent(state.currentTurn);
  state.turnCounter += 1;
  refreshSoloCutFlags(state);
}

function awardCut(state: GameState, actor: PlayerSide): void {
  if (actor === 'player') state.playerScore += 1;
  else state.aiScore += 1;
}

function advanceDetonator(state: GameState, events: GameEvent[]): void {
  if (state.freezeActive) {
    state.freezeActive = false;
    return;
  }
  state.detonationTracker.current = Math.max(0, state.detonationTracker.current - 1);
  events.push({
    type: 'DETONATION_ADVANCED',
    current: state.detonationTracker.current,
    max: state.detonationTracker.max,
  });
}

function handleGuess(
  state: GameState,
  actor: PlayerSide,
  targetTileId: string,
  declaredValue: number,
  events: GameEvent[]
): void {
  const validation = validateGuess(state, actor, targetTileId, declaredValue);
  if (!validation.ok) throw new Error(`Invalid guess: ${validation.reason}`);

  const found = findTile(state, targetTileId);
  if (!found) throw new Error('Target tile not found');
  const targetTile = found.tile;

  if (targetTile.color === 'red') {
    targetTile.revealed = true;
    state.phase = 'gameover';
    state.outcome = 'loss_redwire';
    events.push({ type: 'RED_WIRE_TRIGGERED', actor });
    events.push({ type: 'GAME_LOST_REDWIRE' });
    return;
  }

  if (targetTile.value === declaredValue) {
    const ownRack = getRack(state, actor);
    const matchingOwn = ownRack.tiles.find(t => !t.cut && t.value === declaredValue);
    if (!matchingOwn) throw new Error('Validation succeeded but no matching tile in own rack');

    markTileCut(state, targetTile.id);
    markTileCut(state, matchingOwn.id);
    awardCut(state, actor);
    state.cutHistory.push({
      turn: state.turnCounter,
      actor,
      value: declaredValue,
      color: targetTile.color,
      method: 'guess',
    });
    events.push({ type: 'CUT_SUCCESS', actor, value: declaredValue, method: 'guess' });
    checkEquipmentUnlocks(state, events);
    return;
  }

  targetTile.revealed = true;
  recordInfoToken(state, targetTile.id, 'wrong_guess');
  events.push({ type: 'GUESS_WRONG', actor, revealedValue: targetTile.value, tileId: targetTile.id });
  advanceDetonator(state, events);
}

function handleSoloCut(
  state: GameState,
  actor: PlayerSide,
  tileIds: [string, string],
  events: GameEvent[]
): void {
  const v = validateSoloCut(state, actor, tileIds);
  if (!v.ok) throw new Error(`Invalid solo cut: ${v.reason}`);

  markTileCut(state, tileIds[0]);
  markTileCut(state, tileIds[1]);
  awardCut(state, actor);
  awardCut(state, actor);
  state.cutHistory.push({
    turn: state.turnCounter,
    actor,
    value: v.value,
    color: 'blue',
    method: 'solo',
  });
  events.push({ type: 'CUT_SUCCESS', actor, value: v.value, method: 'solo' });
  checkEquipmentUnlocks(state, events);
}

function handleDoubleDetector(
  state: GameState,
  actor: PlayerSide,
  targetTileIds: [string, string],
  declaredValue: number,
  events: GameEvent[]
): void {
  const card = state.equipment.find(e => e.name === 'double_detector');
  if (!card || !card.unlocked || card.used) throw new Error('Double Detector not available');

  card.used = true;

  let anyMatch = false;
  for (const id of targetTileIds) {
    const found = findTile(state, id);
    if (!found || found.tile.cut) continue;
    if (found.rack === actor) throw new Error('Cannot target your own tiles');
    if (found.tile.color === 'red') {
      found.tile.revealed = true;
      state.phase = 'gameover';
      state.outcome = 'loss_redwire';
      events.push({ type: 'RED_WIRE_TRIGGERED', actor });
      events.push({ type: 'GAME_LOST_REDWIRE' });
      return;
    }
    if (found.tile.value === declaredValue) {
      anyMatch = true;
      const ownMatch = getRack(state, actor).tiles.find(t => !t.cut && t.value === declaredValue);
      if (!ownMatch) continue;
      markTileCut(state, found.tile.id);
      markTileCut(state, ownMatch.id);
      awardCut(state, actor);
      state.cutHistory.push({
        turn: state.turnCounter,
        actor,
        value: declaredValue,
        color: found.tile.color,
        method: 'equipment',
      });
      events.push({ type: 'CUT_SUCCESS', actor, value: declaredValue, method: 'equipment' });
      break;
    }
  }

  if (!anyMatch) {
    for (const id of targetTileIds) {
      const found = findTile(state, id);
      if (found && !found.tile.cut) {
        found.tile.revealed = true;
        recordInfoToken(state, found.tile.id, 'wrong_guess');
      }
    }
    advanceDetonator(state, events);
  }

  checkEquipmentUnlocks(state, events);
}

function handleFreeze(state: GameState, events: GameEvent[]): void {
  const card = state.equipment.find(e => e.name === 'freeze');
  if (!card || !card.unlocked || card.used) throw new Error('Freeze not available');
  card.used = true;
  state.freezeActive = true;
  events.push({ type: 'CUT_SUCCESS', actor: state.currentTurn, value: -1, method: 'equipment' });
}

function handleScanner(
  state: GameState,
  actor: PlayerSide,
  targetTileId: string,
  events: GameEvent[]
): void {
  const card = state.equipment.find(e => e.name === 'scanner');
  if (!card || !card.unlocked || card.used) throw new Error('Scanner not available');
  const found = findTile(state, targetTileId);
  if (!found || found.tile.cut) throw new Error('Invalid scanner target');
  if (found.rack === actor) throw new Error('Cannot scan your own tile');
  card.used = true;
  found.tile.revealed = true;
  recordInfoToken(state, found.tile.id, 'scanner');
  events.push({ type: 'SCANNER_REVEALED', tileId: found.tile.id, value: found.tile.value });
}

export function applyAction(prev: GameState, action: GameAction): ActionResult {
  if (prev.phase === 'gameover') {
    return { state: prev, events: [] };
  }

  const state = cloneState(prev);
  const events: GameEvent[] = [];

  if (action.type === 'PLACE_STARTING_INFO_TOKEN') {
    if (state.phase !== 'setup') throw new Error('Info tokens are placed in setup phase only');
    const found = findTile(state, action.tileId);
    if (!found) throw new Error('Tile not found');
    if (found.rack !== action.actor) throw new Error('Must place info token on your own tile');
    found.tile.revealed = true;
    recordInfoToken(state, action.tileId, 'info_token');

    const playerHasToken = state.revealedInfo.some(r => r.rack === 'player' && r.source === 'info_token');
    const aiHasToken = state.revealedInfo.some(r => r.rack === 'ai' && r.source === 'info_token');
    if (playerHasToken && aiHasToken) {
      state.phase = 'playing';
      refreshSoloCutFlags(state);
    }
    return { state, events };
  }

  if (state.phase !== 'playing') throw new Error('Game not yet in playing phase');

  const isCurrentTurn = action.actor === state.currentTurn;

  switch (action.type) {
    case 'GUESS_WIRE':
      applySoloCutPenaltyCheck(state, action.actor, events);
      handleGuess(state, action.actor, action.targetTileId, action.declaredValue, events);
      break;
    case 'SOLO_CUT':
      handleSoloCut(state, action.actor, action.tileIds, events);
      break;
    case 'USE_EQUIPMENT_DOUBLE_DETECTOR':
      applySoloCutPenaltyCheck(state, action.actor, events);
      handleDoubleDetector(state, action.actor, action.targetTileIds, action.declaredValue, events);
      break;
    case 'USE_EQUIPMENT_FREEZE':
      handleFreeze(state, events);
      break;
    case 'USE_EQUIPMENT_SCANNER':
      applySoloCutPenaltyCheck(state, action.actor, events);
      handleScanner(state, action.actor, action.targetTileId, events);
      break;
  }

  checkGameEnd(state, events);
  if ((state.phase as GamePhase) !== 'gameover' && isCurrentTurn) {
    endTurn(state);
  }

  return { state, events };
}

export function startGame(state: GameState): GameState {
  if (state.phase !== 'setup') return state;
  const result = cloneState(state);
  result.phase = 'playing';
  refreshSoloCutFlags(result);
  return result;
}

export function getActiveTiles(state: GameState, side: PlayerSide): Tile[] {
  return getRack(state, side).tiles.filter(t => !t.cut);
}

export function visibleAiRack(state: GameState): Array<{ tile: Tile; isRevealed: boolean; position: number }> {
  return state.aiRack.tiles
    .filter(t => !t.cut)
    .map((tile, position) => ({ tile, isRevealed: tile.revealed, position }));
}

export function copiesRemainingByValue(state: GameState): Map<number, number> {
  const map = new Map<number, number>();
  for (const t of state.playerRack.tiles) {
    if (!t.cut && t.color === 'blue') map.set(t.value, (map.get(t.value) ?? 0) + 1);
  }
  for (const t of state.aiRack.tiles) {
    if (!t.cut && t.color === 'blue') map.set(t.value, (map.get(t.value) ?? 0) + 1);
  }
  return map;
}

export { copiesByValueInRack };
