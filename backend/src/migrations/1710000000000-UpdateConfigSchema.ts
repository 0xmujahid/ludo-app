import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateConfigSchema1710000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new columns with default values
        await queryRunner.query(`
            ALTER TABLE "config"
            ADD COLUMN IF NOT EXISTS "referralAmount" float DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "twoPlayer" integer[] DEFAULT ARRAY[0, 0],
            ADD COLUMN IF NOT EXISTS "threePlayer" integer[] DEFAULT ARRAY[0, 0, 0],
            ADD COLUMN IF NOT EXISTS "fourPlayer" integer[] DEFAULT ARRAY[0, 0, 0, 0],
            ADD COLUMN IF NOT EXISTS "whatsapp" varchar,
            ADD COLUMN IF NOT EXISTS "telegram" varchar,
            ADD COLUMN IF NOT EXISTS "email" varchar,
            ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        `);

        // Update status column to ensure only one config is active
        await queryRunner.query(`
            UPDATE "config"
            SET "status" = false
            WHERE "status" = true
            AND id NOT IN (
                SELECT id FROM "config"
                WHERE "status" = true
                ORDER BY id
                LIMIT 1
            )
        `);

        // Remove default column
        await queryRunner.query(`
            ALTER TABLE "config"
            DROP COLUMN IF EXISTS "default"
        `);

        // Create trigger for updatedAt
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW."updatedAt" = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            DROP TRIGGER IF EXISTS update_config_updated_at ON "config";
            CREATE TRIGGER update_config_updated_at
                BEFORE UPDATE ON "config"
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove new columns
        await queryRunner.query(`
            ALTER TABLE "config"
            DROP COLUMN IF EXISTS "referralAmount",
            DROP COLUMN IF EXISTS "twoPlayer",
            DROP COLUMN IF EXISTS "threePlayer",
            DROP COLUMN IF EXISTS "fourPlayer",
            DROP COLUMN IF EXISTS "whatsapp",
            DROP COLUMN IF EXISTS "telegram",
            DROP COLUMN IF EXISTS "email",
            DROP COLUMN IF EXISTS "createdAt",
            DROP COLUMN IF EXISTS "updatedAt"
        `);

        // Add back default column
        await queryRunner.query(`
            ALTER TABLE "config"
            ADD COLUMN IF NOT EXISTS "default" boolean DEFAULT false
        `);

        // Drop trigger
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS update_config_updated_at ON "config";
            DROP FUNCTION IF EXISTS update_updated_at_column();
        `);
    }
} 