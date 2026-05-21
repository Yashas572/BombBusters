import { describe, it, expect } from 'vitest';
import { buildBluePool, createInitialState, dealMission, sortAscending } from '../../src/engine/deck';
import { TRAINING_MISSIONS } from '../../src/engine/missions/missions';

describe('deck', () => {
  it('generates exactly 48 blue tiles (4 copies of 1-12)', () => {
    const pool = buildBluePool();
    expect(pool).toHaveLength(48);
    for (let v = 1; v <= 12; v++) {
      expect(pool.filter(t => t.value === v)).toHaveLength(4);
    }
    expect(pool.every(t => t.color === 'blue')).toBe(true);
  });

  it('deals mission with correct tile counts per player', () => {
    const m = TRAINING_MISSIONS[0];
    const { playerTiles, aiTiles } = dealMission(m, 42);
    expect(playerTiles).toHaveLength(m.tilesPerPlayer);
    expect(aiTiles).toHaveLength(m.tilesPerPlayer);
  });

  it('produces sorted racks', () => {
    const m = TRAINING_MISSIONS[3];
    const { playerTiles, aiTiles } = dealMission(m, 99);
    for (let i = 1; i < playerTiles.length; i++) {
      expect(playerTiles[i].value).toBeGreaterThanOrEqual(playerTiles[i - 1].value);
    }
    for (let i = 1; i < aiTiles.length; i++) {
      expect(aiTiles[i].value).toBeGreaterThanOrEqual(aiTiles[i - 1].value);
    }
  });

  it('sortAscending is stable', () => {
    const m = TRAINING_MISSIONS[2];
    const { playerTiles } = dealMission(m, 7);
    const reSorted = sortAscending(playerTiles);
    expect(reSorted.map(t => t.value)).toEqual(playerTiles.map(t => t.value));
  });

  it('includes yellow and red tiles per mission config', () => {
    const m = TRAINING_MISSIONS[6];
    const { playerTiles, aiTiles } = dealMission(m, 123);
    const all = [...playerTiles, ...aiTiles];
    expect(all.filter(t => t.color === 'yellow').length).toBe(m.yellowTileCount * 2);
    expect(all.filter(t => t.color === 'red').length).toBe(m.redTileCount * 2);
  });

  it('createInitialState produces setup phase with correct mission config', () => {
    const m = TRAINING_MISSIONS[0];
    const state = createInitialState(m, 'medium', 1);
    expect(state.phase).toBe('setup');
    expect(state.detonationTracker.current).toBe(m.detonationLimit);
    expect(state.detonationTracker.max).toBe(m.detonationLimit);
    expect(state.playerScore).toBe(0);
    expect(state.aiScore).toBe(0);
    expect(state.missionId).toBe(m.id);
  });
});
