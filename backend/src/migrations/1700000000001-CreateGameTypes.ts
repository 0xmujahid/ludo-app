import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGameTypes1700000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create game_types table if it doesn't exist
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "game_types" (
                "id" SERIAL PRIMARY KEY,
                "name" varchar NOT NULL,
                "entryFee" integer NOT NULL DEFAULT 0,
                "maxPlayers" integer NOT NULL DEFAULT 4,
                "status" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "twoPlayers" jsonb DEFAULT '{"first": {"type": "winningAmount", "amount": 100}, "second": {"type": "winningAmount", "amount": 0}}',
                "threePlayers" jsonb DEFAULT '{"first": {"type": "winningAmount", "amount": 80}, "second": {"type": "winningAmount", "amount": 20}, "third": {"type": "winningAmount", "amount": 0}}',
                "fourPlayers" jsonb DEFAULT '{"first": {"type": "winningAmount", "amount": 70}, "second": {"type": "winningAmount", "amount": 20}, "third": {"type": "winningAmount", "amount": 10}, "fourth": {"type": "winningAmount", "amount": 0}}'
            )
        `);

        // Create trigger for updatedAt
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_game_types_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW."updatedAt" = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            DROP TRIGGER IF EXISTS update_game_types_updated_at ON "game_types";
            CREATE TRIGGER update_game_types_updated_at
                BEFORE UPDATE ON "game_types"
                FOR EACH ROW
                EXECUTE FUNCTION update_game_types_updated_at_column();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS "game_types";
            DROP TRIGGER IF EXISTS update_game_types_updated_at ON "game_types";
            DROP FUNCTION IF EXISTS update_game_types_updated_at_column();
        `);
    }
}