import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "../config/jwt";
import { AuthenticatedRequest } from "../types/common";
import { User, UserRole } from "../entities/User";
import { AppDataSource } from "../config/database";
import { logger } from "../utils/logger";
import { sanitizeString } from "../utils/sanitizationUtils";
import * as sessionService from "../services/sessionService";

export { authorizeAdmin as isAdmin };

const TOKEN_ERRORS = {
  NO_TOKEN: "Authentication token is required",
  INVALID_FORMAT: "Invalid token format. Use Bearer <token>",
  EXPIRED: "Authentication token has expired",
  INVALID: "Invalid authentication token",
  USER_NOT_FOUND: "User not found",
  UNVERIFIED: "Account not verified. Please verify your account",
  SESSION_INVALID: "Session has expired. Please login again",
  INTERNAL_ERROR: "An error occurred during authentication",
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract and validate Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        status: "error",
        message: TOKEN_ERRORS.NO_TOKEN,
      });
      return;
    }

    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        status: "error",
        message: TOKEN_ERRORS.INVALID_FORMAT,
      });
      return;
    }

    const token = authHeader.split(" ")[1];
  
    if (!token) {
      res.status(401).json({
        status: "error",
        message: TOKEN_ERRORS.INVALID_FORMAT,
      });
      return;
    }

    // Verify JWT token
    const decoded: TokenPayload = verifyAccessToken(token);

    // Fetch and validate user
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId },
      select: [
        "id",
        "username",
        "phoneNumber",
        "role",
        "isVerified",
        "createdAt",
      ], // Explicitly select fields
    });

    if (!user) {
      logger.warn(`Authentication failed: User ${decoded.userId} not found`);
      res.status(401).json({
        status: "error",
        message: TOKEN_ERRORS.USER_NOT_FOUND,
      });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({
        status: "error",
        message: TOKEN_ERRORS.UNVERIFIED,
      });
      return;
    }

    // Validate session
    if (decoded.sessionId) {
      const session = await sessionService.validateSession(decoded.sessionId);
      if (!session) {
        res.status(401).json({
          status: "error",
          message: TOKEN_ERRORS.SESSION_INVALID,
        });
        return;
      }
    }

    // Set user in request object
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    logger.error("Authentication error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error) {
      switch (error.name) {
        case "TokenExpiredError":
          res.status(401).json({
            status: "error",
            message: TOKEN_ERRORS.EXPIRED,
          });
          return;
        case "JsonWebTokenError":
          res.status(401).json({
            status: "error",
            message: TOKEN_ERRORS.INVALID,
          });
          return;
        default:
          res.status(401).json({
            status: "error",
            message: TOKEN_ERRORS.INTERNAL_ERROR,
          });
          return;
      }
    }

    res.status(500).json({
      status: "error",
      message: TOKEN_ERRORS.INTERNAL_ERROR,
    });
    return;
  }
};

export const authorizePlayer = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role === UserRole.PLAYER) {
      next();
    } else {
      res
        .status(403)
        .json({ message: "Access denied. Player privileges required." });
    }
  } catch (error) {
    logger.error("Player authorization error:", error);
    res.status(500).json({ message: "Authorization failed" });
  }
};

export const authorizeAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role === UserRole.ADMIN) {
      next();
    } else {
      res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }
  } catch (error) {
    logger.error("Admin authorization error:", error);
    res.status(500).json({ message: "Authorization failed" });
  }
};

export const validateToken = (token: string): TokenPayload | null => {
  try {
    return verifyAccessToken(token);
  } catch (error) {
    logger.error("Token validation error:", error);
    return null;
  }
};
