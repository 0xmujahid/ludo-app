import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from "typeorm";
import { Game } from "./Game";
import { CustomRules, GameVariant } from "../types/game";
import { TwoPlayerDistribution, ThreePlayerDistribution, FourPlayerDistribution } from "../types/gameType";

@Entity("game_types")
export class GameType {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  @Index()
  name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column("int", {
    default: 4,
    name: "max_players",
    comment: "Number of players allowed (2-4)",
  })
  maxPlayers!: number;

  @Column("int", {
    default: 2,
    name: "min_players",
    comment: "Minimum number of players required to start (2-maxPlayers)",
  })
  minPlayers!: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
    name: "entry_fee",
  })
  entryFee!: number;

  @Column("int", { default: 600, name: "time_limit" })
  timeLimit!: number;

  @Column("int", { default: 30, name: "turn_time_limit" })
  turnTimeLimit!: number;

  @Column("int", {
    name: "time_per_move",
    default: 30,
    comment: "Time limit for each move in seconds",
  })
  timePerMove!: number;

  @Column("int", { default: 100, name: "points_to_win" })
  pointsToWin!: number;

  @Column("int", { default: 50, name: "max_moves" })
  maxMoves!: number;

  @Column("int", { default: 30, name: "quick_game_moves" })
  quickGameMoves!: number;

  @Column("int", { default: 200, name: "quick_game_points" })
  quickGamePoints!: number;

  @Column("int", { default: 300, name: "quick_game_time_limit" })
  quickGameTimeLimit!: number;

  @Column("int", { default: 50, name: "kill_mode_points" })
  killModePoints!: number;

  @Column("int", { default: 3, name: "life_count" })
  lifeCount!: number;

  @Column("int", { default: 20, name: "kill_mode_bonus" })
  killModeBonus!: number;

  @Column("int", { default: 10, name: "classic_bonus_points" })
  classicBonusPoints!: number;

  @Column("int", { default: 5, name: "classic_penalty_points" })
  classicPenaltyPoints!: number;

  @Column({
    type: "jsonb",
    default: {
      first: { type: "winningAmount", amount: 100 },
      second: { type: "winningAmount", amount: 0 }
    }
  })
  twoPlayers!: TwoPlayerDistribution;

  @Column({
    type: "jsonb",
    default: {
      first: { type: "winningAmount", amount: 80 },
      second: { type: "winningAmount", amount: 20 },
      third: { type: "winningAmount", amount: 0 }
    }
  })
  threePlayers!: ThreePlayerDistribution;

  @Column({
    type: "jsonb",
    default: {
      first: { type: "winningAmount", amount: 70 },
      second: { type: "winningAmount", amount: 20 },
      third: { type: "winningAmount", amount: 10 },
      fourth: { type: "winningAmount", amount: 0 }
    }
  })
  fourPlayers!: FourPlayerDistribution;

  @Column({
    type: "jsonb",
    default: {
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
      quickGameTimerEnabled: true,
    },
  })
  rules!: CustomRules;

  @Column("jsonb", { nullable: true })
  specialSquares: {
    [position: number]: {
      type: "safe" | "kill";
      points?: number;
      effect?: string;
    };
  } = {
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
  };

  @Column({
    type: "enum",
    enum: GameVariant,
    default: GameVariant.CLASSIC,
  })
  variant!: GameVariant;

  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive!: boolean;

  @CreateDateColumn({ type: "timestamp with time zone", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone", name: "updated_at" })
  updatedAt!: Date;

  @Column({ type: "int", nullable: false})
  configId!: number;

  @OneToMany(() => Game, (game) => game.gameType)
  games!: Game[];
}