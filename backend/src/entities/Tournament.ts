import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum TournamentFormat {
  SINGLE_ELIMINATION = 'single_elimination',
  DOUBLE_ELIMINATION = 'double_elimination',
  ROUND_ROBIN = 'round_robin',
  SWISS = 'swiss'
}

@Entity({ name: 'tournament' })
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name' })
  name!: string;

  @Column({
    name: 'format',
    type: 'enum',
    enum: TournamentFormat,
    default: TournamentFormat.SINGLE_ELIMINATION
  })
  format!: TournamentFormat;

  @Column({ name: 'start_time' })
  startTime!: Date;

  @Column({ name: 'end_time', nullable: true })
  endTime?: Date;

  @Column({ name: 'max_participants' })
  maxParticipants!: number;

  @Column({ name: 'entry_fee', type: 'decimal', precision: 10, scale: 2 })
  entryFee!: number;

  @Column({ name: 'prize_pool', type: 'decimal', precision: 10, scale: 2 })
  prizePool!: number;

  @Column({ name: 'brackets', type: 'simple-json', nullable: true })
  brackets?: any;

  @Column({ name: 'winner_id', nullable: true })
  winnerId?: string;

  @ManyToMany(() => User, user => user.tournaments)
  @JoinTable({
    name: 'tournament_participants',
    joinColumn: { name: 'tournament_id' },
    inverseJoinColumn: { name: 'userId' }
  })
  participants!: User[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'winner_id' })
  winner?: User;
}
