import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("conversion_rates")
export class ConversionRate {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "crypto_currency", type: "varchar", unique: true })
  cryptoCurrency!: string;

  @Column({ name: "tokens_per_unit", type: "decimal", precision: 10, scale: 2 })
  tokensPerUnit!: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone", default: () => "CURRENT_TIMESTAMP" })
  updatedAt!: Date;
}
