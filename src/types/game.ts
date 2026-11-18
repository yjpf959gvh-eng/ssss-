export type GemColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export type PowerUpType = 'rocket_h' | 'rocket_v' | 'plane' | 'bomb' | 'rainbow';

export type ObstacleType = 'crate1' | 'crate2' | 'ice1' | 'ice2' | 'chain' | 'honey';

export interface TileItem {
  id: string;
  color: GemColor | null; // null only for standalone rainbow ball
  powerUp?: PowerUpType;
  isNew?: boolean;
  spawnOffsetRows?: number; // how many rows above its resting row it enters from
}

export interface Cell {
  row: number;
  col: number;
  active: boolean; // false = cutout hole in board layout
  tile: TileItem | null;
  crateHp: number; // 0 = none, 1 = wood crate, 2 = reinforced crate (blocks tile occupancy)
  iceHp: number; // 0 = none, 1 = frost, 2 = thick frost
  chained: boolean; // true = locked in place, cannot be swapped, breaks on match or blast
  honey: boolean; // true = sticky honey covers cell, blocks swap, spreads if none cleared in turn
  carpet: boolean; // true = emerald carpet on floor
}

export type Board = Cell[][];

export type GoalType =
  | 'collect_red'
  | 'collect_blue'
  | 'collect_green'
  | 'collect_yellow'
  | 'collect_purple'
  | 'collect_orange'
  | 'clear_crate'
  | 'clear_ice'
  | 'clear_chain'
  | 'clear_honey'
  | 'spread_carpet';

export interface LevelGoal {
  type: GoalType;
  target: number;
  label: string;
}

export type DifficultyTier = '新手启程' | '渐入佳境' | '巧思挑战' | '大师殿堂';

export interface LevelConfig {
  id: number; // 1..20
  chapter: number; // 1..4
  chapterName: string;
  title: string;
  subtitle: string;
  difficulty: DifficultyTier;
  rows: number;
  cols: number;
  colorCount: 4 | 5 | 6;
  moves: number;
  goals: LevelGoal[];
  starThresholds: [number, number, number];
  tip: string;
  layout: string[];
}

export interface BoostersInventory {
  hammer: number;
  glove: number;
  shuffle: number;
}

export interface PlayerProgress {
  unlockedLevel: number;
  levelStars: Record<number, number>;
  levelHighScores: Record<number, number>;
  coins: number;
  renovationStars: number;
  completedRenovations: string[];
  boosters: BoostersInventory;
  muted: boolean;
}

export interface FloatingPopup {
  id: string;
  row: number;
  col: number;
  text: string;
  tone: 'score' | 'combo' | 'praise';
}

export interface ClearedTileBurst {
  id: string;
  row: number;
  col: number;
  color: GemColor | null;
  powerUp?: PowerUpType;
}

export interface FlyingGoalOrb {
  id: string;
  row: number;
  col: number;
  goalType: GoalType;
  targetIdx: number; // index of goal badge in HUD
}

export interface VisualEffect {
  id: string;
  kind: 'beam_h' | 'beam_v' | 'shockwave' | 'spark_burst' | 'plane_fly' | 'rainbow_zap';
  row: number;
  col: number;
  targetRow?: number;
  targetCol?: number;
  color?: string;
}

export interface RenovationTask {
  id: string;
  chapter: number;
  title: string;
  roomName: string;
  description: string;
  costStars: number;
  rewardCoins: number;
  previewBadge: string;
}
