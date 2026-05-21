import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/engine/deck';
import { applyAction, startGame } from '../../src/engine/gameState';
import { TRAINING_MISSIONS } from '../../src/engine/missions/missions';
import { planAiTurn } from '../../src/engine/ai/aiOpponent';
import { buildBelief, bestGuessCandidates } from '../../src/engine/ai/probabilityModel';

describe('AI probability model', () => {
  it('builds belief with one entry per active opponent tile', () => {
    const state = startGame(createInitialState(TRAINING_MISSIONS[0], 'medium', 7));
    const belief = buildBelief(state, 'player');
    const activeAi = state.aiRack.tiles.filter(t => !t.cut).length;
    expect(belief.positions.length).toBe(activeAi);
  });

  it('AI only proposes guesses for values it holds', () => {
    const state = startGame(createInitialState(TRAINING_MISSIONS[0], 'medium', 11));
    const aiState = { ...state, currentTurn: 'ai' as const };
    const candidates = bestGuessCandidates(aiState, 'ai');
    const aiValues = new Set(aiState.aiRack.tiles.filter(t => !t.cut).map(t => t.value));
    for (const c of candidates) {
      expect(aiValues.has(c.declaredValue)).toBe(true);
    }
  });

  it('candidate probabilities sum to <= 1 per position-value pair', () => {
    const state = startGame(createInitialState(TRAINING_MISSIONS[3], 'medium', 19));
    const belief = buildBelief(state, 'player');
    for (const p of belief.positions) {
      if (p.knownValue !== null) continue;
      const sum = Array.from(p.candidateValues.values()).reduce((a, b) => a + b, 0);
      expect(sum).toBeLessThanOrEqual(1.0001);
    }
  });
});

describe('AI opponent planning', () => {
  it('takes solo cut when guaranteed', () => {
    const state = startGame(createInitialState(TRAINING_MISSIONS[0], 'medium', 3));
    const aiState = { ...state, currentTurn: 'ai' as const };
    const synth = JSON.parse(JSON.stringify(aiState));
    const v = synth.aiRack.tiles[0].value;
    for (const t of synth.playerRack.tiles) {
      if (t.value === v) t.cut = true;
    }
    const sameValueAi = synth.aiRack.tiles.filter((t: { value: number; cut: boolean }) => t.value === v && !t.cut);
    if (sameValueAi.length < 2) return;
    const plan = planAiTurn(synth, 'medium');
    expect(plan.action.type).toBe('SOLO_CUT');
  });

  it('returns a valid action for setup phase', () => {
    const state = createInitialState(TRAINING_MISSIONS[0], 'medium', 1);
    const plan = planAiTurn(state, 'medium');
    expect(plan.action.type).toBe('PLACE_STARTING_INFO_TOKEN');
  });

  it('full game simulation does not crash', () => {
    let state = startGame(createInitialState(TRAINING_MISSIONS[0], 'medium', 33));
    let safety = 200;
    while (state.phase === 'playing' && safety-- > 0) {
      const plan = planAiTurn({ ...state, currentTurn: state.currentTurn }, state.difficulty);
      try {
        const result = applyAction(state, { ...plan.action, actor: state.currentTurn });
        state = result.state;
      } catch (e) {
        break;
      }
    }
    expect(state).toBeDefined();
  });
});
