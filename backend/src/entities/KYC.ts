import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn
} from 'typeorm';
import { User } from './User';
import { KYCStatus, KYCVerificationMetadata } from '../types/auth';
import { EntityId } from '../types/common';

@Entity('kyc')
export class KYC {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'userId' })
  userId!: string;

  @Column({ length: 12 })
  aadharNumber!: string;

  @Column({ length: 10 })
  panNumber!: string;

  @Column({ type: 'text' })
  aadharPhotoUrl!: string;

  @Column({ type: 'text' })
  panPhotoUrl!: string;

  @Column({ type: 'text' })
  selfiePhotoUrl!: string;

  @Column({
    type: 'enum',
    enum: KYCStatus,
    default: KYCStatus.NOT_SUBMITTED,
    comment: 'Current status of KYC verification'
  })
  status!: KYCStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  verificationMetadata?: KYCVerificationMetadata;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;
}
