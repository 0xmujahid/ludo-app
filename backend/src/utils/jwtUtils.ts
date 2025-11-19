import * as jwt from "jsonwebtoken";
import { UserRole } from "../entities/User";

const JWT_SECRET = process.env.JWT_SECRET;

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

export const sign = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1d",
    audience: "ludo-game-api",
    issuer: "ludo-auth-service",
  });
};

export const verify = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
