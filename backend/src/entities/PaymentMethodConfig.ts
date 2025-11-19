import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PaymentMethod } from '../types/payment';

@Entity('payment_method_config')
export class PaymentMethodConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    unique: true
  })
  paymentMethod!: PaymentMethod;

  @Column({ default: true })
  isEnabled: boolean = true;

  @Column({ type: 'jsonb', nullable: true })
  configuration: Record<string, any> = {};

  @Column({ nullable: true })
  disabledReason?: string;

  @Column({ nullable: true })
  updatedBy?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  enabledFrom: Date | null = null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  enabledUntil: Date | null = null;

  @Column({ default: false })
  hasSchedule: boolean = false;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  constructor(partial?: Partial<PaymentMethodConfig>) {
    this.configuration = {};
    this.isEnabled = true;
    this.hasSchedule = false;
    
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
