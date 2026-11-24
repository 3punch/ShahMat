// تایپ‌های پایه‌ی موتور بازی شاه‌مات

export type Side = 'gold' | 'azure';

export interface MoveOption {
  r: number;
  c: number;
  captureId?: string;
}

export interface PieceState {
  id: string;
  heroId: string;
  side: Side;
  r: number;
  c: number;
  /** تعداد نوبت‌های باقی‌مانده تا آماده‌شدن قابلیت؛ صفر یعنی آماده */
  cooldown: number;
  alive: boolean;
  /** تا شروع این نوبت (شماره‌ی نوبت) قابل گرفته‌شدن نیست */
  immuneUntil?: number;
  /** سپر فرامرز */
  shieldUntil?: number;
  /** زنجیر اسفندیار: تا شروع این نوبت نمی‌تواند حرکت کند */
  rootedUntil?: number;
}

export interface LogEntry {
  side: Side | 'system';
  text: string;
}

export interface TurnFlags {
  movesUsed: number;
  abilityUsed: boolean;
  /** مهره‌هایی که یک حرکت جایزه دارند */
  bonusMoves: string[];
  /** خشم بیژن: بُرد حرکت +۲ تا پایان این نوبت */
  bijanBuff: string | null;
  sohrabChainActive: boolean;
  sohrabExtraUsed: boolean;
}

export interface GameState {
  board: (string | null)[][];
  pieces: Record<string, PieceState>;
  captured: string[];
  turn: Side;
  turnNumber: number;
  winner: Side | null;
  log: LogEntry[];
  flags: TurnFlags;
  reviveUsed: Record<string, boolean>;
}

export interface DeployedPiece {
  heroId: string;
  r: number;
  c: number;
}

export type AbilityArg = {
  targetPieceId?: string;
  r?: number;
  c?: number;
  capturedId?: string;
};

export type TargetKind =
  | 'self'
  | 'enemy-piece'
  | 'ally-piece'
  | 'enemy-los'
  | 'enemy-swap'
  | 'ally-swap'
  | 'empty-square'
  | 'revive';

export interface AbilityDef {
  id: string;
  name: string;
  cooldown: number;
  text: string;
  target: TargetKind;
  range?: number;
  losRange?: number;
}

export type MoveStep =
  | { kind: 'slide'; dr: number; dc: number; range: number; fwd?: boolean }
  | { kind: 'jump'; dr: number; dc: number; fwd?: boolean };

export interface HeroDef {
  id: string;
  name: string;
  cost: number;
  steps: MoveStep[];
  moveText: string;
  ability: AbilityDef;
  portrait: string;
  bio: string;
}

export const TEAM_SIZE = 8;
export const BUDGET = 24;
export const MAX_COPIES = 2;
export const BOARD_SIZE = 8;
