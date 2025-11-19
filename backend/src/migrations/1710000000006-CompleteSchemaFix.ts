import { MigrationInterface, QueryRunner } from "typeorm";

export class CompleteSchemaFix1710000000006 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Fix tournaments table - add missing id column if needed
        await queryRunner.query(`
            DO $$ 
            BEGIN
                -- Check if tournaments table has id column
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'id') THEN
                    -- Add id column if missing
                    ALTER TABLE "tournaments" ADD COLUMN "id" uuid DEFAULT gen_random_uuid();
                    
                    -- If table is empty or we need a primary key, add constraint
                    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                                  WHERE table_name = 'tournaments' AND constraint_type = 'PRIMARY KEY') THEN
                        ALTER TABLE "tournaments" ADD CONSTRAINT "PK_tournaments" PRIMARY KEY ("id");
                    END IF;
                END IF;
            END $$;
        `);

        // Fix leaderboards table - add missing id column if needed
        await queryRunner.query(`
            DO $$ 
            BEGIN
                -- Check if leaderboards table has id column
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leaderboards' AND column_name = 'id') THEN
                    -- Add id column if missing
                    ALTER TABLE "leaderboards" ADD COLUMN "id" uuid DEFAULT gen_random_uuid();
                    
                    -- If table is empty or we need a primary key, add constraint
                    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                                  WHERE table_name = 'leaderboards' AND constraint_type = 'PRIMARY KEY') THEN
                        ALTER TABLE "leaderboards" ADD CONSTRAINT "PK_leaderboards" PRIMARY KEY ("id");
                    END IF;
                END IF;
            END $$;
        `);

        // Fix payment_audit_log table - add missing updatedAt column
        await queryRunner.query(`
            ALTER TABLE "payment_audit_log"
            ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        `);

        // Add comprehensive transaction columns with proper data types
        await queryRunner.query(`
            ALTER TABLE "transactions"
            ADD COLUMN IF NOT EXISTS "fee" decimal(10,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "tax" decimal(10,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "netAmount" decimal(10,2),
            ADD COLUMN IF NOT EXISTS "bankReference" varchar,
            ADD COLUMN IF NOT EXISTS "upiReference" varchar,
            ADD COLUMN IF NOT EXISTS "accountNumber" varchar,
            ADD COLUMN IF NOT EXISTS "ifscCode" varchar,
            ADD COLUMN IF NOT EXISTS "beneficiaryName" varchar,
            ADD COLUMN IF NOT EXISTS "adminNotes" text,
            ADD COLUMN IF NOT EXISTS "userNotes" text,
            ADD COLUMN IF NOT EXISTS "ipAddress" varchar,
            ADD COLUMN IF NOT EXISTS "deviceInfo" jsonb DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS "isReversed" boolean DEFAULT false,
            ADD COLUMN IF NOT EXISTS "reversalReason" text,
            ADD COLUMN IF NOT EXISTS "parentTransactionId" uuid,
            ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP WITH TIME ZONE
        `);

        // Handle approvedBy column separately to ensure correct data type
        await queryRunner.query(`
            DO $$ 
            BEGIN
                -- Check users table id column type
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'users' AND column_name = 'id' AND data_type = 'uuid') THEN
                    -- Add uuid column for approvedBy
                    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "approvedBy" uuid;
                ELSE
                    -- Add varchar column for approvedBy if users.id is varchar
                    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "approvedBy" varchar;
                END IF;
            END $$;
        `);

        // Add enhanced user stats columns
        await queryRunner.query(`
            ALTER TABLE "user_stats"
            ADD COLUMN IF NOT EXISTS "quickGamesPlayed" integer DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "quickGamesWon" integer DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "classicGamesPlayed" integer DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "classicGamesWon" integer DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "rankingPoints" integer DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "preferredVariant" varchar DEFAULT 'CLASSIC'
        `);

        // Add foreign key constraints for transaction references
        await queryRunner.query(`
            DO $$ 
            BEGIN
                -- Add foreign key for parentTransactionId if it doesn't exist
                IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                              WHERE constraint_name = 'FK_transactions_parentTransactionId' AND table_name = 'transactions') THEN
                    ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_parentTransactionId"
                    FOREIGN KEY ("parentTransactionId") REFERENCES "transactions"("id") ON DELETE SET NULL;
                END IF;
                
                -- Add foreign key for approvedBy if it doesn't exist and data types match
                IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                              WHERE constraint_name = 'FK_transactions_approvedBy' AND table_name = 'transactions') THEN
                    -- Check if data types are compatible before adding constraint
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns c1, information_schema.columns c2
                        WHERE c1.table_name = 'transactions' AND c1.column_name = 'approvedBy'
                        AND c2.table_name = 'users' AND c2.column_name = 'id'
                        AND c1.data_type = c2.data_type
                    ) THEN
                        ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_approvedBy"
                        FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL;
                    END IF;
                END IF;
            END $$;
        `);

        // Add update trigger for payment_audit_log
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS update_payment_audit_log_updated_at ON "payment_audit_log";
            CREATE TRIGGER update_payment_audit_log_updated_at
                BEFORE UPDATE ON "payment_audit_log"
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);

        // Create indexes for better performance (only if columns exist)
        await queryRunner.query(`
            DO $$ 
            BEGIN
                -- Create indexes only if columns exist
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'direction') THEN
                    CREATE INDEX IF NOT EXISTS "IDX_transactions_direction" ON "transactions"("direction");
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'category') THEN
                    CREATE INDEX IF NOT EXISTS "IDX_transactions_category" ON "transactions"("category");
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'referenceId') THEN
                    CREATE INDEX IF NOT EXISTS "IDX_transactions_referenceId" ON "transactions"("referenceId");
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'parentTransactionId') THEN
                    CREATE INDEX IF NOT EXISTS "IDX_transactions_parentTransactionId" ON "transactions"("parentTransactionId");
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'userId') THEN
                    CREATE INDEX IF NOT EXISTS "IDX_user_stats_userId" ON "user_stats"("userId");
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'rankingPoints') THEN
                    CREATE INDEX IF NOT EXISTS "IDX_user_stats_rankingPoints" ON "user_stats"("rankingPoints");
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leaderboards' AND column_name = 'userId') THEN
                    CREATE INDEX IF NOT EXISTS "IDX_leaderboards_userId" ON "leaderboards"("userId");
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leaderboards' AND column_name = 'rank') THEN
                    CREATE INDEX IF NOT EXISTS "IDX_leaderboards_rank" ON "leaderboards"("rank");
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_audit_log' AND column_name = 'transactionId') THEN
                    CREATE INDEX IF NOT EXISTS "IDX_payment_audit_log_transactionId" ON "payment_audit_log"("transactionId");
                END IF;
            END $$;
        `);

        // Update netAmount for existing transactions where it's null
        await queryRunner.query(`
            UPDATE "transactions" 
            SET "netAmount" = "amount" - COALESCE("fee", 0) - COALESCE("tax", 0)
            WHERE "netAmount" IS NULL AND "amount" IS NOT NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove added columns
        await queryRunner.query(`
            ALTER TABLE "transactions"
            DROP COLUMN IF EXISTS "fee",
            DROP COLUMN IF EXISTS "tax",
            DROP COLUMN IF EXISTS "netAmount",
            DROP COLUMN IF EXISTS "bankReference",
            DROP COLUMN IF EXISTS "upiReference",
            DROP COLUMN IF EXISTS "accountNumber",
            DROP COLUMN IF EXISTS "ifscCode",
            DROP COLUMN IF EXISTS "beneficiaryName",
            DROP COLUMN IF EXISTS "adminNotes",
            DROP COLUMN IF EXISTS "userNotes",
            DROP COLUMN IF EXISTS "ipAddress",
            DROP COLUMN IF EXISTS "deviceInfo",
            DROP COLUMN IF EXISTS "isReversed",
            DROP COLUMN IF EXISTS "reversalReason",
            DROP COLUMN IF EXISTS "parentTransactionId",
            DROP COLUMN IF EXISTS "processedAt",
            DROP COLUMN IF EXISTS "approvedAt",
            DROP COLUMN IF EXISTS "approvedBy"
        `);

        await queryRunner.query(`
            ALTER TABLE "user_stats"
            DROP COLUMN IF EXISTS "quickGamesPlayed",
            DROP COLUMN IF EXISTS "quickGamesWon",
            DROP COLUMN IF EXISTS "classicGamesPlayed",
            DROP COLUMN IF EXISTS "classicGamesWon",
            DROP COLUMN IF EXISTS "rankingPoints",
            DROP COLUMN IF EXISTS "preferredVariant"
        `);

        await queryRunner.query(`
            ALTER TABLE "payment_audit_log"
            DROP COLUMN IF EXISTS "updatedAt"
        `);

        // Drop indexes
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_transactions_direction";
            DROP INDEX IF EXISTS "IDX_transactions_category";
            DROP INDEX IF EXISTS "IDX_transactions_referenceId";
            DROP INDEX IF EXISTS "IDX_transactions_parentTransactionId";
            DROP INDEX IF EXISTS "IDX_user_stats_userId";
            DROP INDEX IF EXISTS "IDX_user_stats_rankingPoints";
            DROP INDEX IF EXISTS "IDX_leaderboards_userId";
            DROP INDEX IF EXISTS "IDX_leaderboards_rank";
            DROP INDEX IF EXISTS "IDX_payment_audit_log_transactionId";
        `);
    }
}