import { MigrationInterface, QueryRunner } from "typeorm";

export class FixProductionSchema1710000000005 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create transaction direction enum if it doesn't exist
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "transaction_direction" AS ENUM('CREDIT', 'DEBIT');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Create transaction category enum if it doesn't exist  
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "transaction_category" AS ENUM(
                    'WALLET_LOAD', 'GATEWAY_DEPOSIT', 'GAME_PRIZE', 'TOURNAMENT_PRIZE', 
                    'REFERRAL_BONUS', 'WELCOME_BONUS', 'CASHBACK_CREDIT', 'DEPOSIT_BONUS', 
                    'LOYALTY_REWARD', 'PROMOTIONAL_BONUS', 'REFUND_CREDIT',
                    'WALLET_WITHDRAWAL', 'GAME_ENTRY_FEE', 'TOURNAMENT_FEE', 'PLATFORM_FEE', 
                    'TDS_DEDUCTION', 'GST_CHARGE', 'PROCESSING_FEE', 'PENALTY_CHARGE', 
                    'REVERSAL_DEBIT', 'MANUAL_ADJUSTMENT', 'SYSTEM_CORRECTION'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Add missing columns to users table
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "avatar" varchar,
            ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true,
            ADD COLUMN IF NOT EXISTS "lastSeen" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        `);

        // Add missing columns to wallets table
        await queryRunner.query(`
            ALTER TABLE "wallets"
            ADD COLUMN IF NOT EXISTS "lockedAmount" decimal(10,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "lifetimeEarnings" decimal(10,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "lifetimeSpent" decimal(10,2) DEFAULT 0
        `);

        // Add transaction categorization columns
        await queryRunner.query(`
            ALTER TABLE "transactions"
            ADD COLUMN IF NOT EXISTS "direction" "transaction_direction",
            ADD COLUMN IF NOT EXISTS "category" "transaction_category",
            ADD COLUMN IF NOT EXISTS "referenceId" varchar,
            ADD COLUMN IF NOT EXISTS "sourceType" varchar,
            ADD COLUMN IF NOT EXISTS "sourceId" varchar,
            ADD COLUMN IF NOT EXISTS "notes" text,
            ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'
        `);

        // Add missing columns to games table
        await queryRunner.query(`
            ALTER TABLE "games"
            ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "gameTypeId" uuid,
            ADD COLUMN IF NOT EXISTS "maxPlayers" integer DEFAULT 4
        `);

        // Add missing columns to game_sessions table
        await queryRunner.query(`
            ALTER TABLE "game_sessions"
            ADD COLUMN IF NOT EXISTS "gameId" uuid,
            ADD COLUMN IF NOT EXISTS "gameState" jsonb DEFAULT '{}'
        `);

        // Add missing columns to game_types table
        await queryRunner.query(`
            ALTER TABLE "game_types"
            ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "maxPlayers" integer DEFAULT 4,
            ADD COLUMN IF NOT EXISTS "entryFee" decimal(10,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "timeLimit" integer DEFAULT 600
        `);

        // Add missing columns to tournaments table
        await queryRunner.query(`
            ALTER TABLE "tournaments"
            ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        `);

        // Add missing columns to tournament_participants table
        await queryRunner.query(`
            ALTER TABLE "tournament_participants"
            ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        `);

        // Add missing columns to kyc table
        await queryRunner.query(`
            ALTER TABLE "kyc"
            ADD COLUMN IF NOT EXISTS "documentType" varchar,
            ADD COLUMN IF NOT EXISTS "documentNumber" varchar
        `);

        // Add missing columns to payment_method_config table
        await queryRunner.query(`
            ALTER TABLE "payment_method_config"
            ADD COLUMN IF NOT EXISTS "minAmount" decimal(10,2) DEFAULT 1,
            ADD COLUMN IF NOT EXISTS "maxAmount" decimal(10,2) DEFAULT 100000
        `);

        // Create user_stats table if it doesn't exist
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "user_stats" (
                "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                "userId" uuid NOT NULL,
                "gamesPlayed" integer DEFAULT 0,
                "gamesWon" integer DEFAULT 0,
                "totalPoints" integer DEFAULT 0,
                "totalKills" integer DEFAULT 0,
                "winRate" decimal(5,2) DEFAULT 0,
                "averagePoints" decimal(10,2) DEFAULT 0,
                "bestStreak" integer DEFAULT 0,
                "currentStreak" integer DEFAULT 0,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create payment_audit_log table if it doesn't exist
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "payment_audit_log" (
                "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                "transactionId" uuid,
                "action" varchar NOT NULL,
                "performedBy" uuid,
                "previousStatus" varchar,
                "newStatus" varchar,
                "reason" text,
                "metadata" jsonb DEFAULT '{}',
                "ipAddress" varchar,
                "userAgent" text,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Handle leaderboards table updates
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leaderboards') THEN
                    CREATE TABLE "leaderboards" (
                        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                        "userId" uuid NOT NULL,
                        "gamesPlayed" integer DEFAULT 0,
                        "gamesWon" integer DEFAULT 0,
                        "totalPoints" integer DEFAULT 0,
                        "totalKills" integer DEFAULT 0,
                        "winRate" decimal(5,2) DEFAULT 0,
                        "rank" integer DEFAULT 0,
                        "seasonId" varchar,
                        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                END IF;
            END $$;
        `);

        // Add missing columns to existing leaderboards table if it exists
        await queryRunner.query(`
            ALTER TABLE "leaderboards"
            ADD COLUMN IF NOT EXISTS "gamesPlayed" integer DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "gamesWon" integer DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "totalPoints" integer DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        `);

        // Update sessions table columns
        await queryRunner.query(`
            ALTER TABLE "sessions"
            ADD COLUMN IF NOT EXISTS "sid" varchar,
            ADD COLUMN IF NOT EXISTS "sess" jsonb,
            ADD COLUMN IF NOT EXISTS "expire" TIMESTAMP WITH TIME ZONE
        `);

        // Add update triggers for timestamp columns
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW."updatedAt" = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        // Create triggers for updatedAt columns
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS update_users_updated_at ON "users";
            CREATE TRIGGER update_users_updated_at
                BEFORE UPDATE ON "users"
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);

        await queryRunner.query(`
            DROP TRIGGER IF EXISTS update_game_types_updated_at ON "game_types";
            CREATE TRIGGER update_game_types_updated_at
                BEFORE UPDATE ON "game_types"
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);

        await queryRunner.query(`
            DROP TRIGGER IF EXISTS update_tournaments_updated_at ON "tournaments";
            CREATE TRIGGER update_tournaments_updated_at
                BEFORE UPDATE ON "tournaments"
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);

        await queryRunner.query(`
            DROP TRIGGER IF EXISTS update_tournament_participants_updated_at ON "tournament_participants";
            CREATE TRIGGER update_tournament_participants_updated_at
                BEFORE UPDATE ON "tournament_participants"
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);

        await queryRunner.query(`
            DROP TRIGGER IF EXISTS update_user_stats_updated_at ON "user_stats";
            CREATE TRIGGER update_user_stats_updated_at
                BEFORE UPDATE ON "user_stats"
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);

        await queryRunner.query(`
            DROP TRIGGER IF EXISTS update_leaderboards_updated_at ON "leaderboards";
            CREATE TRIGGER update_leaderboards_updated_at
                BEFORE UPDATE ON "leaderboards"
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove added columns in reverse order
        await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN IF EXISTS "updatedAt",
            DROP COLUMN IF EXISTS "avatar",
            DROP COLUMN IF EXISTS "isActive",
            DROP COLUMN IF EXISTS "lastSeen"
        `);

        await queryRunner.query(`
            ALTER TABLE "wallets"
            DROP COLUMN IF EXISTS "lockedAmount",
            DROP COLUMN IF EXISTS "lifetimeEarnings",
            DROP COLUMN IF EXISTS "lifetimeSpent"
        `);

        await queryRunner.query(`
            ALTER TABLE "transactions"
            DROP COLUMN IF EXISTS "direction",
            DROP COLUMN IF EXISTS "category",
            DROP COLUMN IF EXISTS "referenceId",
            DROP COLUMN IF EXISTS "sourceType",
            DROP COLUMN IF EXISTS "sourceId",
            DROP COLUMN IF EXISTS "notes",
            DROP COLUMN IF EXISTS "metadata"
        `);

        // Drop created tables
        await queryRunner.query(`DROP TABLE IF EXISTS "payment_audit_log"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user_stats"`);

        // Drop custom types
        await queryRunner.query(`DROP TYPE IF EXISTS "transaction_direction"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "transaction_category"`);
    }
}