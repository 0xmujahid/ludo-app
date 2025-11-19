import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";

export enum CryptoTransactionType {
  DEPOSIT = "deposit",
  WITHDRAWAL = "withdrawal",
}

export enum CryptoTransactionStatus {
  PENDING = "pending",
  WAITING = "waiting",
  CONFIRMING = "confirming",
  CONFIRMED = "confirmed",
  SENDING = "sending",
  FINISHED = "finished",
  FAILED = "failed",
  REFUNDED = "refunded",
  EXPIRED = "expired",
}

@Entity("crypto_transactions")
export class CryptoTransaction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, (user) => user.cryptoTransactions, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "user_id", referencedColumnName: "id" })
  user!: User;

  @Column({ name: "payment_id", type: "varchar", nullable: true, unique: true })
  paymentId?: string;

  @Column({ name: "order_id", type: "varchar", nullable: true, unique: true })
  orderId?: string;

  @Column({ type: "enum", enum: CryptoTransactionType })
  type!: CryptoTransactionType;

  @Column({ name: "crypto_currency", type: "varchar" })
  cryptoCurrency!: string;

  @Column({ name: "crypto_amount", type: "decimal", precision: 20, scale: 8 })
  cryptoAmount!: string;

  @Column({ name: "usd_amount", type: "decimal", precision: 10, scale: 2, nullable: true })
  usdAmount?: string;

  @Column({ name: "game_tokens", type: "int" })
  gameTokens!: number;

  @Column({ name: "conversion_rate", type: "decimal", precision: 10, scale: 2 })
  conversionRate!: string;

  @Column({ type: "enum", enum: CryptoTransactionStatus, default: CryptoTransactionStatus.PENDING })
  status!: CryptoTransactionStatus;

  @Column({ name: "payment_status", type: "varchar", nullable: true })
  paymentStatus?: string;

  @Column({ name: "pay_address", type: "varchar", nullable: true })
  payAddress?: string;

  @Column({ name: "pay_amount", type: "decimal", precision: 20, scale: 8, nullable: true })
  payAmount?: string;

  @Column({ name: "actually_paid", type: "decimal", precision: 20, scale: 8, nullable: true })
  actuallyPaid?: string;

  @Column({ name: "transaction_hash", type: "varchar", nullable: true })
  transactionHash?: string;

  @Column({ type: "int", default: 0 })
  confirmations!: number;

  @Column({ name: "network_fee", type: "decimal", precision: 20, scale: 8, nullable: true })
  networkFee?: string;

  @Column({ name: "outcome_amount", type: "decimal", precision: 20, scale: 8, nullable: true })
  outcomeAmount?: string;

  @Column({ name: "payment_extra_id", type: "varchar", nullable: true })
  paymentExtraId?: string;

  @Column({ name: "webhook_data", type: "jsonb", nullable: true, default: () => "'{}'::jsonb" })
  webhookData?: Record<string, unknown>;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone" })
  updatedAt!: Date;

  @Column({ name: "confirmed_at", type: "timestamp with time zone", nullable: true })
  confirmedAt?: Date;

  @Column({ name: "expires_at", type: "timestamp with time zone", nullable: true })
  expiresAt?: Date;
}
