import Redis from "ioredis";
import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config({ path: ".env.prod" });

export interface RedisConfig {
  host: string;
  port: number;
  username?: string; // <-- add this line
  password?: string;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  maxRetriesPerRequest: number;
  connectTimeout: number;
  commandTimeout: number;
}

// Allow turning TLS on/off via env var for local development.
const useTls = String(process.env.REDIS_TLS || "false").toLowerCase() === "true";

let redisConfig: RedisConfig & { tls?: {} } = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  username: process.env.REDIS_USERNAME || undefined, // <-- Add username here
  password: process.env.REDIS_PASSWORD || undefined, // <-- no password
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

if (useTls) {
  redisConfig.tls = {
    rejectUnauthorized: false,
    servername: process.env.REDIS_HOST,
  };
}

class RedisClient {
  private static instance: RedisClient;
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private isConnected: boolean = false;

  private constructor() {
    this.client = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);
    this.setupEventHandlers();
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  private setupEventHandlers(): void {
    this.client.on("connect", () => {
      logger.info("Redis client connected");
      this.isConnected = true;
    });

    this.client.on("error", (error) => {
      logger.error("Redis client error:", error);
      this.isConnected = false;
    });

    this.client.on("close", () => {
      logger.warn("Redis client connection closed");
      this.isConnected = false;
    });

    this.subscriber.on("connect", () => {
      logger.info("Redis subscriber connected");
    });

    this.publisher.on("connect", () => {
      logger.info("Redis publisher connected");
    });
  }

  public async connect(): Promise<void> {
    try {
      await Promise.all([
        this.client.ping(),
        this.subscriber.ping(),
        this.publisher.ping(),
      ]);
      this.isConnected = true;
      logger.info("All Redis connections established successfully");
    } catch (error) {
      logger.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  public getClient(): Redis {
    return this.client;
  }

  public getSubscriber(): Redis {
    return this.subscriber;
  }

  public getPublisher(): Redis {
    return this.publisher;
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }

  public async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.client.quit(),
        this.subscriber.quit(),
        this.publisher.quit(),
      ]);
      logger.info("Redis connections closed");
    } catch (error) {
      logger.error("Error closing Redis connections:", error);
    }
  }

  // Utility methods for common operations
  public async set(
    key: string,
    value: string | object,
    ttl?: number
  ): Promise<void> {
    try {
      const serializedValue =
        typeof value === "string" ? value : JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      logger.error(`Error setting Redis key ${key}:`, error);
      throw error;
    }
  }

  public async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Error getting Redis key ${key}:`, error);
      throw error;
    }
  }

  public async getObject<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Error getting Redis object ${key}:`, error);
      throw error;
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Error deleting Redis key ${key}:`, error);
      throw error;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking Redis key existence ${key}:`, error);
      throw error;
    }
  }

  public async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      logger.error(`Error setting Redis key expiration ${key}:`, error);
      throw error;
    }
  }

  public async hset(
    key: string,
    field: string,
    value: string | object
  ): Promise<void> {
    try {
      const serializedValue =
        typeof value === "string" ? value : JSON.stringify(value);
      await this.client.hset(key, field, serializedValue);
    } catch (error) {
      logger.error(`Error setting Redis hash ${key}:${field}:`, error);
      throw error;
    }
  }

  public async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      logger.error(`Error getting Redis hash ${key}:${field}:`, error);
      throw error;
    }
  }

  public async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      logger.error(`Error getting Redis hash ${key}:`, error);
      throw error;
    }
  }

  public async hdel(key: string, field: string): Promise<void> {
    try {
      await this.client.hdel(key, field);
    } catch (error) {
      logger.error(`Error deleting Redis hash field ${key}:${field}:`, error);
      throw error;
    }
  }

  public async lpush(key: string, value: string | object): Promise<void> {
    try {
      const serializedValue =
        typeof value === "string" ? value : JSON.stringify(value);
      await this.client.lpush(key, serializedValue);
    } catch (error) {
      logger.error(`Error pushing to Redis list ${key}:`, error);
      throw error;
    }
  }

  public async rpop(key: string): Promise<string | null> {
    try {
      return await this.client.rpop(key);
    } catch (error) {
      logger.error(`Error popping from Redis list ${key}:`, error);
      throw error;
    }
  }

  public async lrange(
    key: string,
    start: number,
    stop: number
  ): Promise<string[]> {
    try {
      return await this.client.lrange(key, start, stop);
    } catch (error) {
      logger.error(`Error getting Redis list range ${key}:`, error);
      throw error;
    }
  }

  public async llen(key: string): Promise<number> {
    try {
      return await this.client.llen(key);
    } catch (error) {
      logger.error(`Error getting Redis list length ${key}:`, error);
      throw error;
    }
  }

  public async zadd(key: string, score: number, member: string): Promise<void> {
    try {
      await this.client.zadd(key, score, member);
    } catch (error) {
      logger.error(`Error adding to Redis sorted set ${key}:`, error);
      throw error;
    }
  }

  public async zrange(
    key: string,
    start: number,
    stop: number,
    withScores = false
  ): Promise<string[]> {
    try {
      if (withScores) {
        return await this.client.zrange(key, start, stop, "WITHSCORES");
      }
      return await this.client.zrange(key, start, stop);
    } catch (error) {
      logger.error(`Error getting Redis sorted set range ${key}:`, error);
      throw error;
    }
  }

  public async zrem(key: string, member: string): Promise<void> {
    try {
      await this.client.zrem(key, member);
    } catch (error) {
      logger.error(`Error removing from Redis sorted set ${key}:`, error);
      throw error;
    }
  }

  public async publish(
    channel: string,
    message: string | object
  ): Promise<void> {
    try {
      const serializedMessage =
        typeof message === "string" ? message : JSON.stringify(message);
      await this.publisher.publish(channel, serializedMessage);
    } catch (error) {
      logger.error(`Error publishing to Redis channel ${channel}:`, error);
      throw error;
    }
  }

  public async subscribe(
    channel: string,
    callback: (message: string) => void
  ): Promise<void> {
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on("message", (receivedChannel, message) => {
        if (receivedChannel === channel) {
          callback(message);
        }
      });
    } catch (error) {
      logger.error(`Error subscribing to Redis channel ${channel}:`, error);
      throw error;
    }
  }
}

export const redisClient = RedisClient.getInstance();
export default redisClient;
