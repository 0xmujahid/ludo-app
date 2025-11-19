import { GamePlayers } from "../entities/GamePlayers";

export enum GameVariant {
  CLASSIC = "CLASSIC",
  QUICK = "QUICK",
  KILL = "KILL",
  CUSTOM = "CUSTOM"
}

export enum GameStatus {
  WAITING = "WAITING",
  STARTING = "STARTING",  
  IN_PROGRESS = "IN_PROGRESS",
  PAUSED = "PAUSED",     // Added PAUSED status
  COMPLETED = "COMPLETED",
  ABANDONED = "ABANDONED",
}

export enum GameColor {
  RED = "RED",
  GREEN = "GREEN",
  YELLOW = "YELLOW",
  BLUE = "BLUE"
}

// Add Queue related interfaces
export interface QueueStatistics {
  totalPlayers: number;
  averageWaitTime: number;
  regionStats: {
    [key: string]: number;
  };
  variantStats: {
    [key: string]: number;
  };
}

export interface QueueStatus {
  position: number;
  totalInQueue: number;
  estimatedWaitTime: number;
  matchmakingRegion: string;
  gameVariant: GameVariant;
}

export function isGameStatus(status: string): status is GameStatus {
  return Object.values(GameStatus).includes(status as GameStatus);
}

export interface PlayerState {
  pieces: number[];
  color: string;
  points?: number;
  kills?: number;
  timeRemaining?: number;
  lastMoveTime?: Date;
  moveHistory?: TokenMove[];
  userId: string;
  username: string;
  isReady: boolean;
  position: number;
  tokenPositions?: number[];
  isActive: boolean;
  joinedAt: Date;
  lives?: number;
  variant?: GameVariant;
}

export interface CustomRules {
  skipTurnOnSix: boolean;
  multipleTokensPerSquare: boolean;
  safeZoneRules: "standard" | "strict";
  captureReward: number;
  bonusTurnOnSix: boolean;
  timeoutPenalty: number;
  reconnectionTime: number;
  disqualificationMoves: number;
  winningAmount: number;
  rankingPoints: {
    first: number;
    second: number;
    third: number;
    fourth: number;
  };
  killModeEnabled?: boolean;
  livesPerPlayer?: number;
  classicBonusPoints?: number;
  classicPenaltyPoints?: number;
  killModeBonus?: number;
  quickGameTimerEnabled?: boolean; // NEW: Enable/disable timer for QUICK games
}

export interface SpecialSquare {
  type: "safe" | "home" | "kill" | "bonus" | "penalty";
  points?: number;
  effect?: "none" | "extra_turn" | "skip_turn" | "move_forward" | "move_backward";
  occupiedBy?: {
    playerId: string;
    tokenIndex: number;
  };
}

export interface GameStateCore {
  players: { [userId: string]: PlayerState };
  currentPlayer: string;
  turnOrder: string[];
  diceRoll: number;
  winner: string | null;
  gameStartTime: Date;
  lastMoveTime: Date;
  timePerMove: number;
  status: GameStatus;
  variant: GameVariant;
  minPlayers: number;
  customRules: CustomRules;
  consecutiveSixes: number;
  moveHistory: TokenMove[];
  specialSquares: { [position: number]: SpecialSquare };
  allPlayersReady: boolean;
}

export interface GameConfig {
  maxMoves: number;
  timeLimit: number;
  turnTimeLimit: number;
  moveCount: number;
  pointsToWin: number;
}

export interface RoomConfig {
  roomCode: string;
  isPrivate: boolean;
  password?: string;
  entryFee: number;
  maxPlayers: number;
}

export interface GameRules {
  skipTurnOnSix: boolean;
  multipleTokensPerSquare: boolean;
  safeZoneRules: "standard" | "strict";
  captureReward: number;
  bonusTurnOnSix: boolean;
  timeoutPenalty: number;
}

// Updated to explicitly extend all required interfaces
export interface GameState extends GameStateCore, GameConfig, RoomConfig {
  specialSquares: { [position: number]: SpecialSquare };
  allPlayersReady: boolean;
  password?: string;
}

export interface TokenMove {
  playerId: string;
  tokenId: number;
  fromPosition: number;
  toPosition: number;
  kills: number;
  timestamp: Date;
  capturedTokens?: Array<{
    playerId: string;
    tokenId: number;
    position: number;
    isKillMode?: boolean;
  }>;
  diceValue?: number;
  isBonus?: boolean;
}

export interface DiceRollResult {
  diceResult: number;
  gameState: GameState;
  hasValidMoves: boolean;
}

export interface MoveResult {
  gameState: GameState;
  move: TokenMove;
  kills: number;
}