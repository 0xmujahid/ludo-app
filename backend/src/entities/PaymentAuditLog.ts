import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Transaction } from "./Transaction";

@Entity('payment_audit_logs')
export class PaymentAuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: 'uuid' })
  transactionId!: string;

  @Column({ type: 'uuid' })
  adminUserId!: string;

  @Column({
    type: 'enum',
    enum: ['APPROVED', 'REJECTED', 'PENDING_REVIEW', 'VERIFICATION_REQUESTED', 'UTR_VERIFIED', 'UTR_REJECTED'],
    default: 'PENDING_REVIEW'
  })
  action!: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  timestamp!: Date;

  @ManyToOne(() => Transaction, transaction => transaction.auditLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  transaction!: Transaction;
}
