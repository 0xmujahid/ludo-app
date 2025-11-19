import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";

import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import gameRoutes from "./routes/gameRoutes";
import tournamentRoutes from "./routes/tournamentRoutes";
import walletRoutes from "./routes/walletRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import chatRoutes from "./routes/chatRoutes";
import adminRoutes from "./routes/adminRoutes";
import adminPaymentRoutes from "./routes/adminPaymentRoutes";
import leaderboardRoutes from "./routes/leaderboardRoutes";
import cryptoRoutes from "./routes/cryptoRoutes";
import { errorHandler } from "./middlewares/errorMiddleware";
import { sanitizeInputs } from "./middlewares/sanitizationMiddleware";
import {
  authLimiter,
  apiLimiter,
  gameActionsLimiter,
  walletLimiter,
  tournamentLimiter,
} from "./middlewares/rateLimitMiddleware";
import { logger } from "./utils/logger";
import { connectDatabase, isDatabaseHealthy } from "./config/database";

import gameRoomRoutes from "./routes/gameRoomRoutes";
import gameTypeRoutes from "./routes/gameTypeRoutes";

// Load environment variables
dotenv.config({ path: ".env.prod" });

// Initialize express app
const app = express();

// Setup CORS configuration with fallback
const corsOrigin = process.env.CORS_ORIGIN || "*";

// Configure CORS for the app

app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
    
  })
);

// Apply security middleware
app.use(helmet());

// Apply body parsing middleware with limits
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Apply input sanitization
app.use(sanitizeInputs);

// Apply rate limiting
app.use("/api", apiLimiter);

app.set("trust proxy", 1);

// Initialize services and database connection
const initializeApp = async (): Promise<boolean> => {
  try {
    logger.info("Step 1: Establishing database connection...");
    const dataSource = await connectDatabase();

    if (!dataSource.isInitialized) {
      throw new Error("Failed to initialize database connection");
    }

    // Verify database health with retries
    let isHealthy = false;
    const maxRetries = 3;
    let retryCount = 0;

    while (!isHealthy && retryCount < maxRetries) {
      isHealthy = await isDatabaseHealthy();
      if (!isHealthy) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(
            "Database health check failed after multiple attempts"
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    logger.info("Database connection established and verified successfully");

    logger.info("Step 2: Initializing application components...");

    // Initialize required services
    const services = [
      { name: "KYC Service", path: "./services/kycService", required: true },
      {
        name: "Game Room Service",
        path: "./services/gameRoomService",
        required: true,
      },
      {
        name: "Wallet Service",
        path: "./services/walletService",
        required: true,
      },
      { name: "Game Service", path: "./services/gameService", required: true },
    ];

    for (const service of services) {
      try {
        logger.info(`Initializing ${service.name}...`);
        const serviceModule = await import(service.path);

        if (!serviceModule) {
          throw new Error(`Failed to load service module: ${service.path}`);
        }

        if (typeof serviceModule.initialize === "function") {
          await serviceModule.initialize();
        } else if (serviceModule.default?.initialize) {
          await serviceModule.default.initialize();
        }

        logger.info(`Successfully initialized ${service.name}`);
      } catch (error) {
        const errorMessage = `Failed to initialize ${service.name}`;
        logger.error(errorMessage, {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          service: service.name,
        });

        if (service.required) {
          throw new Error(errorMessage);
        }

        logger.warn(
          `Non-critical service ${service.name} failed to initialize, continuing...`
        );
      }
    }

    // Mount routes only after services are initialized
    app.get("/health", async (req, res) => {
      const dbHealthy = await isDatabaseHealthy();
      res.json({
        status: dbHealthy ? "healthy" : "degraded",
        database: dbHealthy ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
      });
    });

    app.get("/", (req, res) => {
      res.json({ message: "Ludo Game API is running" });
    });

    // Version API endpoint - no authentication required
    app.get("/api/version", (req, res) => {
      res.json({
        version: process.env.APP_VERSION || "0.1",
        date: process.env.APP_DATE || new Date().toISOString(),
      });
    });

    // Mount routes with rate limiting where appropriate
    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/games", gameRoutes);
    app.use("/api/rooms", gameRoomRoutes);
    app.use("/api/game-types", gameTypeRoutes);
    app.use("/api/tournaments", tournamentRoutes);
    app.use("/api/wallet", walletRoutes);
    app.use("/api/payments", paymentRoutes);
    app.use("/api/chat", chatRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/admin/payments", adminPaymentRoutes);
    app.use("/api/leaderboard", leaderboardRoutes);
    app.use("/api/crypto", cryptoRoutes);

    // Apply specific rate limiters
    app.use("/api/auth/verify", authLimiter);
    app.use("/api/auth/request-otp", authLimiter);
    app.use("/api/auth/register", authLimiter);
    app.use("/api/games/:gameId/(roll|move)", gameActionsLimiter);
    app.use("/api/wallet", walletLimiter);
    app.use("/api/tournaments", tournamentLimiter);

    // Error handling middleware should be last
    app.use(errorHandler);

    logger.info("Application components initialized successfully");
    return true;
  } catch (error) {
    logger.error("Application initialization failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export { app, initializeApp };
