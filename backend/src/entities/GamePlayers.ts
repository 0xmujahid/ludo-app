import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { GameSessions } from "./GameSessions";
import { User } from "./User";
import { Game } from "./Game";
import { GameColor, TokenMove } from "../types/game";

/**
 * GamePlayers entity represents a player in a game session
 * Tracks player state, position, and game statistics
 */
@Entity("game_players")
@Index(["gameId", "userId"], { unique: true })
@Index(["gameId", "position"], { unique: true })
export class GamePlayers {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("int", { default: 0 })
  @Index()
  position!: number;

  @Column("boolean", { default: false })
  isWinner!: boolean;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  prizeMoney!: number;

  @Column("jsonb", { default: [0, 0, 0, 0] })
  tokenPositions!: number[];

  @Column("jsonb", {
    default: {
      points: 0,
      moves: [],
      timeRemaining: 300,
      lastMoveTime: new Date(),
    },
  })
  gameStats!: {
    points: number;
    moves: TokenMove[];
    timeRemaining: number;
    lastMoveTime: Date;
  };

  @Column("varchar", { nullable: false })
  username!: string;

  @Column("boolean", { default: true })
  isActive!: boolean;

  @Column({
    type: "enum",
    enum: GameColor,
    enumName: "game_color",
    nullable: false,
  })
  color!: GameColor;

  @Column("int", { default: 0 })
  points!: number;

  @Column("int", { default: 0 })
  kills!: number;

  @Column("jsonb", { default: [] })
  moveHistory!: TokenMove[];

  @Column("int", { nullable: true })
  timeRemaining?: number;

  @Column("timestamp with time zone", { nullable: true })
  lastMoveTime?: Date;

  @Column("boolean", { default: false })
  isReady!: boolean;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt!: Date;

  @Column("timestamp with time zone", { nullable: true })
  joinedAt?: Date;

  @ManyToOne(() => Game, (game) => game.players)
  @JoinColumn({ name: "gameId" })
  game!: Game;

  @ManyToOne(() => GameSessions, (session) => session.players, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "gameSessionId" })
  gameSession!: GameSessions;

  @ManyToOne(() => User, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column("uuid")
  @Index()
  gameId!: string;

  @Column("uuid")
  @Index()
  userId!: string;

  @Column("uuid", { nullable: true })
  @Index()
  gameSessionId?: string;
}
