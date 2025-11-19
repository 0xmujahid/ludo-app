import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { User } from './User';
import { Transaction } from './Transaction';

@Entity('wallets')
@Index(['userId'])  // Add index for foreign key
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  balance!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  winningAmount!: number;

  /**
   * Cashback amount that can be used partially for game entry fees
   * This amount is accumulated through referral bonuses and other promotions
   */
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cashbackAmount!: number;

  /**
   * Total balance is the sum of all wallet components:
   * balance + winningAmount + cashbackAmount
   */
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalBalance!: number;

  @Column('varchar', { default: 'INR' })
  currency!: string;

  @Column('varchar', { default: '' })
  withdrawalUpi!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column('timestamp with time zone', { nullable: true })
  lastUpdated?: Date;

  @OneToOne(() => User, user => user.wallet)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column('uuid')
  userId!: string;

  @OneToMany(() => Transaction, transaction => transaction.wallet)
  transactions!: Transaction[];
}