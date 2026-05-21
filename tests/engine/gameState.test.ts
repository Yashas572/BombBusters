import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/engine/deck';
import { applyAction, startGame } from '../../src/engine/gameState';
import { TRAINING_MISSIONS } from '../../src/engine/missions/missions';
import type { GameState } from '../../src/engine/types';

function build(missionIdx = 0, seed = 1): GameState {
  return startGame(createInitialState(TRAINING_MISSIONS[missionIdx], 'medium', seed));
}

describe('gameState: turn alternation', () => {
  it('alternates turns after a player action', () => {
    const state = build();
    const playerValues = new Set(state.playerRack.tiles.map(t => t.value));
    const target = state.aiRack.tiles.find(t => playerValues.has(t.value) && t.color !== 'red');
    if (!target) return;

    const { state: next } = applyAction(state, {
      type: 'GUESS_WIRE',
      actor: 'player',
      targetTileId: target.id,
      declaredValue: target.value,
    });
    expect(next.currentTurn).toBe('ai');
  });

  it('does not advance turn after gameover', () => {
    const state = build(6);
    const redTile = state.aiRack.tiles.find(t => t.color === 'red');
    if (!redTile) return;
    const heldValue = state.playerRack.tiles[0].value;
    const { state: next } = applyAction(state, {
      type: 'GUESS_WIRE',
      actor: 'player',
      targetTileId: redTile.id,
      declaredValue: heldValue,
    });
    expect(next.phase).toBe('gameover');
    expect(next.currentTurn).toBe('player');
  });
});

describe('gameState: detonation', () => {
  it('triggers loss_detonation when tracker hits zero', () => {
    const mission = { ...TRAINING_MISSIONS[1], detonationLimit: 1 };
    let state = startGame(createInitialState(mission, 'medium', 5));
    const playerValues = state.playerRack.tiles.map(t => t.value);
    const heldValue = playerValues[0];
    const aiTarget = state.aiRack.tiles.find(t => t.value !== heldValue && t.color !== 'red');
    if (!aiTarget) return;

    const { state: next, events } = applyAction(state, {
      type: 'GUESS_WIRE',
      actor: 'player',
      targetTileId: aiTarget.id,
      declaredValue: heldValue,
    });
    expect(next.phase).toBe('gameover');
    expect(next.outcome).toBe('loss_detonation');
    expect(events.some(e => e.type === 'GAME_LOST_DETONATION')).toBe(true);
  });
});

describe('gameState: state immutability', () => {
  it('does not mutate the previous state', () => {
    const state = build();
    const before = JSON.stringify(state);
    const playerValues = new Set(state.playerRack.tiles.map(t => t.value));
    const target = state.aiRack.tiles.find(t => playerValues.has(t.value));
    if (!target) return;
    applyAction(state, {
      type: 'GUESS_WIRE',
      actor: 'player',
      targetTileId: target.id,
      declaredValue: target.value,
    });
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('gameState: setup phase info tokens', () => {
  it('starts in setup phase requiring info token placement', () => {
    const state = createInitialState(TRAINING_MISSIONS[0], 'medium', 1);
    expect(state.phase).toBe('setup');
  });

  it('transitions to playing after both info tokens placed', () => {
    const state = createInitialState(TRAINING_MISSIONS[0], 'medium', 1);
    const pTile = state.playerRack.tiles[0];
    const aTile = state.aiRack.tiles[0];
    const { state: s1 } = applyAction(state, {
      type: 'PLACE_STARTING_INFO_TOKEN',
      actor: 'player',
      tileId: pTile.id,
    });
    const { state: s2 } = applyAction(s1, {
      type: 'PLACE_STARTING_INFO_TOKEN',
      actor: 'ai',
      tileId: aTile.id,
    });
    expect(s2.phase).toBe('playing');
    expect(s2.revealedInfo.length).toBe(2);
  });
});
