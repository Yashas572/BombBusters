import { describe, it } from 'vitest';
import { createInitialState } from '../../src/engine/deck';
import { applyAction, startGame } from '../../src/engine/gameState';
import { TRAINING_MISSIONS } from '../../src/engine/missions/missions';
import { planAiTurn } from '../../src/engine/ai/aiOpponent';
import type { Difficulty, GameAction, GameState } from '../../src/engine/types';

interface GameMetrics {
  outcome: string;
  turns: number;
  playerScore: number;
  aiScore: number;
  detonatorRemaining: number;
  aiGuesses: number;
  aiCorrect: number;
  aiSoloCuts: number;
  aiEquipmentUses: number;
  aiTargetPositions: number[];
  aiDeclaredValues: number[];
  aiCorrectProbWhenGuess: number[];
  firstMoveTarget: number | null;
  firstMoveValue: number | null;
}

function simulateGame(missionIdx: number, difficulty: Difficulty, seed: number): GameMetrics {
  let state = startGame(createInitialState(TRAINING_MISSIONS[missionIdx], difficulty, seed));

  const metrics: GameMetrics = {
    outcome: 'unknown',
    turns: 0,
    playerScore: 0,
    aiScore: 0,
    detonatorRemaining: 0,
    aiGuesses: 0,
    aiCorrect: 0,
    aiSoloCuts: 0,
    aiEquipmentUses: 0,
    aiTargetPositions: [],
    aiDeclaredValues: [],
    aiCorrectProbWhenGuess: [],
    firstMoveTarget: null,
    firstMoveValue: null,
  };

  let safety = 400;
  let aiTurnIndex = 0;

  while (state.phase === 'playing' && safety-- > 0) {
    let action: GameAction;
    if (state.currentTurn === 'ai') {
      const plan = planAiTurn(state, difficulty);
      action = plan.action;

      // Record AI behavior
      if (action.type === 'GUESS_WIRE') {
        metrics.aiGuesses += 1;
        const targetTile = state.aiRack.tiles
          .filter(t => !t.cut)
          .findIndex(t => t.id === action.targetTileId);
        const playerActiveTiles = state.playerRack.tiles.filter(t => !t.cut);
        const targetPos = playerActiveTiles.findIndex(t => t.id === action.targetTileId);
        if (targetPos !== -1) metrics.aiTargetPositions.push(targetPos);
        else if (targetTile !== -1) metrics.aiTargetPositions.push(targetTile);
        metrics.aiDeclaredValues.push(action.declaredValue);

        const actualTile = playerActiveTiles[targetPos];
        if (actualTile && actualTile.value === action.declaredValue) metrics.aiCorrect += 1;

        if (aiTurnIndex === 0) {
          metrics.firstMoveTarget = targetPos;
          metrics.firstMoveValue = action.declaredValue;
        }
        aiTurnIndex += 1;
      } else if (action.type === 'SOLO_CUT') {
        metrics.aiSoloCuts += 1;
      } else if (action.type.startsWith('USE_EQUIPMENT')) {
        metrics.aiEquipmentUses += 1;
      }
    } else {
      // Player plays greedy probability
      const playerCandidates = state.aiRack.tiles.filter(t => !t.cut);
      const playerValues = new Set(state.playerRack.tiles.filter(t => !t.cut).map(t => t.value));
      const target = playerCandidates[0];
      const value = playerCandidates.find(t => playerValues.has(t.value))?.value ?? [...playerValues][0];
      if (!target || value === undefined) break;
      action = {
        type: 'GUESS_WIRE',
        actor: 'player',
        targetTileId: target.id,
        declaredValue: value,
      };
    }

    try {
      const result = applyAction(state, action);
      state = result.state;
      metrics.turns += 1;
    } catch {
      break;
    }
  }

  metrics.outcome = state.outcome ?? 'unknown';
  metrics.playerScore = state.playerScore;
  metrics.aiScore = state.aiScore;
  metrics.detonatorRemaining = state.detonationTracker.current;
  return metrics;
}

