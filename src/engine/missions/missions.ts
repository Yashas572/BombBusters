import type { MissionConfig } from '../types';

export const TRAINING_MISSIONS: MissionConfig[] = [
  {
    id: 1,
    name: 'Mission 1: First Wires',
    tier: 'training',
    tilesPerPlayer: 6,
    yellowTileCount: 0,
    redTileCount: 0,
    detonationLimit: 5,
    equipmentPool: [],
    includeCharacterCards: false,
  },
  {
    id: 2,
    name: 'Mission 2: Info Tokens',
    tier: 'training',
    tilesPerPlayer: 8,
    yellowTileCount: 0,
    redTileCount: 0,
    detonationLimit: 5,
    equipmentPool: [],
    includeCharacterCards: false,
  },
  {
    id: 3,
    name: 'Mission 3: Double Detector',
    tier: 'training',
    tilesPerPlayer: 8,
    yellowTileCount: 0,
    redTileCount: 0,
    detonationLimit: 5,
    equipmentPool: ['double_detector'],
    includeCharacterCards: false,
  },
  {
    id: 4,
    name: 'Mission 4: Yellow Wires',
    tier: 'training',
    tilesPerPlayer: 9,
    yellowTileCount: 1,
    redTileCount: 0,
    detonationLimit: 5,
    equipmentPool: ['double_detector'],
    includeCharacterCards: false,
  },
  {
    id: 5,
    name: 'Mission 5: Freeze',
    tier: 'training',
    tilesPerPlayer: 9,
    yellowTileCount: 1,
    redTileCount: 0,
    detonationLimit: 4,
    equipmentPool: ['double_detector', 'freeze'],
    includeCharacterCards: false,
  },
  {
    id: 6,
    name: 'Mission 6: Scanner',
    tier: 'training',
    tilesPerPlayer: 10,
    yellowTileCount: 1,
    redTileCount: 0,
    detonationLimit: 4,
    equipmentPool: ['double_detector', 'freeze', 'scanner'],
    includeCharacterCards: false,
  },
  {
    id: 7,
    name: 'Mission 7: Red Wires',
    tier: 'training',
    tilesPerPlayer: 10,
    yellowTileCount: 1,
    redTileCount: 1,
    detonationLimit: 4,
    equipmentPool: ['double_detector', 'freeze', 'scanner'],
    includeCharacterCards: false,
  },
  {
    id: 8,
    name: 'Mission 8: Character Abilities',
    tier: 'training',
    tilesPerPlayer: 12,
    yellowTileCount: 1,
    redTileCount: 1,
    detonationLimit: 4,
    equipmentPool: ['double_detector', 'freeze', 'scanner'],
    includeCharacterCards: true,
  },
];

export function getMission(id: number): MissionConfig | undefined {
  return TRAINING_MISSIONS.find(m => m.id === id);
}

export function buildCustomMission(opts: {
  tilesPerPlayer: number;
  yellowTileCount: number;
  redTileCount: number;
  detonationLimit: number;
  equipmentPool: MissionConfig['equipmentPool'];
}): MissionConfig {
  return {
    id: 0,
    name: 'Custom Game',
    tier: 'standard',
    includeCharacterCards: false,
    ...opts,
  };
}
