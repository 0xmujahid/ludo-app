import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { GameVariant } from "../types/game";

@Entity("user_stats")
export class UserStats {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ default: 0 })
  gamesPlayed!: number;

  @Column({ default: 0 })
  gamesWon!: number;

  @Column({ default: 0 })
  quickGamesPlayed!: number;

  @Column({ default: 0 })
  quickGamesWon!: number;

  @Column({ default: 0 })
  classicGamesPlayed!: number;

  @Column({ default: 0 })
  classicGamesWon!: number;

  @Column({ default: 0 })
  totalPoints!: number;

  @Column({ default: 0 })
  totalKills!: number;

  @Column({ default: 0 })
  rankingPoints!: number;

  @Column({ type: "enum", enum: GameVariant, nullable: true })
  preferredVariant?: GameVariant;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 