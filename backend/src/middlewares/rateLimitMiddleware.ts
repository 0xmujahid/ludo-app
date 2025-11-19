import rateLimit from "express-rate-limit";
import { logger } from "../utils/logger";

// Helper function to log rate limit hits
const logRateLimitHit = (req: any) => {
  logger.warn("Rate limit exceeded:", {
    ip: req.ip,
    path: req.path,
    userId: req.user?.id || "anonymous",
  });
};

// Authentication rate limiter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 5 login/register attempts per window
  message: "Too many authentication attempts, please try again later",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logRateLimitHit(req);
    res.status(429).json({
      message: "Too many authentication attempts, please try again later",
      retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
    });
  },
});

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logRateLimitHit(req);
    res.status(429).json({
      message: "Too many requests, please try again later",
      retryAfter: 60, // 1 minute in seconds
    });
  },
});

// Game actions rate limiter (for actions like dice rolls and moves)
export const gameActionsLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 5, // Limit each IP to 5 game actions per 10 seconds
  message: "Too many game actions, please wait",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logRateLimitHit(req);
    res.status(429).json({
      message: "Too many game actions, please wait",
      retryAfter: 10, // 10 seconds
    });
  },
});

// Wallet operations rate limiter
export const walletLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 wallet operations per hour
  message: "Too many wallet operations, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logRateLimitHit(req);
    res.status(429).json({
      message: "Too many wallet operations, please try again later",
      retryAfter: Math.ceil(60 * 60), // 1 hour in seconds
    });
  },
});

// Tournament operations rate limiter
export const tournamentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit each IP to 20 tournament operations per 5 minutes
  message: "Too many tournament operations, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logRateLimitHit(req);
    res.status(429).json({
      message: "Too many tournament operations, please try again later",
      retryAfter: Math.ceil(5 * 60), // 5 minutes in seconds
    });
  },
});
