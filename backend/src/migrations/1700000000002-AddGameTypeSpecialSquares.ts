import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGameTypeSpecialSquares1700000000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add specialSquares column to game_types table
        await queryRunner.query(`
            ALTER TABLE "game_types"
            ADD COLUMN IF NOT EXISTS "specialSquares" jsonb DEFAULT '{
                "67": {"type": "safe"},
                "4": {"type": "safe"},
                "24": {"type": "safe"},
                "51": {"type": "safe"},
                "19": {"type": "safe"},
                "35": {"type": "safe"},
                "56": {"type": "safe"},
                "38": {"type": "safe"},
                "15": {"type": "kill", "points": 15},
                "30": {"type": "kill", "points": 15},
                "45": {"type": "kill", "points": 15}
            }'::jsonb
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "game_types"
            DROP COLUMN IF EXISTS "specialSquares"
        `);
    }
}