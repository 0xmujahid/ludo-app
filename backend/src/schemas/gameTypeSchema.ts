import { z } from "zod";

// Custom rules schema
const customRulesSchema = z.object({
  killModeEnabled: z.boolean().optional(),
  livesPerPlayer: z.number().min(1).max(4).optional(),
  classicBonusPoints: z.number().min(0).optional(),
  classicPenaltyPoints: z.number().min(0).optional(),
  killModeBonus: z.number().min(0).optional(),
});

// Special square schema
const specialSquareSchema = z.object({
  type: z.enum(["safe", "kill"]),
  points: z.number().optional(),
  effect: z.string().optional(),
});

// Game type schema
export const gameTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  variant: z.enum(["QUICK", "CLASSIC", "KILL"]),
  minPlayers: z.number().min(2).max(4),
  maxPlayers: z.number().min(2).max(4),
  entryFee: z.number().min(0),
  pointsToWin: z.number().min(1),
  timeLimit: z.number().min(0),
  turnTimeLimit: z.number().min(0),
  maxMoves: z.number().min(0),
  rules: customRulesSchema,
  specialSquares: z.record(z.number(), specialSquareSchema).default({
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
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// Type for game type
export type GameTypeSchema = z.infer<typeof gameTypeSchema>; 