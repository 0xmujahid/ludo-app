import { DataSource } from "typeorm";
import { logger } from "../utils/logger";
import {
  checkAndCreateTables,
  checkDatabaseHealth,
} from "../services/databaseService";

// Entity imports remain unchanged
import { Config } from "../entities/Config";
import { User } from "../entities/User";
import { Wallet } from "../entities/Wallet";
import { Transaction } from "../entities/Transaction";
import { Game } from "../entities/Game";
import { Tournament } from "../entities/Tournament";
import { TournamentParticipants } from "../entities/TournamentParticipants";
import { Tournaments } from "../entities/Tournaments";
import { GameSessions } from "../entities/GameSessions";
import { GamePlayers } from "../entities/GamePlayers";
import { GameType } from "../entities/GameType";
import { PaymentMethodConfig } from "../entities/PaymentMethodConfig";
import { PaymentAuditLog } from "../entities/PaymentAuditLog";
import { Sessions } from "../entities/Sessions";
import { KYC } from "../entities/KYC";
import { Leaderboards } from "../entities/Leaderboards";
import { UserStats } from "../entities/UserStats";
import { CryptoTransaction } from "../entities/CryptoTransaction";
import { ConversionRate } from "../entities/ConversionRate";

// Define entities used in the application
const entities = [
  Config,
  User,
  Wallet,
  Transaction,
  Game,
  Tournament,
  Tournaments,
  TournamentParticipants,
  GameSessions,
  GamePlayers,
  GameType,
  PaymentMethodConfig,
  PaymentAuditLog,
  Sessions,
  KYC,
  Leaderboards,
  UserStats,
  CryptoTransaction,
  ConversionRate,
];

// Create and configure the DataSource with improved error handling and connection pooling
export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.PGPORT || "5432", 10),
  username: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  entities,
  migrations: ["dist/migrations/*.js"],
  migrationsRun: true,
  migrationsTableName: "migrations",
    synchronize: false, // Disabled: use migrations for schema changes to avoid destructive sync
  logging: true, // Log all queries for debugging
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false,
  } : false,
  extra: {
    max: 30,
    min: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 60000,
    application_name: "ludo_game_backend",
    error: (err: any) => {
      logger.error("Unexpected error on idle client", err);
    },
  },
  connectTimeoutMS: 10000,
  maxQueryExecutionTime: 5000,
  poolSize: 30,
});

let dataSourceInstance: DataSource | null = null;
let isInitializing = false;
let initializationPromise: Promise<DataSource> | null = null;

// Circuit breaker state
interface CircuitBreakerState {
  isOpen: boolean;
  failures: number;
  lastFailureTime: number;
  openedAt: number;
}

const circuitBreaker: CircuitBreakerState = {
  isOpen: false,
  failures: 0,
  lastFailureTime: 0,
  openedAt: 0,
};

const CIRCUIT_BREAKER_CONFIG = {
  maxFailures: 5, // Open circuit after 5 consecutive failures
  timeout: 60000, // Keep circuit open for 60 seconds
  resetTimeout: 300000, // Reset failure count after 5 minutes of success
};

// Circuit breaker functions
const checkCircuitBreaker = (): void => {
  const now = Date.now();
  
  // If circuit is open, check if timeout has passed
  if (circuitBreaker.isOpen) {
    if (now - circuitBreaker.openedAt > CIRCUIT_BREAKER_CONFIG.timeout) {
      logger.info("Circuit breaker timeout expired, attempting to close circuit");
      circuitBreaker.isOpen = false;
      circuitBreaker.failures = 0;
    } else {
      const timeRemaining = Math.ceil((CIRCUIT_BREAKER_CONFIG.timeout - (now - circuitBreaker.openedAt)) / 1000);
      throw new Error(`Database circuit breaker is open. Retry in ${timeRemaining} seconds to prevent resource exhaustion.`);
    }
  }
};

const recordFailure = (): void => {
  const now = Date.now();
  circuitBreaker.failures++;
  circuitBreaker.lastFailureTime = now;
  
  if (circuitBreaker.failures >= CIRCUIT_BREAKER_CONFIG.maxFailures) {
    circuitBreaker.isOpen = true;
    circuitBreaker.openedAt = now;
    logger.error(`Database circuit breaker opened after ${circuitBreaker.failures} failures. Service will be unavailable for ${CIRCUIT_BREAKER_CONFIG.timeout / 1000} seconds.`);
  }
};

const recordSuccess = (): void => {
  const now = Date.now();
  
  // Reset failure count if enough time has passed
  if (now - circuitBreaker.lastFailureTime > CIRCUIT_BREAKER_CONFIG.resetTimeout) {
    circuitBreaker.failures = 0;
  }
  
  circuitBreaker.isOpen = false;
};

