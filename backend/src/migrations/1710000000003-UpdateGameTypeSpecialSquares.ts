import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateGameTypeSpecialSquares1710000000003 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Ensure the column exists without overwriting anything
        // Ensure the column exists, then update specialSquares for all game types
        await queryRunner.query(`
            ALTER TABLE "game_types"
            ADD COLUMN IF NOT EXISTS "specialSquares" JSONB DEFAULT '{}'::jsonb;
        `);

        await queryRunner.query(`
            UPDATE "game_types"
            SET "specialSquares" = ('{
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
            }')::jsonb
            WHERE "specialSquares" IS NULL OR "specialSquares" = '{}'::jsonb;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert to a safe default for empty entries only
        await queryRunner.query(`
            UPDATE "game_types"
            SET "specialSquares" = '{
                "1": {"type": "safe"},
                "9": {"type": "safe"},
                "14": {"type": "safe"},
                "22": {"type": "safe"},
                "27": {"type": "safe"},
                "35": {"type": "safe"},
                "40": {"type": "safe"},
                "48": {"type": "safe"},
                "57": {"type": "home"}
            }'::jsonb
            WHERE "specialSquares" IS NULL OR "specialSquares" = '{}'::jsonb;
        `);
    }
} 