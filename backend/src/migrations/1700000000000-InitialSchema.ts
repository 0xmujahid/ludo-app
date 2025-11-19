import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1700000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create config table if it doesn't exist
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "config" (
                "id" SERIAL PRIMARY KEY,
                "status" boolean DEFAULT false,
                "referralAmount" float DEFAULT 0,
                "twoPlayer" integer[] DEFAULT ARRAY[0, 0],
                "threePlayer" integer[] DEFAULT ARRAY[0, 0, 0],
                "fourPlayer" integer[] DEFAULT ARRAY[0, 0, 0, 0],
                "whatsapp" varchar,
                "telegram" varchar,
                "email" varchar,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
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
        await queryRunner.query(`
            DROP TABLE IF EXISTS "config";
            DROP TRIGGER IF EXISTS update_config_updated_at ON "config";
            DROP FUNCTION IF EXISTS update_updated_at_column();
        `);
    }
}