function aggregate(games: GameMetrics[]) {
  const outcomes: Record<string, number> = {};
  let aiScoreSum = 0;
  let playerScoreSum = 0;
  let turnsSum = 0;
  let aiGuessSum = 0;
  let aiCorrectSum = 0;
  let aiSoloSum = 0;
  let aiEqSum = 0;
  const allPositions: number[] = [];
  const allValues: number[] = [];
  const firstTargets: number[] = [];
  const firstValues: number[] = [];

  for (const g of games) {
    outcomes[g.outcome] = (outcomes[g.outcome] ?? 0) + 1;
    aiScoreSum += g.aiScore;
    playerScoreSum += g.playerScore;
    turnsSum += g.turns;
    aiGuessSum += g.aiGuesses;
    aiCorrectSum += g.aiCorrect;
    aiSoloSum += g.aiSoloCuts;
    aiEqSum += g.aiEquipmentUses;
    allPositions.push(...g.aiTargetPositions);
    allValues.push(...g.aiDeclaredValues);
    if (g.firstMoveTarget !== null) firstTargets.push(g.firstMoveTarget);
    if (g.firstMoveValue !== null) firstValues.push(g.firstMoveValue);
  }

  const n = games.length;
  const posHistogram: Record<number, number> = {};
  for (const p of allPositions) posHistogram[p] = (posHistogram[p] ?? 0) + 1;
  const valHistogram: Record<number, number> = {};
  for (const v of allValues) valHistogram[v] = (valHistogram[v] ?? 0) + 1;
  const firstTargetHist: Record<number, number> = {};
  for (const p of firstTargets) firstTargetHist[p] = (firstTargetHist[p] ?? 0) + 1;
  const firstValueHist: Record<number, number> = {};
  for (const v of firstValues) firstValueHist[v] = (firstValueHist[v] ?? 0) + 1;

  return {
    n,
    outcomes,
    avgAiScore: aiScoreSum / n,
    avgPlayerScore: playerScoreSum / n,
    avgTurns: turnsSum / n,
    avgAiGuesses: aiGuessSum / n,
    avgAiCorrect: aiCorrectSum / n,
    avgSolo: aiSoloSum / n,
    avgEquipment: aiEqSum / n,
    aiAccuracy: aiGuessSum > 0 ? aiCorrectSum / aiGuessSum : 0,
    positionHistogram: posHistogram,
    valueHistogram: valHistogram,
    firstTargetHistogram: firstTargetHist,
    firstValueHistogram: firstValueHist,
  };
}

function formatHistogram(h: Record<number, number>, total: number): string {
  const entries = Object.entries(h)
    .map(([k, v]) => [Number(k), v] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  return entries
    .map(([k, v]) => `${String(k).padStart(2)}: ${String(v).padStart(4)} (${((v / total) * 100).toFixed(1).padStart(5)}%)`)
    .join('\n  ');
}

function reportDifficulty(label: string, missionIdx: number, difficulty: Difficulty, gameCount: number) {
  const games: GameMetrics[] = [];
  for (let seed = 0; seed < gameCount; seed++) {
    games.push(simulateGame(missionIdx, difficulty, seed * 7919 + 1));
  }
  const a = aggregate(games);
  const totalGuesses = Object.values(a.valueHistogram).reduce((x, y) => x + y, 0);
  const totalFirsts = Object.values(a.firstTargetHistogram).reduce((x, y) => x + y, 0);

  console.log(`\n=================================================================`);
  console.log(`MISSION ${TRAINING_MISSIONS[missionIdx].id} · ${difficulty.toUpperCase()} · ${gameCount} games (${label})`);
  console.log(`=================================================================`);
  console.log(`Outcomes: ${JSON.stringify(a.outcomes)}`);
  console.log(`Avg turns/game:      ${a.avgTurns.toFixed(2)}`);
  console.log(`Avg AI score:        ${a.avgAiScore.toFixed(2)}`);
  console.log(`Avg player score:    ${a.avgPlayerScore.toFixed(2)}`);
  console.log(`Avg AI guesses:      ${a.avgAiGuesses.toFixed(2)}`);
  console.log(`Avg AI correct:      ${a.avgAiCorrect.toFixed(2)}`);
  console.log(`AI accuracy:         ${(a.aiAccuracy * 100).toFixed(1)}%`);
  console.log(`Avg solo cuts/game:  ${a.avgSolo.toFixed(2)}`);
  console.log(`Avg equipment uses:  ${a.avgEquipment.toFixed(2)}`);
  console.log(`\nPosition targets (which slot in opponent rack the AI guesses, 0-indexed):`);
  console.log(`  ${formatHistogram(a.positionHistogram, totalGuesses)}`);
  console.log(`\nValue declared by AI:`);
  console.log(`  ${formatHistogram(a.valueHistogram, totalGuesses)}`);
  console.log(`\nFirst-move target position:`);
  console.log(`  ${formatHistogram(a.firstTargetHistogram, totalFirsts)}`);
  console.log(`\nFirst-move declared value:`);
  console.log(`  ${formatHistogram(a.firstValueHistogram, totalFirsts)}`);
}

describe('AI bias analysis (console output, not a real test)', () => {
  it('runs simulations and prints stats', () => {
    const N = 200;
    reportDifficulty('all-blue, no equipment', 0, 'easy', N);
    reportDifficulty('all-blue, no equipment', 0, 'medium', N);
    reportDifficulty('all-blue, no equipment', 0, 'hard', N);
    reportDifficulty('with equipment', 2, 'medium', N);
    reportDifficulty('yellow + red wires', 6, 'medium', N);
  });
});
