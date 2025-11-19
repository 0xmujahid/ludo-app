import { z } from "zod";
import { CustomRules, GameVariant } from "./game";

export const gameTypeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  maxPlayers: z.number().min(2).max(4).default(4),
  minPlayers: z.number().min(2).max(4).default(2),
  entryFee: z.number().min(0).default(0),
  timeLimit: z.number().min(0).default(600), // 10 minutes default
  turnTimeLimit: z.number().min(0).default(30),
  timePerMove: z.number().min(0).default(30),
  pointsToWin: z.number().min(0).default(100),
  maxMoves: z.number().min(0).default(50),

  // Quick game specific settings
  quickGameMoves: z.number().min(0).default(30),
  quickGamePoints: z.number().min(0).default(200),
  quickGameTimeLimit: z.number().min(0).default(300), // 5 minutes for quick games

  // Kill mode specific settings
  killModePoints: z.number().min(0).default(50),  // Points for killing other tokens
  lifeCount: z.number().min(1).max(5).default(3), // Number of lives in Kill mode
  killModeBonus: z.number().min(0).default(20),   // Bonus points for kill streak

  // Classic mode specific settings
  classicBonusPoints: z.number().min(0).default(10), // Bonus for completing full round
  classicPenaltyPoints: z.number().min(0).default(5), // Penalty for token capture

  variant: z.nativeEnum(GameVariant).default(GameVariant.CLASSIC),

  rules: z.object({
    skipTurnOnSix: z.boolean().default(false),
    multipleTokensPerSquare: z.boolean().default(false),
    safeZoneRules: z.enum(["standard", "strict"]).default("standard"),
    captureReward: z.number().default(10),
    bonusTurnOnSix: z.boolean().default(true),
    timeoutPenalty: z.number().default(5),
    reconnectionTime: z.number().default(60),
    disqualificationMoves: z.number().default(3),
    winningAmount: z.number().default(0),
    powerUpsEnabled: z.boolean().default(false),
    allowCustomDice: z.boolean().default(false),
    rankingPoints: z.object({
      first: z.number().default(100),
      second: z.number().default(60),
      third: z.number().default(30),
      fourth: z.number().default(10),
    }).default({}),
  }).default({
    skipTurnOnSix: false,
    multipleTokensPerSquare: false,
    safeZoneRules: "standard",
    captureReward: 10,
    bonusTurnOnSix: true,
    timeoutPenalty: 5,
    reconnectionTime: 60,
    disqualificationMoves: 3,
    winningAmount: 0,
    powerUpsEnabled: false,
    allowCustomDice: false,
    rankingPoints: {
      first: 100,
      second: 60,
      third: 30,
      fourth: 10,
    },
  }),

  specialSquares: z.record(z.number(), z.object({
    type: z.enum(["safe", "kill"]),
    points: z.number().optional(),
    effect: z.string().optional(),
  })).default({
    // Safe spots based on path system
    67: { type: "safe" }, // Player 1 starting position
    4: { type: "safe" },  // Player 2 starting position
    24: { type: "safe" }, // Player 3 starting position (also player 2 home in 2-player)
    51: { type: "safe" }, // Player 4 starting position
    19: { type: "safe" },
    35: { type: "safe" },
    56: { type: "safe" },
    38: { type: "safe" },
    // Kill spots for kill mode
    15: { type: "kill", points: 15 },
    30: { type: "kill", points: 15 },
    45: { type: "kill", points: 15 },
  }),

  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  configId: z.number().nonnegative(),
});

export type GameType = z.infer<typeof gameTypeSchema>;

export interface GameTypeResponse {
  id: string;
  name: string;
  description: string;
  maxPlayers: number;
  entryFee: number;
  timeLimit: number;
  turnTimeLimit: number;
  timePerMove: number;
  pointsToWin: number;
  maxMoves: number;
  quickGameMoves: number;
  quickGamePoints: number;
  quickGameTimeLimit: number;
  killModePoints: number;
  lifeCount: number;
  killModeBonus: number;
  classicBonusPoints: number;
  classicPenaltyPoints: number;
  variant: GameVariant;
  rules: CustomRules;
  specialSquares: Record<
    number,
    {
      type: "safe" | "kill";
      points?: number;
      effect?: string;
    }
  >;
  isActive: boolean;
}

export type WalletType = "winningAmount" | "cashbackAmount" | "balance";

export interface PlayerDistribution {
  type: WalletType;
  amount: number;
}

export interface TwoPlayerDistribution {
  first: PlayerDistribution;
  second: PlayerDistribution;
}

export interface ThreePlayerDistribution {
  first: PlayerDistribution;
  second: PlayerDistribution;
  third: PlayerDistribution;
}

export interface FourPlayerDistribution {
  first: PlayerDistribution;
  second: PlayerDistribution;
  third: PlayerDistribution;
  fourth: PlayerDistribution;
}