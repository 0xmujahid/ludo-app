import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity("leaderboards")
export class Leaderboards {
  @PrimaryGeneratedColumn("uuid")
  leaderboardId!: string;

  @Column("varchar")
  type!: string;

  @Column("timestamp")
  periodStart!: Date;

  @Column("timestamp")
  periodEnd!: Date;

  @Column("int")
  ranking!: number;

  @ManyToOne(() => User, (user) => user.leaderboardEntries, {
    onDelete: "CASCADE", // Adjust as needed
  })
  @JoinColumn({ name: "userId" }) // Database column
  user!: User;
}