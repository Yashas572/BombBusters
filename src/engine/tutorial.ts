import type { GameState, Tile, WireColor } from './types';

const TUTORIAL_MISSION_ID = 9999;
let tutorialCounter = 0;
const tutorialTileId = (): string => `tut-${++tutorialCounter}`;

function makeTutorialTile(value: number, color: WireColor = 'blue'): Tile {
  return {
    id: tutorialTileId(),
    value,
    color,
    revealed: false,
    cut: false,
  };
}

export function createTutorialState(): GameState {
  tutorialCounter = 0;

  const playerTiles = [1, 1, 3, 5, 7, 9].map(v => makeTutorialTile(v));
  const aiTiles = [2, 3, 4, 6, 8, 10].map(v => makeTutorialTile(v));

  const playerInfoTile = playerTiles[4];
  const aiInfoTile = aiTiles[4];
  playerInfoTile.revealed = true;
  aiInfoTile.revealed = true;

  return {
    playerRack: { owner: 'player', tiles: playerTiles },
    aiRack: { owner: 'ai', tiles: aiTiles },
    detonationTracker: { current: 5, max: 5 },
    cutHistory: [],
    revealedInfo: [
      {
        tileId: playerInfoTile.id,
        rack: 'player',
        position: 4,
        value: playerInfoTile.value,
        source: 'info_token',
      },
      {
        tileId: aiInfoTile.id,
        rack: 'ai',
        position: 4,
        value: aiInfoTile.value,
        source: 'info_token',
      },
    ],
    equipment: [],
    characterCards: [],
    currentTurn: 'player',
    turnCounter: 0,
    phase: 'playing',
    outcome: null,
    playerScore: 0,
    aiScore: 0,
    missionId: TUTORIAL_MISSION_ID,
    difficulty: 'easy',
    freezeActive: false,
    pendingSoloCutForPlayer: false,
    pendingSoloCutForAi: false,
  };
}

export const TUTORIAL_MISSION_NAME = 'Tutorial';
export { TUTORIAL_MISSION_ID };