export const connectDatabase = async (): Promise<DataSource> => {
  // Check circuit breaker first
  try {
    checkCircuitBreaker();
  } catch (error) {
    logger.warn("Database connection blocked by circuit breaker:", error instanceof Error ? error.message : "Unknown error");
    throw error;
  }

  if (dataSourceInstance?.isInitialized) {
    recordSuccess();
    return dataSourceInstance;
  }

  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  isInitializing = true;
  initializationPromise = (async () => {
    const maxRetries = 3; // Reduced retries since circuit breaker handles failures
    let retryCount = 0;
    const baseDelay = 2000;

    while (retryCount < maxRetries) {
      try {
        logger.info("Starting database connection initialization", {
          attempt: retryCount + 1,
          maxRetries,
        });

        if (!AppDataSource.isInitialized) {
          await AppDataSource.initialize();
        }

        // Verify connection with multiple test queries
        await Promise.all([
          AppDataSource.query("SELECT 1"),
          AppDataSource.query("SELECT current_timestamp"),
          AppDataSource.query("SELECT version()"),
        ]);

        logger.info("Database connection verified successfully");

        // Check if tables exist and are accessible
        const tablesExist = await verifyTables();
        if (!tablesExist) {
          await checkAndCreateTables();
        }
        logger.info("Database tables verified successfully");

        // Final health check
        const isHealthy = await checkDatabaseHealth(
          AppDataSource.createQueryRunner()
        );
        if (!isHealthy) {
          throw new Error("Database health check failed after initialization");
        }

        dataSourceInstance = AppDataSource;
        logger.info("Database connection fully initialized and healthy");

        // Record success for circuit breaker
        recordSuccess();
        isInitializing = false;
        return dataSourceInstance;
      } catch (error) {
        retryCount++;
        const delay = Math.min(baseDelay * Math.pow(2, retryCount), 10000);

        // Record failure for circuit breaker
        recordFailure();

        logger.error("Database connection attempt failed:", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          attempt: retryCount,
          maxRetries,
          nextRetry:
            retryCount < maxRetries ? `in ${delay}ms` : "no more retries",
          circuitBreakerFailures: circuitBreaker.failures,
          circuitBreakerOpen: circuitBreaker.isOpen,
        });

        if (retryCount >= maxRetries) {
          isInitializing = false;
          initializationPromise = null;
          
          // Log final failure message
          logger.error(`Database connection failed after ${maxRetries} attempts. Circuit breaker will prevent further attempts for ${CIRCUIT_BREAKER_CONFIG.timeout / 1000} seconds.`);
          
          throw new Error(
            `Failed to connect to database after ${maxRetries} attempts. Service temporarily unavailable.`
          );
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    isInitializing = false;
    initializationPromise = null;
    throw new Error("Failed to initialize database connection");
  })();

  return initializationPromise;
};

// Export circuit breaker status for monitoring
export const getCircuitBreakerStatus = () => ({
  isOpen: circuitBreaker.isOpen,
  failures: circuitBreaker.failures,
  lastFailureTime: circuitBreaker.lastFailureTime,
  openedAt: circuitBreaker.openedAt,
  timeUntilReset: circuitBreaker.isOpen 
    ? Math.max(0, CIRCUIT_BREAKER_CONFIG.timeout - (Date.now() - circuitBreaker.openedAt))
    : 0,
});

// Force reset circuit breaker (for admin/debugging purposes)
export const resetCircuitBreaker = () => {
  circuitBreaker.isOpen = false;
  circuitBreaker.failures = 0;
  circuitBreaker.lastFailureTime = 0;
  circuitBreaker.openedAt = 0;
  logger.info("Circuit breaker manually reset");
};

async function verifyTables(): Promise<boolean> {
  try {
    const requiredTables = ["users", "wallets", "transactions", "games"];
    for (const table of requiredTables) {
      const result = await AppDataSource.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `,
        [table]
      );

      if (!result[0].exists) {
        logger.error(`Required table '${table}' does not exist`);
        return false;
      }
    }
    return true;
  } catch (error) {
    logger.error("Error verifying tables:", error);
    return false;
  }
}

export const getDataSource = async (): Promise<DataSource> => {
  try {
    if (!dataSourceInstance?.isInitialized) {
      return connectDatabase();
    }
    return dataSourceInstance;
  } catch (error) {
    logger.error("Error getting data source:", error);
    throw error;
  }
};

export const isDatabaseHealthy = async (): Promise<boolean> => {
  try {
    const dataSource = await getDataSource();
    if (!dataSource?.isInitialized) {
      return false;
    }
    return checkDatabaseHealth(dataSource.createQueryRunner());
  } catch (error) {
    logger.error("Database health check failed:", error);
    return false;
  }
};
