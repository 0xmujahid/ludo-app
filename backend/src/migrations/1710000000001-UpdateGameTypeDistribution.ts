import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateGameTypeDistribution1710000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new columns with default values
        await queryRunner.query(`
            ALTER TABLE "game_types"
            ADD COLUMN IF NOT EXISTS "twoPlayers" jsonb DEFAULT '{"first": {"type": "winningAmount", "amount": 100}, "second": {"type": "winningAmount", "amount": 0}}',
            ADD COLUMN IF NOT EXISTS "threePlayers" jsonb DEFAULT '{"first": {"type": "winningAmount", "amount": 80}, "second": {"type": "winningAmount", "amount": 20}, "third": {"type": "winningAmount", "amount": 0}}',
            ADD COLUMN IF NOT EXISTS "fourPlayers" jsonb DEFAULT '{"first": {"type": "winningAmount", "amount": 70}, "second": {"type": "winningAmount", "amount": 20}, "third": {"type": "winningAmount", "amount": 10}, "fourth": {"type": "winningAmount", "amount": 0}}'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove new columns
        await queryRunner.query(`
            ALTER TABLE "game_types"
            DROP COLUMN IF EXISTS "twoPlayers",
            DROP COLUMN IF EXISTS "threePlayers",
            DROP COLUMN IF EXISTS "fourPlayers"
        `);
    }
} 