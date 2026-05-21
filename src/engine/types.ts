export type WireColor = 'blue' | 'yellow' | 'red';
export type PlayerSide = 'player' | 'ai';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GamePhase = 'setup' | 'playing' | 'gameover';
export type Outcome = 'win_player' | 'win_ai' | 'win_draw' | 'loss_detonation' | 'loss_redwire' | null;

export interface Tile {
  id: string;
  value: number;
  color: WireColor;
  revealed: boolean;
  cut: boolean;
}

export interface Rack {
  owner: PlayerSide;
  tiles: Tile[];
}

export interface RevealedInfo {
  tileId: string;
  rack: PlayerSide;
  position: number;
  value: number;
  source: 'info_token' | 'wrong_guess' | 'scanner';
}

export interface CutRecord {
  turn: number;
  actor: PlayerSide;
  value: number;
  color: WireColor;
  method: 'guess' | 'solo' | 'equipment';
}

export type EquipmentName = 'double_detector' | 'freeze' | 'scanner';

export interface EquipmentCard {
  name: EquipmentName;
  unlockPair: number;
  unlocked: boolean;
  used: boolean;
}

export interface CharacterCard {
  name: string;
  ability: string;
  used: boolean;
  owner: PlayerSide;
}

export interface MissionConfig {
  id: number;
  name: string;
  tier: 'training' | 'standard' | 'advanced' | 'expert';
  tilesPerPlayer: number;
  yellowTileCount: number;
  redTileCount: number;
  detonationLimit: number;
  equipmentPool: EquipmentName[];
  includeCharacterCards: boolean;
  specialRules?: string[];
}

export interface GameState {
  playerRack: Rack;
  aiRack: Rack;
  detonationTracker: { current: number; max: number };
  cutHistory: CutRecord[];
  revealedInfo: RevealedInfo[];
  equipment: EquipmentCard[];
  characterCards: CharacterCard[];
  currentTurn: PlayerSide;
  turnCounter: number;
  phase: GamePhase;
  outcome: Outcome;
  playerScore: number;
  aiScore: number;
  missionId: number;
  difficulty: Difficulty;
  freezeActive: boolean;
  pendingSoloCutForPlayer: boolean;
  pendingSoloCutForAi: boolean;
}

export type GameAction =
  | { type: 'GUESS_WIRE'; actor: PlayerSide; targetTileId: string; declaredValue: number }
  | { type: 'SOLO_CUT'; actor: PlayerSide; tileIds: [string, string] }
  | { type: 'USE_EQUIPMENT_DOUBLE_DETECTOR'; actor: PlayerSide; targetTileIds: [string, string]; declaredValue: number }
  | { type: 'USE_EQUIPMENT_FREEZE'; actor: PlayerSide }
  | { type: 'USE_EQUIPMENT_SCANNER'; actor: PlayerSide; targetTileId: string }
  | { type: 'PLACE_STARTING_INFO_TOKEN'; actor: PlayerSide; tileId: string };

export interface ActionResult {
  state: GameState;
  events: GameEvent[];
}

export type GameEvent =
  | { type: 'CUT_SUCCESS'; actor: PlayerSide; value: number; method: CutRecord['method'] }
  | { type: 'GUESS_WRONG'; actor: PlayerSide; revealedValue: number; tileId: string }
  | { type: 'DETONATION_ADVANCED'; current: number; max: number }
  | { type: 'RED_WIRE_TRIGGERED'; actor: PlayerSide }
  | { type: 'GAME_WON' }
  | { type: 'GAME_LOST_DETONATION' }
  | { type: 'GAME_LOST_REDWIRE' }
  | { type: 'EQUIPMENT_UNLOCKED'; name: EquipmentName }
  | { type: 'SCORE_PENALTY'; actor: PlayerSide; reason: 'missed_solo_cut' }
  | { type: 'SCANNER_REVEALED'; tileId: string; value: number };
