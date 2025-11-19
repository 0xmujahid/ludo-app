import { Server, Socket } from "socket.io";
import { logger } from "./utils/logger";
import jwt from "jsonwebtoken";
import { User } from "./entities/User";
import { getDataSource } from "./config/database";

// Authentication middleware section update
const authMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret"
    ) as { userId: string };

    if (!decoded.userId) {
      return next(new Error("Invalid token format"));
    }

    // Get database connection with retries
    let dataSource = null;
    let retries = 0;
    const maxRetries = 5;
    const baseDelay = 1000;

    while (!dataSource && retries < maxRetries) {
      try {
        // Get DataSource instance
        dataSource = await getDataSource();
        if (!dataSource.isInitialized) {
          throw new Error("DataSource not initialized");
        }
        // Verify connection
        await dataSource.query("SELECT 1");
      } catch (err) {
        retries++;
        logger.warn(`Socket Auth: Database connection attempt ${retries}/${maxRetries} failed:`, {
          error: err instanceof Error ? err.message : "Unknown error",
        });
        if (retries >= maxRetries) throw err;
        await new Promise(resolve => setTimeout(resolve, Math.min(baseDelay * Math.pow(2, retries), 10000)));
      }
    }

    if (!dataSource) {
      throw new Error("Failed to get database connection");
    }

    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId },
    });

    if (!user) {
      return next(new Error("User not found"));
    }

    // Attach user data to socket
    socket.data.user = {
      id: user.id,
      username: user.username,
    };

    next();
  } catch (error) {
    logger.error("Socket authentication error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(new Error("Authentication failed"));
  }
};

export { authMiddleware };