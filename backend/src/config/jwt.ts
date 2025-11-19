// @ts-nocheck
require("dotenv").config();
import {
  sign as jwtSign,
  verify as jwtVerify,
  SignOptions,
  VerifyOptions,
  JwtPayload,
} from "jsonwebtoken";
import { logger } from "../utils/logger";
import { UserRole } from "../entities/User";

interface JWTConfig {
  accessToken: {
    secret: string;
    expiresIn: string;
    algorithm: "HS256" | "HS384" | "HS512";
  };
}

// Load and validate JWT secrets from environment variables
const JWT_CONFIG: JWTConfig = {
  accessToken: {
    secret: process.env.JWT_SECRET || "",
    expiresIn: "1d",
    algorithm: "HS256",
  },
};

// Validate JWT configuration
if (!JWT_CONFIG.accessToken.secret) {
  logger.error("JWT secrets must be configured in environment variables");
  throw new Error("JWT secrets must be configured in environment variables");
}

if (JWT_CONFIG.accessToken.secret.length < 32) {
  logger.error("JWT secrets must be at least 32 characters long");
  throw new Error("JWT secrets must be at least 32 characters long");
}

export interface TokenPayload {
  userId: string;
  role: UserRole;
  sessionId?: string;
}

export const signAccessToken = (payload: TokenPayload): string => {
  try {
    const options: SignOptions = {
      expiresIn: JWT_CONFIG.accessToken.expiresIn,
      algorithm: JWT_CONFIG.accessToken.algorithm,
      notBefore: 0, // Token is valid immediately
      audience: "ludo-game-api",
      issuer: "ludo-auth-service",
    };
    return jwtSign(payload, JWT_CONFIG.accessToken.secret, options);
  } catch (error) {
    logger.error("JWT Access Token Signing Failed:", error);
    throw new Error("Failed to generate access token");
  }
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const options: VerifyOptions = {
      algorithms: [JWT_CONFIG.accessToken.algorithm],
      audience: "ludo-game-api",
      issuer: "ludo-auth-service",
    };

    const decoded = jwtVerify(
      token,
      JWT_CONFIG.accessToken.secret,
      options
    ) as JwtPayload & TokenPayload;

    if (!decoded.userId || !decoded.role) {
      throw new Error("Invalid token payload");
    }
    return decoded;
  } catch (error) {
    logger.error("JWT Access Token Verification Failed:", error);
    throw error;
  }
};
