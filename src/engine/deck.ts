import type { EquipmentCard, GameState, MissionConfig, Tile, WireColor } from './types';
import type { Rng } from './rng';
import { createRng } from './rng';

const BLUE_MAX = 12;
const BLUE_COPIES = 4;

let tileIdCounter = 0;
const nextTileId = (): string => `t${++tileIdCounter}`;

function makeTile(value: number, color: WireColor): Tile {
  return { id: nextTileId(), value, color, revealed: false, cut: false };
}

export function buildBluePool(): Tile[] {
  const pool: Tile[] = [];
  for (let v = 1; v <= BLUE_MAX; v++) {
    for (let i = 0; i < BLUE_COPIES; i++) {
      pool.push(makeTile(v, 'blue'));
    }
  }
  return pool;
}

function pickDecimalValue(occupied: Set<number>, rng: Rng): number {
  for (let attempt = 0; attempt < 50; attempt++) {
    const intPart = rng.int(1, BLUE_MAX);
    const frac = rng.int(1, 10) / 10;
    const val = Number((intPart + frac).toFixed(1));
    if (!occupied.has(val)) {
      occupied.add(val);
      return val;
    }
  }
  return Number((BLUE_MAX + rng.next()).toFixed(1));
}

export function buildYellowPool(count: number, rng: Rng, occupied: Set<number>): Tile[] {
  const tiles: Tile[] = [];
  for (let i = 0; i < count; i++) {
    tiles.push(makeTile(pickDecimalValue(occupied, rng), 'yellow'));
  }
  return tiles;
}

export function buildRedPool(count: number, rng: Rng, occupied: Set<number>): Tile[] {
  const tiles: Tile[] = [];
  for (let i = 0; i < count; i++) {
    tiles.push(makeTile(pickDecimalValue(occupied, rng), 'red'));
  }
  return tiles;
}

export function dealMission(mission: MissionConfig, seed: number = Date.now()): {
  playerTiles: Tile[];
  aiTiles: Tile[];
} {
  tileIdCounter = 0;
  const rng = createRng(seed);

  const occupied = new Set<number>();
  const blue = rng.shuffle(buildBluePool());
  const needed = mission.tilesPerPlayer * 2;
  const trimmedBlue = blue.slice(0, Math.max(0, needed - mission.yellowTileCount * 2 - mission.redTileCount * 2));

  const yellow = buildYellowPool(mission.yellowTileCount * 2, rng, occupied);
  const red = buildRedPool(mission.redTileCount * 2, rng, occupied);

  const fullPool = rng.shuffle([...trimmedBlue, ...yellow, ...red]);
  const playerTiles = sortAscending(fullPool.slice(0, mission.tilesPerPlayer));
  const aiTiles = sortAscending(fullPool.slice(mission.tilesPerPlayer, mission.tilesPerPlayer * 2));

  return { playerTiles, aiTiles };
}

export function sortAscending(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => a.value - b.value);
}

export function buildEquipment(mission: MissionConfig): EquipmentCard[] {
  return mission.equipmentPool.map((name, idx) => ({
    name,
    unlockPair: idx + 1,
    unlocked: false,
    used: false,
  }));
}

export function createInitialState(mission: MissionConfig, difficulty: GameState['difficulty'], seed?: number): GameState {
  const { playerTiles, aiTiles } = dealMission(mission, seed);

  return {
    playerRack: { owner: 'player', tiles: playerTiles },
    aiRack: { owner: 'ai', tiles: aiTiles },
    detonationTracker: { current: mission.detonationLimit, max: mission.detonationLimit },
    cutHistory: [],
    revealedInfo: [],
    equipment: buildEquipment(mission),
    characterCards: [],
    currentTurn: 'player',
    turnCounter: 0,
    phase: 'setup',
    outcome: null,
    playerScore: 0,
    aiScore: 0,
    missionId: mission.id,
    difficulty,
    freezeActive: false,
    pendingSoloCutForPlayer: false,
    pendingSoloCutForAi: false,
  };
}
