import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { User } from "./User";
import { Wallet } from "./Wallet";
import {
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  PaymentMetadata,
  TransactionDirection,
  TransactionCategory,
} from "../types/payment";
import { PaymentAuditLog } from "./PaymentAuditLog";

@Entity("transactions")
@Index(["status", "createdAt"])
@Index(["walletId", "status"])
@Index(["userId", "status"])
@Index(["transactionType", "status"])
@Index(["referenceId"])
@Index(["sourceType", "sourceId"])
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("decimal", { precision: 10, scale: 2 })
  amount!: number;

  @Column({
    type: "enum",
    enum: TransactionType,
    name: "type",
    default: TransactionType.DEPOSIT,
  })
  transactionType!: TransactionType;

  @Column({
    type: "enum",
    enum: TransactionDirection,
    nullable: true,
  })
  direction?: TransactionDirection;

  @Column({
    type: "enum",
    enum: TransactionCategory,
    nullable: true,
  })
  category?: TransactionCategory;

  @Column({
    type: "enum",
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status!: TransactionStatus;

  @Column("varchar")
  description!: string;

  @Column({
    type: "enum",
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod?: PaymentMethod;

  @Column("varchar", { nullable: true })
  paymentId?: string;

  @Column("varchar", { nullable: true })
  updatedBy?: string;

  // Enhanced fields for comprehensive transaction tracking
  @Column("varchar", { nullable: true })
  referenceId?: string; // External reference ID (UTR, txn ID, etc.)

  @Column("varchar", { nullable: true })
  sourceType?: string; // Source of transaction (game, tournament, referral, etc.)

  @Column("varchar", { nullable: true })
  sourceId?: string; // ID of the source (gameId, tournamentId, etc.)

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  fee?: number; // Transaction fee or charges

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  tax?: number; // Tax amount (TDS, GST, etc.)

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  netAmount?: number; // Net amount after fees and taxes

  @Column("varchar", { nullable: true })
  bankReference?: string; // Bank reference number

  @Column("varchar", { nullable: true })
  upiReference?: string; // UPI reference ID

  @Column("varchar", { nullable: true })
  accountNumber?: string; // Account number for bank transfers

  @Column("varchar", { nullable: true })
  ifscCode?: string; // IFSC code for bank transfers

  @Column("varchar", { nullable: true })
  beneficiaryName?: string; // Beneficiary name for withdrawals

  @Column("text", { nullable: true })
  adminNotes?: string; // Admin notes for manual processing

  @Column("text", { nullable: true })
  userNotes?: string; // User provided notes

  @Column("varchar", { nullable: true })
  ipAddress?: string; // IP address from where transaction initiated

  @Column("varchar", { nullable: true })
  deviceInfo?: string; // Device information

  @Column("boolean", { default: false })
  isReversed?: boolean; // Whether transaction is reversed

  @Column("varchar", { nullable: true })
  reversalReason?: string; // Reason for reversal

  @Column("uuid", { nullable: true })
  parentTransactionId?: string; // Reference to parent transaction for reversals

  @Column("timestamp with time zone", { nullable: true })
  processedAt?: Date; // When transaction was processed

  @Column("timestamp with time zone", { nullable: true })
  approvedAt?: Date; // When transaction was approved

  @Column("varchar", { nullable: true })
  approvedBy?: string; // Who approved the transaction

  @OneToMany(() => PaymentAuditLog, (auditLog) => auditLog.transaction, {
    cascade: true,
    eager: true,
  })
  auditLogs?: PaymentAuditLog[];

  @Column("jsonb", { nullable: true })
  metadata?: PaymentMetadata;

  @Column("timestamp with time zone", { nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt!: Date;

  @Column("timestamp with time zone", { nullable: true })
  lastUpdated?: Date;

  @Column("uuid")
  walletId!: string;

  @Column("uuid")
  userId!: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "walletId" })
  wallet!: Wallet;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "userId" })
  user!: User;
}