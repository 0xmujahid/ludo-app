import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCryptoTables1741000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crypto_transaction_type_enum') THEN
                    CREATE TYPE "crypto_transaction_type_enum" AS ENUM ('deposit', 'withdrawal');
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crypto_transaction_status_enum') THEN
                    CREATE TYPE "crypto_transaction_status_enum" AS ENUM (
                        'pending',
                        'waiting',
                        'confirming',
                        'confirmed',
                        'sending',
                        'finished',
                        'failed',
                        'refunded',
                        'expired'
                    );
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "crypto_transactions" (
                "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                "user_id" uuid NOT NULL,
                "payment_id" varchar UNIQUE,
                "order_id" varchar UNIQUE,
                "type" "crypto_transaction_type_enum" NOT NULL,
                "crypto_currency" varchar NOT NULL,
                "crypto_amount" decimal(20,8) NOT NULL,
                "usd_amount" decimal(10,2),
                "game_tokens" integer NOT NULL,
                "conversion_rate" decimal(10,2) NOT NULL,
                "status" "crypto_transaction_status_enum" NOT NULL DEFAULT 'pending',
                "payment_status" varchar,
                "pay_address" varchar,
                "pay_amount" decimal(20,8),
                "actually_paid" decimal(20,8),
                "transaction_hash" varchar,
                "confirmations" integer DEFAULT 0,
                "network_fee" decimal(20,8),
                "outcome_amount" decimal(20,8),
                "payment_extra_id" varchar,
                "webhook_data" jsonb DEFAULT '{}'::jsonb,
                "error_message" text,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "confirmed_at" TIMESTAMP WITH TIME ZONE,
                "expires_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "FK_crypto_transactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_crypto_transactions_user_id" ON "crypto_transactions" ("user_id");
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_crypto_transactions_status" ON "crypto_transactions" ("status");
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_crypto_transactions_payment_id" ON "crypto_transactions" ("payment_id");
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "conversion_rates" (
                "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                "crypto_currency" varchar UNIQUE NOT NULL,
                "tokens_per_unit" decimal(10,2) NOT NULL,
                "is_active" boolean DEFAULT true,
                "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await queryRunner.query(`
            INSERT INTO "conversion_rates" ("crypto_currency", "tokens_per_unit", "is_active", "updated_at") VALUES
                ('USD', 10, true, CURRENT_TIMESTAMP),
                ('SOL', 20, true, CURRENT_TIMESTAMP),
                ('USDT', 10, true, CURRENT_TIMESTAMP),
                ('ETH', 500, true, CURRENT_TIMESTAMP),
                ('BTC', 10000, true, CURRENT_TIMESTAMP)
            ON CONFLICT ("crypto_currency") DO UPDATE SET
                "tokens_per_unit" = EXCLUDED."tokens_per_unit",
                "is_active" = EXCLUDED."is_active",
                "updated_at" = EXCLUDED."updated_at";
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS "crypto_transactions";
        `);

        await queryRunner.query(`
            DROP TABLE IF EXISTS "conversion_rates";
        `);

        await queryRunner.query(`
            DROP TYPE IF EXISTS "crypto_transaction_type_enum";
        `);

        await queryRunner.query(`
            DROP TYPE IF EXISTS "crypto_transaction_status_enum";
        `);
    }
}
