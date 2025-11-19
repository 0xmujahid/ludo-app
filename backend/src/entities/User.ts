import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  Index,
  CreateDateColumn,
  JoinColumn,
} from "typeorm";
import { Wallet } from "./Wallet";
import { Game } from "./Game";
import { Tournament } from "./Tournament";
import { GamePlayers } from "./GamePlayers";
import { Leaderboards } from "./Leaderboards";
import { UserRole, Gender, KYCStatus } from "../types/auth";
import { EntityId } from "../types/common";
import { Transaction } from "./Transaction";
import { CryptoTransaction } from "./CryptoTransaction";

// Re-export the types from auth
export { UserRole, Gender, KYCStatus };

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "username", unique: true })
  username!: string;

  @Index()
  @Column({ name: "phoneNumber", unique: true })
  phoneNumber!: string;

  @Index()
  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({
    type: "enum",
    enum: Gender,
    nullable: true,
  })
  gender?: Gender;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({
    type: "enum",
    enum: KYCStatus,
    default: KYCStatus.NOT_SUBMITTED,
  })
  kycStatus!: KYCStatus;

  @Column({ type: "timestamp with time zone", nullable: true })
  kycSubmittedAt?: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  kycVerifiedAt?: Date;

  @Column({ nullable: true })
  otpSecret?: string;

  @Column({ type: "timestamp with time zone", nullable: true })
  otpExpiresAt?: Date;

  @Column({ default: 0 })
  gamesWon!: number;

  @Column({ default: 0 })
  totalGamesPlayed!: number;

  @Index()
  @Column({ type: "float", default: 1 })
  eloRating!: number;

  @Column({ type: "jsonb", nullable: true })
  recentGames?: { gameId: string; won: boolean; timestamp: Date }[];

  @Index()
  @Column({ nullable: true })
  region?: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.PLAYER,
    comment: "User role determines access permissions",
  })
  role!: UserRole;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  // Referral system fields
  @Index()
  @Column({ unique: true, nullable: true })
  referralCode?: string;

  @Column({ nullable: true })
  referredBy?: string;

  @Column({ default: false })
  hasClaimedReferralBonus!: boolean;

  @Column({ type: "int", default: 0 })
  totalReferrals!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalReferralEarnings!: number;

  @Column({ type: "jsonb", default: [] })
  referralHistory!: {
    referredUserId: string;
    username: string;
    joinedAt: Date;
    bonusClaimed: boolean;
    bonusAmount?: number;
    claimedAt?: Date;
  }[];

  @OneToOne(() => Wallet, (wallet: Wallet) => wallet.user)
  @JoinColumn({ name: "walletId" })
  wallet!: Wallet;

  @OneToMany(() => Transaction, (transaction: Transaction) => transaction.user)
  transactions!: Transaction[];

  @OneToMany(() => CryptoTransaction, (cryptoTransaction) => cryptoTransaction.user)
  cryptoTransactions!: CryptoTransaction[];

  @OneToMany(() => Game, (game) => game.players)
  games!: Game[];

  @OneToMany(() => GamePlayers, (gamePlayer) => gamePlayer.user)
  gamePlayers!: GamePlayers[];

  @OneToMany(() => Leaderboards, (leaderboard) => leaderboard.user)
  leaderboardEntries!: Leaderboards[];

  @OneToMany(() => Tournament, (tournament) => tournament.participants)
  tournaments!: Tournament[];
}