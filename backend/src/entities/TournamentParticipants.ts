import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Tournaments } from './Tournaments';
import { User } from './User';

@Entity('tournament_participants')
export class TournamentParticipants {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tournamentId!: string;

  @Column('uuid')
  userId!: string;

  @Column('timestamp')
  joinTime!: Date;

  @Column('int')
  position!: number;

  @Column('float')
  prizeMoney!: number;

  @ManyToOne(() => Tournaments, tournament => tournament.participants)
  @JoinColumn({ name: 'tournamentId' })
  tournament?: Tournaments;

  @ManyToOne(() => User, user => user.tournaments)
  @JoinColumn({ name: 'userId' })
  user?: User;
}
