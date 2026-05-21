import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/engine/deck';
import { applyAction, startGame } from '../../src/engine/gameState';
import { TRAINING_MISSIONS } from '../../src/engine/missions/missions';
import { hasGuaranteedSoloCut, holdsValue } from '../../src/engine/rules';
import type { GameState } from '../../src/engine/types';

function setupGame(missionIdx = 0, seed = 42): GameState {
  return startGame(createInitialState(TRAINING_MISSIONS[missionIdx], 'medium', seed));
}

describe('rules: guess validation', () => {
  it('rejects guesses for values not held by guesser', () => {
    const state = setupGame();
    const aiTile = state.aiRack.tiles[0];
    const playerValues = new Set(state.playerRack.tiles.map(t => t.value));
    const unheldValue = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find(v => !playerValues.has(v));
    if (unheldValue === undefined) return;

    expect(() =>
      applyAction(state, {
        type: 'GUESS_WIRE',
        actor: 'player',
        targetTileId: aiTile.id,
        declaredValue: unheldValue,
      })
    ).toThrow();
  });

  it('rejects guesses against your own rack', () => {
    const state = setupGame();
    const myTile = state.playerRack.tiles[0];
    expect(() =>
      applyAction(state, {
        type: 'GUESS_WIRE',
        actor: 'player',
        targetTileId: myTile.id,
        declaredValue: myTile.value,
      })
    ).toThrow();
  });

  it('rejects actions when not your turn', () => {
    const state = setupGame();
    const playerTile = state.playerRack.tiles[0];
    expect(() =>
      applyAction(state, {
        type: 'GUESS_WIRE',
        actor: 'ai',
        targetTileId: playerTile.id,
        declaredValue: playerTile.value,
      })
    ).toThrow();
  });
});

describe('rules: correct guess', () => {
  it('cuts both tiles and scores 1 point on success', () => {
    const state = setupGame();
    const playerValues = new Set(state.playerRack.tiles.map(t => t.value));
    const aiTarget = state.aiRack.tiles.find(t => playerValues.has(t.value) && t.color !== 'red');
    if (!aiTarget) return;

    const { state: next } = applyAction(state, {
      type: 'GUESS_WIRE',
      actor: 'player',
      targetTileId: aiTarget.id,
      declaredValue: aiTarget.value,
    });

    const cutAiTile = next.aiRack.tiles.find(t => t.id === aiTarget.id);
    expect(cutAiTile?.cut).toBe(true);
    expect(next.playerScore).toBe(1);
    expect(next.detonationTracker.current).toBe(state.detonationTracker.current);
  });

  it('advances detonation on wrong guess and reveals true value', () => {
    const state = setupGame();
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

    expect(next.detonationTracker.current).toBe(state.detonationTracker.current - 1);
    const revealedTile = next.aiRack.tiles.find(t => t.id === aiTarget.id);
    expect(revealedTile?.revealed).toBe(true);
    expect(revealedTile?.cut).toBe(false);
    expect(events.some(e => e.type === 'GUESS_WRONG')).toBe(true);
  });
});

describe('rules: red wire instant loss', () => {
  it('triggers loss_redwire when guessing a red tile', () => {
    const state = setupGame(6);
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
    expect(next.outcome).toBe('loss_redwire');
  });
});

describe('rules: solo cut', () => {
  it('detects solo cut when opponent holds no copies', () => {
    const state = setupGame();
    const synth: GameState = JSON.parse(JSON.stringify(state));
    const v = synth.playerRack.tiles[0].value;
    for (const t of synth.aiRack.tiles) {
      if (t.value === v) t.cut = true;
    }
    const sameValueOwn = synth.playerRack.tiles.filter(t => t.value === v && !t.cut);
    if (sameValueOwn.length < 2) return;

    const guard = hasGuaranteedSoloCut(synth, 'player');
    expect(guard?.value).toBe(v);
  });

  it('returns null when opponent still has copies', () => {
    const state = setupGame();
    const someValue = state.playerRack.tiles[0].value;
    const oppHas = state.aiRack.tiles.some(t => t.value === someValue && !t.cut);
    if (!oppHas) return;
    const guard = hasGuaranteedSoloCut(state, 'player');
    if (guard) {
      expect(guard.value).not.toBe(someValue);
    } else {
      expect(guard).toBeNull();
    }
  });
});

describe('rules: holdsValue helper', () => {
  it('detects values present in rack', () => {
    const state = setupGame();
    const v = state.playerRack.tiles[0].value;
    expect(holdsValue(state.playerRack, v)).toBe(true);
  });

  it('returns false for absent values', () => {
    const state = setupGame();
    const valuesPresent = new Set(state.playerRack.tiles.map(t => t.value));
    const missing = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find(v => !valuesPresent.has(v));
    if (missing === undefined) return;
    expect(holdsValue(state.playerRack, missing)).toBe(false);
  });
});
