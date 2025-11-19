import dotenv from "dotenv";
dotenv.config({ path: ".env.prod" });

import { app, initializeApp } from "./app";
// or any other imports

import { createServer } from "http";
import { logger } from "./utils/logger";
import {
  connectDatabase,
  getDataSource,
  isDatabaseHealthy,
} from "./config/database";
import SocketService from "./services/socketService";
import { redisClient } from "./config/redis";
import { databaseMigrationService } from "./services/DatabaseMigrationService";
import { databaseHealthService } from "./services/DatabaseHealthService";

const PORT = Number(process.env.PORT) || 3000;

// Initialize Socket Service
let socketService: SocketService;

const startServer = async () => {
  try {
    // Step 0: Initialize Redis connection before anything else
    try {
      await redisClient.connect();
      logger.info("Redis connection established successfully");
    } catch (redisError) {
      logger.error("Failed to connect to Redis:", redisError);
      logger.error("Server startup aborted due to Redis connection failure");
      process.exit(1);
    }

    // Set default environment
    process.env.NODE_ENV = process.env.NODE_ENV || "development";
    logger.info("Starting server initialization...", {
      port: PORT,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });

    // Step 1: Comprehensive Database Initialization and Migration
    logger.info("Step 1: Starting comprehensive database initialization...");
    
    // First establish basic connection with circuit breaker protection
    let dataSource;
    try {
      dataSource = await connectDatabase();
      logger.info("Basic database connection established");
    } catch (dbError) {
      logger.error("Database connection failed:", {
        error: dbError instanceof Error ? dbError.message : "Unknown error",
        stack: dbError instanceof Error ? dbError.stack : undefined,
      });
      
      // Check if this is a circuit breaker error
      if (dbError instanceof Error && dbError.message.includes("circuit breaker")) {
        logger.error("Database circuit breaker is open. Server startup aborted to prevent resource exhaustion.");
        logger.info("Recommendation: Wait for circuit breaker to reset or check database connectivity.");
        process.exit(1);
      }
      
      logger.error("Server startup aborted due to database connection failure");
      process.exit(1);
    }

    // Run comprehensive migration and health check
    let migrationResult;
    try {
      migrationResult = await databaseMigrationService.initializeDatabase();
    } catch (migrationError) {
      logger.error("Database migration failed:", {
        error: migrationError instanceof Error ? migrationError.message : "Unknown error",
        stack: migrationError instanceof Error ? migrationError.stack : undefined,
      });
      
      logger.error("Server startup aborted due to migration failure");
      process.exit(1);
    }
    
    // Log migration summary
    const migrationSummary = databaseMigrationService.generateMigrationSummary(migrationResult);
    logger.info("Database Migration Summary:", migrationSummary);

    if (!migrationResult.success) {
      logger.error("Database initialization failed:", migrationResult.errors);
      
      // Generate backup command for manual intervention
      const backupCommand = databaseMigrationService.generateBackupCommand();
      logger.info("Before manual intervention, backup with:", backupCommand);
      
      logger.error("Server startup aborted due to database initialization failure");
      process.exit(1);
    }

    // Log health report summary
    const healthSummary = databaseHealthService.generateHealthSummary(migrationResult.healthReport);
    logger.info("Database Health Report:", healthSummary);

    logger.info("✓ Database initialization completed successfully");

    // Step 2: Initialize application components sequentially
    logger.info("Step 2: Initializing application components...");
    let app;
    try {
      app = require("./app");
      await app.initializeApp();
      logger.info("Application components initialized successfully");
    } catch (appError) {
      logger.error("Application initialization failed:", {
        error: appError instanceof Error ? appError.message : "Unknown error",
        stack: appError instanceof Error ? appError.stack : undefined,
        phase: "Component Initialization",
      });
      throw appError;
    }

    // Create HTTP server
    const server = createServer(app.app);

    // Step 3: Initialize Socket.IO service with database verification
    logger.info("Step 3: Initializing Socket.IO service...");
    try {
      // Verify database connection again before socket initialization
      const currentDataSource = await getDataSource();
      if (!currentDataSource.isInitialized) {
        throw new Error(
          "Database connection lost before socket initialization",
        );
      }

      socketService = SocketService.getInstance(server);
      logger.info("Socket.IO service initialized successfully");
    } catch (socketError) {
      logger.error("Socket.IO service initialization failed:", {
        error:
          socketError instanceof Error ? socketError.message : "Unknown error",
        stack: socketError instanceof Error ? socketError.stack : undefined,
        phase: "Socket.IO Initialization",
      });
      throw socketError;
    }

    // Step 4: Start HTTP server with explicit host binding and port availability check
    logger.info("Step 4: Starting HTTP server...");
    return new Promise<void>((resolve, reject) => {
      // Add error handler for server errors
      server.on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          logger.error(`Port ${PORT} is already in use`);
          reject(new Error(`Port ${PORT} is already in use`));
        } else {
          logger.error("Server error:", err);
          reject(err);
        }
      });

      server.listen(PORT, "0.0.0.0", () => {
        logger.info(`Server is running on http://0.0.0.0:${PORT}`);
        logger.info("Server initialization completed successfully");
        resolve();
      });
    });
  } catch (error) {
    logger.error("Server startup process failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

// Enhanced error handling for unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Prevent infinite restart loops
let startupAttempts = 0;
const MAX_STARTUP_ATTEMPTS = 3;

const attemptServerStart = async () => {
  startupAttempts++;
  
  if (startupAttempts > MAX_STARTUP_ATTEMPTS) {
    logger.error(`Server startup failed after ${MAX_STARTUP_ATTEMPTS} attempts. Exiting to prevent infinite loops.`);
    logger.info("Recommendations:");
    logger.info("1. Check database connectivity and credentials");
    logger.info("2. Verify Redis server is running and accessible");
    logger.info("3. Ensure all required environment variables are set");
    logger.info("4. Wait for circuit breaker to reset if database is temporarily unavailable");
    process.exit(1);
  }

  try {
    await startServer();
    logger.info("Server started successfully");
    // Reset counter on successful start
    startupAttempts = 0;
  } catch (error) {
    logger.error(`Server startup attempt ${startupAttempts}/${MAX_STARTUP_ATTEMPTS} failed:`, {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Check if this is a circuit breaker or critical error that shouldn't retry
    if (error instanceof Error) {
      if (error.message.includes("circuit breaker") || 
          error.message.includes("Server startup aborted") ||
          error.message.includes("EADDRINUSE")) {
        logger.error("Critical error detected, aborting all retry attempts");
        process.exit(1);
      }
    }
    
    if (startupAttempts < MAX_STARTUP_ATTEMPTS) {
      const retryDelay = Math.min(5000 * startupAttempts, 30000); // Progressive delay
      logger.info(`Retrying server startup in ${retryDelay}ms...`);
      setTimeout(attemptServerStart, retryDelay);
    } else {
      process.exit(1);
    }
  }
};

// Start the server with retry protection
attemptServerStart();

// Export io function with proper type that includes emit method
export const io = (): SocketService & {
  emit: (event: string, data: any) => void;
} => {
  if (!socketService) {
    throw new Error("Socket.IO service not initialized");
  }
  return socketService;
};
