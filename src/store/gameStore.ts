import { create } from 'zustand';
import { createInitialState } from '../engine/deck';
import { applyAction, startGame } from '../engine/gameState';
import { planAiTurn } from '../engine/ai/aiOpponent';
import { createTutorialState } from '../engine/tutorial';
import type { GameAction, GameEvent, GameState, MissionConfig, Difficulty } from '../engine/types';

type Screen = 'menu' | 'missionSelect' | 'game' | 'gameOver' | 'settings';

interface GameStore {
  screen: Screen;
  gameState: GameState | null;
  lastEvents: GameEvent[];
  highlightedTileIds: string[];
  aiThinking: boolean;
  selectedTargetId: string | null;
  selectedDeclaredValue: number | null;
  tutorialMode: boolean;
  tutorialStep: number;

  setScreen: (s: Screen) => void;
  startMission: (mission: MissionConfig, difficulty: Difficulty) => void;
  startTutorial: () => void;
  advanceTutorialStep: () => void;
  exitTutorial: () => void;
  placeStartingInfoToken: (tileId: string) => void;
  selectTarget: (tileId: string | null) => void;
  selectDeclaredValue: (value: number | null) => void;
  submitGuess: () => void;
  submitSoloCut: (tileIds: [string, string]) => void;
  useEquipment: (action: GameAction) => void;
  runAiTurn: () => Promise<void>;
  highlightTiles: (ids: string[]) => void;
  clearHighlights: () => void;
  exitToMenu: () => void;
}

function dispatch(state: GameStore, action: GameAction): Partial<GameStore> | null {
  if (!state.gameState) return null;
  try {
    const result = applyAction(state.gameState, action);
    let nextState = result.state;

    // Tutorial mode: keep the turn on the player so the AI doesn't take over the lesson.
    if (state.tutorialMode && nextState.phase === 'playing' && nextState.currentTurn === 'ai') {
      nextState = { ...nextState, currentTurn: 'player' };
    }

    return {
      gameState: nextState,
      lastEvents: result.events,
      selectedTargetId: null,
      selectedDeclaredValue: null,
      screen: nextState.phase === 'gameover' ? 'gameOver' : state.screen,
    };
  } catch (err) {
    console.warn('Action rejected:', err);
    return null;
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'menu',
  gameState: null,
  lastEvents: [],
  highlightedTileIds: [],
  aiThinking: false,
  selectedTargetId: null,
  selectedDeclaredValue: null,
  tutorialMode: false,
  tutorialStep: 0,

  setScreen: s => set({ screen: s }),

  startTutorial: () => {
    set({
      gameState: createTutorialState(),
      screen: 'game',
      lastEvents: [],
      selectedTargetId: null,
      selectedDeclaredValue: null,
      tutorialMode: true,
      tutorialStep: 0,
    });
  },

  advanceTutorialStep: () => set(s => ({ tutorialStep: s.tutorialStep + 1 })),

  exitTutorial: () => set({ tutorialMode: false, tutorialStep: 0, gameState: null, screen: 'menu' }),

  startMission: (mission, difficulty) => {
    const initial = createInitialState(mission, difficulty);
    const playerFirst = initial.playerRack.tiles[Math.floor(initial.playerRack.tiles.length / 2)];
    const aiFirst = initial.aiRack.tiles[Math.floor(initial.aiRack.tiles.length / 2)];
    let s = applyAction(initial, {
      type: 'PLACE_STARTING_INFO_TOKEN',
      actor: 'player',
      tileId: playerFirst.id,
    }).state;
    s = applyAction(s, {
      type: 'PLACE_STARTING_INFO_TOKEN',
      actor: 'ai',
      tileId: aiFirst.id,
    }).state;
    set({ gameState: startGame(s), screen: 'game', lastEvents: [], selectedTargetId: null });
  },

  placeStartingInfoToken: tileId => {
    const update = dispatch(get(), { type: 'PLACE_STARTING_INFO_TOKEN', actor: 'player', tileId });
    if (update) set(update);
  },

  selectTarget: tileId => set({ selectedTargetId: tileId }),
  selectDeclaredValue: value => set({ selectedDeclaredValue: value }),

  submitGuess: () => {
    const { selectedTargetId, selectedDeclaredValue, gameState } = get();
    if (!gameState || !selectedTargetId || selectedDeclaredValue === null) return;
    const update = dispatch(get(), {
      type: 'GUESS_WIRE',
      actor: 'player',
      targetTileId: selectedTargetId,
      declaredValue: selectedDeclaredValue,
    });
    if (update) set(update);
  },

  submitSoloCut: tileIds => {
    const update = dispatch(get(), { type: 'SOLO_CUT', actor: 'player', tileIds });
    if (update) set(update);
  },

  useEquipment: action => {
    const update = dispatch(get(), action);
    if (update) set(update);
  },

  runAiTurn: async () => {
    const { gameState, tutorialMode } = get();
    if (tutorialMode) return;
    if (!gameState || gameState.phase !== 'playing' || gameState.currentTurn !== 'ai') return;

    set({ aiThinking: true });
    await new Promise(resolve => setTimeout(resolve, 300));

    const current = get().gameState;
    if (!current || current.phase !== 'playing' || current.currentTurn !== 'ai') {
      set({ aiThinking: false });
      return;
    }

    const plan = planAiTurn(current, current.difficulty);
    try {
      const result = applyAction(current, plan.action);
      set({
        gameState: result.state,
        lastEvents: result.events,
        aiThinking: false,
        screen: result.state.phase === 'gameover' ? 'gameOver' : get().screen,
      });
    } catch (err) {
      console.error('AI action failed:', err);
      set({ aiThinking: false });
    }
  },

  highlightTiles: ids => set({ highlightedTileIds: ids }),
  clearHighlights: () => set({ highlightedTileIds: [] }),

  exitToMenu: () => set({ screen: 'menu', gameState: null, lastEvents: [], tutorialMode: false, tutorialStep: 0 }),
}));
