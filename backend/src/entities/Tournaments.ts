import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { TournamentParticipants } from './TournamentParticipants';

@Entity('tournaments')
export class Tournaments {
  @PrimaryGeneratedColumn('uuid')
  tournamentId!: string;

  @Column('varchar')
  name!: string;

  @Column('float')
  entryFee!: number;

  @Column('float')
  prizePool!: number;

  @Column('int')
  maxPlayers!: number;

  @Column('timestamp')
  startTime!: Date;

  @Column('varchar')
  status!: string;

  @Column('json')
  rules!: object;

  @OneToMany(() => TournamentParticipants, participant => participant.tournament)
  participants?: TournamentParticipants[];
}
