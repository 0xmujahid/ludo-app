import { Request, Response, NextFunction } from 'express';
import { User } from "../entities/User";
import { Game, GameVariant } from "../entities/Game";
import { Tournament } from "../entities/Tournament";
import { Wallet } from "../entities/Wallet";

export type EntityId = string;

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export type GameStatus = "waiting" | "in_progress" | "completed";

export interface GameState {
  players: { [userId: string]: PlayerState };
  currentPlayer: EntityId;
  diceRoll: number;
  winner: EntityId | null;
  maxMoves?: number; // For Quick variant
  timeLimit?: number; // For Blitz variant
  timeRemaining?: { [userId: string]: number }; // For Blitz variant
}

export type GameColor = 'red' | 'green' | 'yellow' | 'blue';

export interface PlayerState {
  pieces: number[];
  color: GameColor;
}

export interface TournamentData {
  name: string;
  startTime: Date;
  maxParticipants: number;
  entryFee: number;
  variant: GameVariant;
}

export interface UserData {
  username: string;
  phoneNumber: string;
  email?: string;
  password?: string;
}

export interface WalletTransaction {
  amount: number;
  type: "deposit" | "withdrawal";
  userId: EntityId;
}

export type EntityType = User | Game | Tournament | Wallet;

export type RequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;
