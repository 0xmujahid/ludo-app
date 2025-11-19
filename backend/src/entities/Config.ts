import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("config")
export class Config {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "float" })
  tds: number;

  @Column({ type: "float" })
  fee: number;

  @Column({ type: "float" })
  cashback: number;

  @Column({ type: "float", default: 50 })
  referralAmount: number;

  @Index()
  @Column({ type: "varchar", unique: true })
  name: string;

  @Column({ type: "int", array: true, default: [100, 0] })
  twoPlayer: number[];

  @Column({ type: "int", array: true, default: [80, 20, 0] })
  threePlayer: number[];

  @Column({ type: "int", array: true, default: [70, 20, 10, 0] })
  fourPlayer: number[];

  @Column({ type: "varchar", nullable: true })
  whatsapp: string;

  @Column({ type: "varchar", nullable: true })
  telegram: string;

  @Column({ type: "varchar", nullable: true })
  email: string;

  @Index()
  @Column({ type: "boolean", default: false })
  status: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
