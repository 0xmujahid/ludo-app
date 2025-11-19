import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  Index,
  Repository,
  BeforeInsert,
  JoinColumn,
} from "typeorm";
import { AppDataSource } from "../config/database";
import { GameSessions } from "./GameSessions";
import { GamePlayers } from "./GamePlayers";
import { GameType } from "./GameType";
import {
  GameVariant,
  GameState,
  GameStatus,
  PlayerState,
  TokenMove,
  GameRules,
  CustomRules,
} from "../types/game";

// Re-export enums for consistency
export { GameVariant, GameStatus };

@Entity("games")
export class Game {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "enum",
    enum: GameStatus,
    enumName: "game_status",
    default: GameStatus.WAITING,
    comment: "Current status of the game",
  })
  @Index()
  status!: GameStatus;

  @Column({
    type: "enum",
    enum: GameVariant,
    default: GameVariant.CLASSIC,
    comment: "Type of game variant being played",
  })
  variant!: GameVariant;

  @ManyToOne(() => GameType, (gameType) => gameType.games)
  @JoinColumn({ name: "game_type_id" })
  gameType!: GameType;

  @Column("uuid", { name: "game_type_id" })
  gameTypeId!: string;

  @Column({
    type: "jsonb",
    nullable: true,
    comment: "Game rules configuration",
  })
  rules?: GameRules;

  @Index()
  @Column({ type: "varchar", length: 6, unique: true })
  roomCode!: string;

  @Column({ type: "boolean", default: false })
  isPrivate!: boolean;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  entryFee!: number;

  @Column("int", {
    default: 4,
    name: "max_players",
    comment: "Number of players allowed in the room (must be 2, 3, or 4)",
  })
  maxPlayers!: number;

  @Column("int", {
    default: 30,
    name: "time_per_move",
    comment: "Time limit for each move in seconds (10-300)",
  })
  timePerMove!: number;

  @Column("int", { default: 100 })
  pointsToWin!: number;

  @Column("int", { default: 50 })
  maxMoves!: number;

  @Column("int", { default: 300 })
  timeLimit!: number;

  @Column("int", { default: 30 })
  turnTimeLimit!: number;

  @Column("int", { default: 0 })
  moveCount!: number;

  @Column("varchar", {
    nullable: true,
    comment: "Password required for private rooms (minimum 4 characters)",
    length: 100,
  })
  password?: string;

  @Column({
    type: "jsonb",
    comment:
      "Complete game state including player positions, rules, and history",
  })
  state!: GameState;

  @Column({ type: "timestamp with time zone", nullable: true })
  startTime?: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  endTime?: Date;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @OneToOne(() => GameSessions, (session) => session.game, {
    cascade: ["insert", "update"],
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn()
  session?: GameSessions;

  @OneToMany(() => GamePlayers, (gamePlayer) => gamePlayer.game, {
    cascade: ["insert", "update"],
    eager: true,
    onDelete: "CASCADE",
  })
  players!: GamePlayers[];

  @Index()
  @Column("uuid", { array: true, default: [] })
  playerIds!: string[];

  @BeforeInsert()
  private async initializeState(): Promise<void> {
    const gameTypeRepo = AppDataSource.getRepository(GameType);
    const gameType = await gameTypeRepo.findOneByOrFail({
      id: this.gameTypeId,
    });

    const gameState: GameState = {
      players: {},
      currentPlayer: "",
      turnOrder: [],
      diceRoll: 0,
      winner: null,
      gameStartTime: new Date(),
      lastMoveTime: new Date(),
      timePerMove: gameType.timePerMove || this.timePerMove,
      status: GameStatus.WAITING,
      variant: this.variant,
      minPlayers: 2,
      customRules: {
        skipTurnOnSix: gameType.rules?.skipTurnOnSix ?? false,
        multipleTokensPerSquare:
          gameType.rules?.multipleTokensPerSquare ?? false,
        safeZoneRules: gameType.rules?.safeZoneRules ?? "standard",
        captureReward: gameType.rules?.captureReward ?? 10,
        bonusTurnOnSix: gameType.rules?.bonusTurnOnSix ?? true,
        timeoutPenalty: gameType.rules?.timeoutPenalty ?? 5,
        reconnectionTime: gameType.rules?.reconnectionTime ?? 60,
        disqualificationMoves: gameType.rules?.disqualificationMoves ?? 3,
        winningAmount: gameType.rules?.winningAmount ?? 0,
        rankingPoints: {
          first: gameType.rules?.rankingPoints?.first ?? 100,
          second: gameType.rules?.rankingPoints?.second ?? 60,
          third: gameType.rules?.rankingPoints?.third ?? 30,
          fourth: gameType.rules?.rankingPoints?.fourth ?? 10,
        },
        killModeEnabled: this.variant === GameVariant.KILL,
        livesPerPlayer: this.variant === GameVariant.KILL ? 3 : undefined,
      },
      consecutiveSixes: 0,
      moveHistory: [],
      allPlayersReady: false,
      specialSquares: {
        1: { type: "safe" },
        9: { type: "safe" },
        14: { type: "safe" },
        22: { type: "safe" },
        27: { type: "safe" },
        35: { type: "safe" },
        40: { type: "safe" },
        48: { type: "safe" },
        57: { type: "home" },
        ...(this.variant === GameVariant.KILL
          ? {
              15: { type: "kill" },
              30: { type: "kill" },
              45: { type: "kill" },
            }
          : {}),
      },
      maxMoves: gameType.maxMoves || this.maxMoves,
      timeLimit: gameType.timeLimit || this.timeLimit,
      turnTimeLimit: gameType.turnTimeLimit || this.turnTimeLimit,
      moveCount: this.moveCount,
      pointsToWin: gameType.pointsToWin || this.pointsToWin,
      roomCode: this.roomCode,
      isPrivate: this.isPrivate,
      password: this.password,
      entryFee: gameType.entryFee || this.entryFee,
      maxPlayers: gameType.maxPlayers || this.maxPlayers,
    };

    this.state = gameState;
  }

  public static async generateRoomCode(
    repository?: Repository<Game>,
  ): Promise<string> {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const codeLength = 6;
    const maxAttempts = 5;
    const gameRepo = repository || AppDataSource.getRepository(Game);

    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      const roomCode = Array.from({ length: codeLength }, () =>
        characters.charAt(Math.floor(Math.random() * characters.length)),
      ).join("");

      const existingGame = await gameRepo.findOne({ where: { roomCode } });
      if (!existingGame) {
        return roomCode;
      }
    }

    throw new Error(
      "Unable to generate unique room code after maximum attempts",
    );
  }
}