import { Server, Socket } from "socket.io";
import { logger } from "../utils/logger";
import jwt from "jsonwebtoken";
import { User } from "../entities/User";
import { getDataSource } from "../config/database";
import { Repository, DataSource } from "typeorm";
import { GameStatus, GameVariant, PlayerState, GameColor } from "../types/game";
import {
  handleGameIdentifier,
  isValidUUID,
  logIdentifierResolution,
} from "../utils/uuidValidator";
import { Game } from "../entities/Game";
import { GamePlayers } from "../entities/GamePlayers";
import { enhancedTurnTimeoutService } from "./enhancedTurnTimeoutService";
import { turnTimeoutManager } from "./turnTimeoutManager";
import { redisClient } from "../config/redis";
// Add these imports for Redis adapter
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import * as gameService from "./gameService";

// Add new interface for matchmaking queue
interface QueuedPlayer {
  userId: string;
  socketId: string;
  joinedAt: Date;
  preferences: {
    gameVariant: GameVariant;
    region?: string;
  };
}

interface PlayerDisconnectInfo {
  gameId: string;
  disconnectedAt: Date;
  canReconnect: boolean;
  reconnectionWindow: number; // in milliseconds
}

export enum GameEvents {
  // Connection events
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  RECONNECT = "reconnect",
  ERROR = "error",

  // Room events
  JOIN_ROOM = "joinRoom",
  LEAVE_ROOM = "leaveRoom",
  ROOM_JOINED = "roomJoined",
  ROOM_LEFT = "roomLeft",

  // Game events
  GAME_STATE_UPDATED = "gameStateUpdated",
  GET_GAME_STATE = "getGameState",
  PLAYER_JOINED = "playerJoined",
  PLAYER_LEFT = "playerLeft",
  GAME_STARTED = "gameStarted",
  GAME_STARTING = "gameStarting",
  PLAYER_READY = "playerReady",
  DICE_ROLLED = "diceRolled",
  PIECE_MOVED = "pieceMoved",
  PLAYER_CAPTURED = "playerCaptured",
  TURN_CHANGED = "turnChanged",
  TURN_TIMEOUT = "turnTimeout",
  GAME_COMPLETED = "gameCompleted",
  GAME_STATUS_UPDATED = "gameStatusUpdated",
  PLAYER_FORFEITED = "playerForfeited",
  PLAYER_DISCONNECTED = "playerDisconnected",
  PLAYER_RECONNECTED = "playerReconnected",

  // Chat events
  CHAT_MESSAGE = "chatMessage",
  SYSTEM_MESSAGE = "systemMessage",

  // Matchmaking events
  MATCHMAKING_UPDATE = "matchmakingUpdate",
  QUEUE_POSITION_UPDATE = "queuePositionUpdate",
  LEAVE_MATCHMAKING = "leaveMatchmaking",
}

export interface GameStateUpdatePayload {
  type:
    | "ROOM_CREATED"
    | "GAME_STARTED"
    | "GAME_STARTING"
    | "DICE_ROLLED"
    | "PIECE_MOVED"
    | "TURN_CHANGED"
    | "TURN_TIMEOUT"
    | "PLAYER_CAPTURED"
    | "PLAYER_JOINED"
    | "PLAYER_LEFT"
    | "PLAYER_READY"
    | "GAME_STATUS_UPDATED"
    | "GAME_STATE_UPDATE"
    | "GAME_STATE_SYNC"
    | "PLAYER_FORFEITED"
    | "PLAYER_DISCONNECTED"
    | "PLAYER_RECONNECTED";
  gameId?: string;
  roomCode: string;
  status?: GameStatus;
  countdown?: number;
  player?: {
    id: string;
    position?: number;
    username?: string;
    isReady?: boolean;
    color?: string;
    isActive?: boolean; // Added isActive for reconnection status
  };
  creator?: string;
  maxPlayers?: number;
  variant?: GameVariant;
  diceResult?: number;
  hasValidMoves?: boolean;
  validMoves?: Array<{ pieceId: string; currentPos: number; nextPos: number }>;
  kills?: Array<{ playerId: string; position: number }>;
  timestamp?: Date;
  players?: Record<string, PlayerState>;
  startTime?: Date;
  remainingSlots?: number;
  allPlayersReady?: boolean;
  nextPlayer?: {
    id: string;
    position?: number;
  }; // Added for turn changes after forfeit
  reconnectionTimeout?: number; // Added for disconnect events
  game?: Game;
}

interface TurnChangePayload {
  nextPlayerId: string;
  gameId: string;
}

interface GameCompletedPayload {
  gameId: string;
  winner: {
    id: string;
    position: number;
  };
  finalState: any;
  endTime: Date;
  winningAmounts?: { [playerId: string]: { type: string; amount: number } };
}

interface SystemMessagePayload {
  message: string;
  status: "INFO" | "WARNING" | "ERROR";
  type?:
    | "WAITING"
    | "GAME_STARTING"
    | "GAME_STARTED"
    | "GAME_ENDED"
    | "GAME_RESUMED"
    | "PLAYER_RECONNECTED";
}

interface GameRoom {
  roomCode: string;
  players: Set<string>;
  gameId: string;
}

export interface MatchmakingUpdatePayload {
  type: "JOINED_QUEUE" | "LEFT_QUEUE" | "MATCH_FOUND" | "QUEUE_POSITION_UPDATE";
  userId: string;
  queueStatus?: {
    position: number;
    totalInQueue: number;
    estimatedWaitTime: number;
    matchmakingRegion: string;
    gameVariant: string;
  };
  matchedWith?: string | string[]; // Update to allow both string and string array
  gameId?: string;
  roomCode?: string;
  timestamp: Date;
}

// Redis key helpers
const REDIS_QUEUE_KEY = "matchmaking:queue";
const REDIS_QUEUE_JOIN_TIMES = "matchmaking:joinTimes";
const REDIS_DISCONNECTED_KEY = "game:disconnectedPlayers";

// Helper functions for Redis queue
async function addQueuedPlayerToRedis(player: QueuedPlayer) {
  await redisClient.hset(
    REDIS_QUEUE_KEY,
    player.userId,
    JSON.stringify(player),
  );
  await redisClient.hset(
    REDIS_QUEUE_JOIN_TIMES,
    player.userId,
    Date.now().toString(),
  );
}
async function removeQueuedPlayerFromRedis(userId: string) {
  await redisClient.hdel(REDIS_QUEUE_KEY, userId);
  await redisClient.hdel(REDIS_QUEUE_JOIN_TIMES, userId);
}
async function getQueuedPlayersFromRedis(): Promise<QueuedPlayer[]> {
  const all = await redisClient.hgetall(REDIS_QUEUE_KEY);
  return Object.values(all).map((item) => JSON.parse(item));
}
async function getQueuedPlayerJoinTime(userId: string): Promise<number | null> {
  const time = await redisClient.hget(REDIS_QUEUE_JOIN_TIMES, userId);
  return time ? parseInt(time) : null;
}
// Disconnected players helpers
async function setDisconnectedPlayerRedis(
  userId: string,
  state: PlayerDisconnectInfo,
) {
  await redisClient.hset(REDIS_DISCONNECTED_KEY, userId, JSON.stringify(state));
}
async function getDisconnectedPlayerRedis(
  userId: string,
): Promise<PlayerDisconnectInfo | null> {
  const val = await redisClient.hget(REDIS_DISCONNECTED_KEY, userId);
  return val ? JSON.parse(val) : null;
}
async function removeDisconnectedPlayerRedis(userId: string) {
  await redisClient.hdel(REDIS_DISCONNECTED_KEY, userId);
}

class SocketService {
  private static instance: SocketService;
  private io: Server;
  private rooms: Map<string, GameRoom> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private userRepository: Repository<User> | null = null;
  private dataSource: DataSource | null = null;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private gameRepository: Repository<Game> | null = null;
  private gameStartTimers: Map<string, NodeJS.Timeout> = new Map();

  // Add new properties for matchmaking and disconnection handling
  private readonly RECONNECTION_WINDOW = 60000; // 1 minute to reconnect for active games

  private constructor(server: any) {
    try {
      logger.info("Initializing SocketService...");
      this.io = new Server(server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
          credentials: true,
        },
        transports: ["websocket", "polling"],
        pingTimeout: 10000,
        pingInterval: 5000,
      });

      // --- Redis Adapter Setup ---
      (async () => {
        try {
          const redisUrl =
            process.env.REDIS_URL ||
            "redis://default:TXLwtKbY16qwMNB8mUqLRJgn1OfSoIVO@redis-15499.c12.us-east-1-4.ec2.redns.redis-cloud.com:15499";
          const pubClient = createClient({ url: redisUrl });
          const subClient = pubClient.duplicate();
          await pubClient.connect();
          await subClient.connect();
          this.io.adapter(createAdapter(pubClient, subClient));
          logger.info("Socket.IO Redis adapter initialized successfully");
        } catch (err) {
          logger.error("Failed to initialize Socket.IO Redis adapter:", err);
        }
      })();

      // Initialize database connection and start connection monitoring
      this.initializeDatabaseConnection()
        .then(() => {
          this.startConnectionMonitoring();
          logger.info(
            "Database connection initialized, setting up authentication middleware",
          );

          // Add authentication middleware with database connection handling
          this.io.use(async (socket, next) => {
            try {
              const token = socket.handshake.auth.token;
              logger.debug("Processing socket authentication", {
                socketId: socket.id,
              });

              if (!token) {
                return next(new Error("Authentication token missing"));
              }

              const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || "default_secret",
              ) as any;

              if (!decoded.userId) {
                return next(new Error("Invalid token format"));
              }

              // Ensure database connection and repository
              logger.debug("Ensuring database connection for auth", {
                userId: decoded.userId,
              });
              await this.ensureDatabaseConnection();

              // Get user from database
              const user = await this.userRepository?.findOne({
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
              logger.debug("Socket authentication successful", {
                socketId: socket.id,
                userId: user.id,
              });

              next();
            } catch (error) {
              logger.error("Socket authentication error:", {
                error: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined,
                socketId: socket.id,
              });
              next(new Error("Authentication failed"));
            }
          });

          this.setupSocketHandlers();
          this.initializeTurnTimeoutService();
          logger.info("SocketService initialized successfully");
        })
        .catch((error) => {
          logger.error(
            "Failed to initialize SocketService database connection:",
            {
              error: error instanceof Error ? error.message : "Unknown error",
              stack: error instanceof Error ? error.stack : undefined,
            },
          );
          throw error;
        });
    } catch (error) {
      logger.error("Failed to initialize SocketService:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private startConnectionMonitoring(): void {
    // Check connection every 30 seconds
    this.connectionCheckInterval = setInterval(async () => {
      try {
        await this.checkAndReconnectDatabase();
      } catch (error) {
        logger.error("Error in database connection monitoring:", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }, 30000);
  }

  private async checkAndReconnectDatabase(): Promise<void> {
    try {
      if (!this.dataSource?.isInitialized) {
        logger.warn("Database connection lost, attempting to reconnect...");
        await this.initializeDatabaseConnection();
      }
    } catch (error) {
      logger.error("Failed to reconnect to database:", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async initializeDatabaseConnection(): Promise<void> {
    try {
      logger.info("Starting database connection initialization");
      this.dataSource = await getDataSource();

      if (!this.dataSource.isInitialized) {
        logger.info("Initializing database connection...");
        await this.dataSource.initialize();
      }

      this.userRepository = this.dataSource.getRepository(User);
      this.gameRepository = this.dataSource.getRepository(Game);
      logger.info("Database connection initialized successfully", {
        isInitialized: this.dataSource.isInitialized,
        hasUserRepo: !!this.userRepository,
        hasGameRepo: !!this.gameRepository,
      });
    } catch (error) {
      logger.error(
        "Failed to initialize database connection for socket service:",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      throw error;
    }
  }

  private async ensureDatabaseConnection(): Promise<void> {
    try {
      logger.debug("Checking database connection status", {
        hasDataSource: !!this.dataSource,
        isInitialized: this.dataSource?.isInitialized,
        hasUserRepo: !!this.userRepository,
        hasGameRepo: !!this.gameRepository,
      });

      if (
        !this.dataSource?.isInitialized ||
        !this.userRepository ||
        !this.gameRepository
      ) {
        logger.info(
          "Database connection needs initialization, attempting to initialize...",
        );
        await this.initializeDatabaseConnection();
      }
    } catch (error) {
      logger.error("Failed to ensure database connection:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  public static getInstance(server?: any): SocketService {
    if (!SocketService.instance && server) {
      SocketService.instance = new SocketService(server);
    }
    return SocketService.instance;
  }

  // Add emit method to support direct event emission
  public emit(event: string, data: any): void {
    try {
      this.io.emit(event, data);
      logger.debug(`Emitted event ${event}`, { data });
    } catch (error) {
      logger.error(`Error emitting event ${event}:`, error);
      throw error;
    }
  }

  private setupSocketHandlers(): void {
    this.io.on(GameEvents.CONNECT, (socket: Socket) => {
      try {
        logger.info(`Client connected: ${socket.id}`);

        socket.on(
          GameEvents.JOIN_ROOM,
          (data: { roomCode: string; gameId?: string; userId: string }) => {
            const { roomCode, gameId, userId } = data;
            try {
              // If gameId is not provided, use roomCode as the identifier
              const gameIdentifier = gameId || roomCode;

              // Check if the identifier is a UUID format
              const isUUID =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  gameIdentifier,
                );

              // Only use gameIdentifier as gameId if it's a valid UUID, otherwise use roomCode
              const safeGameId = isUUID ? gameIdentifier : roomCode;

              logger.info(
                `Attempting to join room ${roomCode} with gameId ${safeGameId} for user ${userId}`,
              );
              this.joinRoom(socket, roomCode, safeGameId, userId);
            } catch (error) {
              logger.error(`Error joining room ${roomCode}:`, error);
              socket.emit(GameEvents.ERROR, { message: "Failed to join room" });
            }
          },
        );

        socket.on(GameEvents.LEAVE_ROOM, (roomCode: string) => {
          try {
            this.leaveRoom(socket, roomCode);
          } catch (error) {
            logger.error(`Error leaving room ${roomCode}:`, error);
            socket.emit(GameEvents.ERROR, { message: "Failed to leave room" });
          }
        });

        socket.on(GameEvents.DISCONNECT, () => {
          try {
            this.handleDisconnect(socket);
          } catch (error) {
            logger.error(`Error handling disconnect for ${socket.id}:`, error);
          }
        });

        socket.on(GameEvents.ERROR, (error: any) => {
          logger.error(`Socket error for client ${socket.id}:`, error);
        });

        socket.on("reconnect_attempt", (attemptNumber: number) => {
          this.handleReconnect(socket, attemptNumber);
        });

        socket.on(
          GameEvents.PLAYER_READY,
          (data: { gameId: string; playerId: string; isReady: boolean }) => {
            logger.info(
              `Player ready event received ${data.gameId} | ${data.playerId} | ${data.isReady}`,
            );
            try {
              // Add UUID validation here - use gameIdOrRoomCode as parameter for handlePlayerReady
              const isUUID =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  data.gameId,
                );

              if (isUUID) {
                // If it's a valid UUID format, proceed normally
                this.handlePlayerReady(
                  socket,
                  data.gameId,
                  data.playerId,
                  data.isReady,
                );
              } else {
                // If not a UUID, it's likely a room code - log and try to use it
                logger.info(
                  `Received non-UUID gameId "${data.gameId}" in PLAYER_READY event, treating as room code`,
                );
                this.handlePlayerReady(
                  socket,
                  data.gameId, // Pass it as is - our handlePlayerReady is now robust enough to handle this
                  data.playerId,
                  data.isReady,
                );
              }
            } catch (error) {
              logger.error(`Error handling player ready event:`, error);
              socket.emit(GameEvents.ERROR, {
                message: "Failed to handle player ready",
              });
            }
          },
        );

        socket.on(
          GameEvents.GET_GAME_STATE,
          async (data: {
            roomCode: string;
            gameId: string;
            userId?: string;
          }) => {
            const { roomCode, gameId, userId } = data;

            try {
              // Use the user ID from socket data if not provided in the request
              const requestUserId = userId || socket.data.user?.id;

              if (!requestUserId) {
                logger.warn("GET_GAME_STATE requested without a user ID");
                socket.emit(GameEvents.ERROR, {
                  message: "User ID is required",
                });
                return;
              }

              // Determine which identifier to use
              const isUUID =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  gameId,
                );

              // Try to find the game, with some robustness
              let game = null;
              if (isUUID) {
                // If it's a valid UUID, use gameId
                game = await this.getGameState(gameId);
              } else {
                // Otherwise, try roomCode
                game = await this.getGameState(roomCode);
              }

              // If we still can't find it, log the error with details
              if (!game) {
                logger.error(
                  `Game not found for roomCode: ${roomCode} or gameId: ${gameId}`,
                );
                socket.emit(GameEvents.ERROR, { message: "Game not found" });
                return;
              }

              logger.debug(
                `GET_GAME_STATE requested for game ${gameId} by user ${requestUserId}`,
              );

              // Check if user is part of this game
              const isUserInGame =
                game.state?.players &&
                Object.keys(game.state.players).includes(requestUserId);

              if (!isUserInGame) {
                logger.warn(
                  `User ${requestUserId} requested state for game ${gameId} but is not a participant`,
                );
                socket.emit(GameEvents.ERROR, {
                  message: "You are not a participant in this game",
                });
                return;
              }

              // Check if user is connected to this room
              const isConnected = this.isPlayerConnected(
                roomCode,
                requestUserId,
              );

              // Handle reconnection if user is in game but not connected to room
              if (!isConnected) {
                logger.info(
                  `User ${requestUserId} reconnecting to game ${gameId} room ${roomCode}`,
                );

                // Check if user was in disconnected players list
                const wasDisconnected =
                  await getDisconnectedPlayerRedis(requestUserId);

                if (wasDisconnected && game.status === GameStatus.IN_PROGRESS) {
                  // Handle formal reconnection for in-progress games
                  const disconnectInfo = wasDisconnected;

                  if (disconnectInfo) {
                    const canRejoin = await this.canRejoinGame(
                      requestUserId,
                      gameId,
                    );

                    if (canRejoin) {
                      // Remove from disconnected players list
                      await removeDisconnectedPlayerRedis(requestUserId);

                      // Join the room
                      await this.joinRoom(
                        socket,
                        roomCode,
                        gameId,
                        requestUserId,
                      );

                      // Emit reconnection event to all players
                      this.emitGameStateUpdate(roomCode, {
                        type: "PLAYER_RECONNECTED",
                        roomCode,
                        gameId,
                        player: {
                          id: requestUserId,
                          isActive: true,
                        },
                        timestamp: new Date(),
                      });

                      // Log successful reconnection
                      logger.info(
                        `User ${requestUserId} successfully reconnected to game ${gameId}`,
                      );
                    } else {
                      // Reconnection window expired
                      socket.emit(GameEvents.ERROR, {
                        message:
                          "Reconnection window expired, you can no longer join this game",
                      });
                      return;
                    }
                  }
                } else {
                  // Simple rejoin for waiting games or if not previously disconnected
                  try {
                    // Just join the room
                    await this.joinRoom(
                      socket,
                      roomCode,
                      gameId,
                      requestUserId,
                    );
                    logger.info(
                      `User ${requestUserId} joined room ${roomCode} for game ${gameId}`,
                    );
                  } catch (joinError) {
                    logger.error(
                      `Error joining room for reconnection:`,
                      joinError,
                    );
                    socket.emit(GameEvents.ERROR, {
                      message: "Failed to join room",
                    });
                    return;
                  }
                }
              }

              // Now send the game state update (for both reconnected and already connected players)
              this.emitGameStateUpdate(roomCode, {
                type: "GAME_STATE_UPDATE",
                roomCode,
                gameId,
                game,
                timestamp: new Date(),
              });

              logger.debug(
                `Game state sent to user ${requestUserId} for game ${gameId}`,
              );
            } catch (error) {
              logger.error(
                `Error handling GET_GAME_STATE for room ${roomCode}:`,
                error,
              );
              socket.emit(GameEvents.ERROR, {
                message: "Failed to get game state",
              });
            }
          },
        );

        this.setupGameEventHandlers(socket);

        // Add matchmaking event handlers
        socket.on(
          GameEvents.MATCHMAKING_UPDATE,
          async (data: {
            preferredVariant: GameVariant;
            region: string;
            gameTypeId: string;
          }) => {
            try {
              const userId = socket.data.user?.id;
              if (!userId) {
                socket.emit(GameEvents.ERROR, { message: "Unauthorized" });
                return;
              }

              const { preferredVariant, region, gameTypeId } = data;

              if (!region) {
                socket.emit(GameEvents.ERROR, {
                  message: "Region is required for matchmaking",
                });
                return;
              }

              if (!gameTypeId) {
                socket.emit(GameEvents.ERROR, {
                  message: "Game type is required for matchmaking",
                });
                return;
              }

              const game = await gameService.joinMatchmaking(
                userId,
                preferredVariant,
                region,
                gameTypeId,
              );

              if (game) {
                // If a game was found immediately, emit match found event
                this.emitMatchmakingUpdate({
                  type: "MATCH_FOUND",
                  userId,
                  matchedWith: game.players[0].userId,
                  roomCode: game.roomCode,
                  gameId: game.id,
                  timestamp: new Date(),
                });
              } else {
                // If no immediate match, player is in queue
                this.emitMatchmakingUpdate({
                  type: "JOINED_QUEUE",
                  userId,
                  queueStatus: await gameService.getQueuePosition(userId),
                  timestamp: new Date(),
                });
              }
            } catch (error: any) {
              logger.error("Error in socket matchmaking:", error);
              socket.emit(GameEvents.ERROR, { message: error.message });
            }
          },
        );

        socket.on(GameEvents.LEAVE_MATCHMAKING, async () => {
          try {
            const userId = socket.data.user?.id;
            if (!userId) {
              socket.emit(GameEvents.ERROR, { message: "Unauthorized" });
              return;
            }

            await gameService.leaveMatchmaking(userId);
            this.emitMatchmakingUpdate({
              type: "LEFT_QUEUE",
              userId,
              timestamp: new Date(),
            });
          } catch (error: any) {
            logger.error("Error leaving matchmaking:", error);
            socket.emit(GameEvents.ERROR, { message: error.message });
          }
        });
      } catch (error) {
        logger.error("Error in connection handler:", error);
        socket.emit(GameEvents.ERROR, { message: "Internal server error" });
      }
    });
  }

  private handleReconnect(socket: Socket, attemptNumber: number): void {
    try {
      const attempts = this.reconnectAttempts.get(socket.id) || 0;
      if (attempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts.set(socket.id, attempts + 1);
        logger.info(
          `Client ${socket.id} reconnection attempt ${attemptNumber}`,
        );
      } else {
        logger.warn(`Client ${socket.id} exceeded max reconnection attempts`);
        socket.emit(GameEvents.ERROR, {
          message: "Max reconnection attempts exceeded",
        });
      }
    } catch (error) {
      logger.error("Error handling reconnection:", error);
    }
  }

  private setupGameEventHandlers(socket: Socket): void {
    try {
      const handlers = {
        [GameEvents.DICE_ROLLED]: async (data: { gameId: string }) => {
          try {
            const userId = socket.data.user?.id;
            if (!userId) {
              socket.emit(GameEvents.ERROR, {
                message: "User not authenticated",
              });
              return;
            }

            // Import gameService dynamically to avoid circular dependency
            const gameService = await import("./gameService");
            const result = await gameService.rollDice(data.gameId, userId);

            logger.debug("Dice roll processed through game service", {
              gameId: data.gameId,
              userId,
              result: {
                diceResult: result.diceResult,
                hasValidMoves: result.hasValidMoves,
              },
            });

            // The game service will emit the game state update through socketService
          } catch (error) {
            logger.error("Error processing dice roll:", {
              error: error instanceof Error ? error.message : "Unknown error",
              gameId: data.gameId,
            });
            socket.emit(GameEvents.ERROR, {
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to process dice roll",
            });
          }
        },
        [GameEvents.PIECE_MOVED]: async (data: {
          gameId: string;
          pieceId: number;
        }) => {
          try {
            const userId = socket.data.user?.id;
            if (!userId) {
              socket.emit(GameEvents.ERROR, {
                message: "User not authenticated",
              });
              return;
            }

            // Import gameService dynamically to avoid circular dependency
            const gameService = await import("./gameService");
            const result = await gameService.movePiece(
              data.gameId,
              userId,
              data.pieceId,
            );

            logger.debug("Piece movement processed through game service", {
              gameId: data.gameId,
              userId,
              pieceId: data.pieceId,
            });

            // The game service will emit the game state update through socketService
          } catch (error) {
            logger.error("Error processing piece movement:", {
              error: error instanceof Error ? error.message : "Unknown error",
              gameId: data.gameId,
              pieceId: data.pieceId,
            });
            socket.emit(GameEvents.ERROR, {
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to process piece movement",
            });
          }
        },
        ["requestValidMoves"]: async (data: {
          gameId: string;
          pieceId: number;
          diceValue: number;
        }) => {
          try {
            const userId = socket.data.user?.id;
            if (!userId) {
              socket.emit(GameEvents.ERROR, {
                message: "User not authenticated",
              });
              return;
            }

            logger.debug("Processing requestValidMoves", {
              gameId: data.gameId,
              userId,
              pieceId: data.pieceId,
              diceValue: data.diceValue,
            });

            // For tokens in starting position (position 0) with dice roll 6
            if (data.diceValue === 6) {
              socket.emit("validMoves", {
                gameId: data.gameId,
                userId,
                pieceId: data.pieceId,
                moves: [1], // Can move to position 1 when rolling 6
                diceValue: data.diceValue,
              });
            } else {
              // For other moves, calculate valid positions
              socket.emit("validMoves", {
                gameId: data.gameId,
                userId,
                pieceId: data.pieceId,
                moves: [], // No valid moves for tokens in start with non-6 roll
                diceValue: data.diceValue,
              });
            }
          } catch (error) {
            logger.error("Error processing requestValidMoves:", {
              error: error instanceof Error ? error.message : "Unknown error",
              gameId: data.gameId,
              pieceId: data.pieceId,
            });
            socket.emit(GameEvents.ERROR, {
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to get valid moves",
            });
          }
        },
        [GameEvents.CHAT_MESSAGE]: (data: {
          message: string;
          sender: string;
        }) => {
          const room = this.findRoomBySocket(socket);
          if (room) {
            this.io
              .to(`game:${room.roomCode}`)
              .emit(GameEvents.CHAT_MESSAGE, data);
          }
        },
      };

      Object.entries(handlers).forEach(([event, handler]) => {
        socket.on(event, (data) => {
          try {
            handler(data);
          } catch (error) {
            logger.error(`Error handling ${event} event:`, error);
            socket.emit(GameEvents.ERROR, {
              message: `Failed to handle ${event}`,
            });
          }
        });
      });
    } catch (error) {
      logger.error("Error setting up game event handlers:", error);
    }
  }

  private async joinRoom(
    socket: Socket,
    roomCode: string,
    gameId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.ensureDatabaseConnection();

      const roomId = `game:${roomCode}`;
      let game;

      // First try to find by roomCode
      game = await this.gameRepository.findOne({
        where: { roomCode },
        relations: ["players"],
      });

      // If not found by roomCode, try using gameId as fallback (might be a confusion in the client)
      if (!game && gameId !== roomCode) {
        // IMPORTANT: We must validate that gameId is a proper UUID before using it in the query
        const isUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            gameId,
          );

        if (isUUID) {
          // Only query by ID if it's a valid UUID format
          game = await this.gameRepository.findOne({
            where: { id: gameId },
            relations: ["players"],
          });

          // If found by gameId, update roomCode to match what's in the database
          if (game) {
            roomCode = game.roomCode;
            logger.info(
              `Found game by ID ${gameId}, updated roomCode to ${roomCode}`,
            );
          }
        } else {
          // Log that we tried to use an invalid UUID format as gameId
          logger.warn(
            `Attempted to use invalid UUID format "${gameId}" for game lookup`,
          );
        }
      }

      if (!game) {
        logger.error(
          `Game not found for roomCode: ${roomCode} or gameId: ${gameId}`,
        );
        throw new Error("Game not found");
      }

      if (game.status !== GameStatus.WAITING) {
        throw new Error("Cannot join game - game is not in waiting state");
      }

      let room = this.rooms.get(roomCode);
      if (!room) {
        room = {
          roomCode,
          players: new Set(),
          gameId,
        };
        this.rooms.set(roomCode, room);
      }

      // Check if player is already in the room
      if (room.players.has(socket.id)) {
        return;
      }

      await socket.join(roomId);
      room.players.add(socket.id);

      // Get current player info
      const currentPlayerGameInfo = game.players.find(
        (player) => player.userId === userId,
      );

      if (!currentPlayerGameInfo) {
        throw new Error("Player not found in game");
      }

      // Initialize or update player state
      const newPlayerData = {
        isReady: currentPlayerGameInfo.isReady || false,
        joinedAt: currentPlayerGameInfo.joinedAt || new Date(),
        color: currentPlayerGameInfo.color,
        pieces: [0, 0, 0, 0],
        points: 0,
        kills: 0,
        timeRemaining: game.timePerMove,
        lastMoveTime: new Date(),
        moveHistory: [],
        position: currentPlayerGameInfo.position,
        userId: userId,
        username: currentPlayerGameInfo.username,
        tokenPositions: currentPlayerGameInfo.tokenPositions || [0, 0, 0, 0],
        isActive: true,
        lives: currentPlayerGameInfo.lives || 3,
      };

      // Update game state with new player
      const updatedState = {
        ...game.state,
        players: {
          ...game.state.players,
          [userId]: newPlayerData,
        },
      };

      // Save the updated game state
      await this.gameRepository
        .createQueryBuilder()
        .update(Game)
        .set({ state: updatedState })
        .where("roomCode = :roomCode", { roomCode })
        .execute();

      // Emit join events
      socket.emit(GameEvents.ROOM_JOINED, {
        roomCode,
        gameId,
        player: {
          ...newPlayerData,
          id: userId,
        },
      });

      // Notify other players
      this.emitGameStateUpdate(roomCode, {
        type: "PLAYER_JOINED",
        gameId: game.id,
        roomCode: game.roomCode,
        player: {
          id: userId,
          username: currentPlayerGameInfo.username,
          position: currentPlayerGameInfo.position,
          color: currentPlayerGameInfo.color,
          isReady: currentPlayerGameInfo.isReady,
        },
        players: updatedState.players,
        timestamp: new Date(),
      });

      // Emit system message
      this.emitSystemMessage(roomCode, {
        message: `${currentPlayerGameInfo.username} has joined the game.`,
        type: "WAITING",
        status: "INFO",
      });

      logger.info(`Client ${socket.id} joined room: ${roomCode}`, {
        userId,
        gameId,
        playerCount: Object.keys(updatedState.players).length,
        maxPlayers: game.maxPlayers,
      });
    } catch (error) {
      logger.error(`Error joining room ${roomCode}:`, error);
      throw error;
    }
  }

  private leaveRoom(socket: Socket, roomCode: string): void {
    try {
      const roomId = `game:${roomCode}`;
      const room = this.rooms.get(roomCode);

      if (room) {
        socket.leave(roomId);
        room.players.delete(socket.id);

        if (room.players.size === 0) {
          this.rooms.delete(roomCode);
        }

        socket.to(roomId).emit(GameEvents.PLAYER_LEFT, { socketId: socket.id });
        logger.info(`Client ${socket.id} left room: ${roomCode}`);
      }
    } catch (error) {
      logger.error(`Error leaving room ${roomCode}:`, error);
      throw error;
    }
  }

  private async handleDisconnect(socket: Socket): Promise<void> {
    try {
      const userId = socket.data.user?.id;
      if (!userId) {
        logger.warn(`Socket ${socket.id} disconnected without user data`);
        return;
      }

      logger.info(`Handling disconnection for user ${userId}`);

      // Check if player was in matchmaking queue and remove them
      await removeQueuedPlayerFromRedis(userId);
      logger.info(`Removed disconnected user ${userId} from matchmaking queue`);

      // Check if player was in a room
      const room = this.findRoomBySocket(socket);
      if (room) {
        const dataSource = await getDataSource();
        // Before using the gameId, validate it's a proper UUID
        const isUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            room.gameId,
          );
        let game;

        if (isUUID) {
          // Use gameId if it's a UUID
          game = await this.getGameState(room.gameId);
        } else {
          // Fall back to roomCode if gameId is not a UUID
          logger.warn(
            `Non-UUID gameId "${room.gameId}" in room object, falling back to roomCode "${room.roomCode}"`,
          );
          game = await this.getGameState(room.roomCode);
        }

        if (!game) {
          this.leaveRoom(socket, room.roomCode);
          return;
        }

        if (game.status === GameStatus.WAITING || game.status === GameStatus.STARTING) {
          try {
            // Use transaction to handle deletion
            await dataSource.manager.transaction(
              async (transactionalEntityManager) => {
                // Delete player record completely from game_players table
                // Validate if room.gameId is a UUID before using it in database queries
                const isUUID = isValidUUID(room.gameId);
                let gameIdForQuery = room.gameId;

                // If room.gameId is not a UUID, get the actual game.id
                if (!isUUID) {
                  // We need to find the game by room code first to get its UUID
                  const gameByRoomCode = await transactionalEntityManager
                    .getRepository(Game)
                    .findOne({ where: { roomCode: room.roomCode } });

                  if (gameByRoomCode) {
                    gameIdForQuery = gameByRoomCode.id;
                    logger.info(
                      `Using valid UUID ${gameIdForQuery} instead of room code ${room.gameId} for database operation`,
                    );
                  } else {
                    logger.error(
                      `Could not find game with room code ${room.roomCode}`,
                    );
                    return; // Exit early if game not found
                  }
                }

                // Now use the validated gameId for the database query
                await transactionalEntityManager
                  .createQueryBuilder()
                  .delete()
                  .from(GamePlayers)
                  .where("gameId = :gameId AND userId = :userId", {
                    gameId: gameIdForQuery,
                    userId: userId,
                  })
                  .execute();

                // Check remaining players - use the validated gameIdForQuery
                const remainingPlayers = await transactionalEntityManager
                  .getRepository(GamePlayers)
                  .createQueryBuilder("player")
                  .where("player.gameId = :gameId", {
                    gameId: gameIdForQuery, // Use validated ID that we know is a UUID
                  })
                  .getCount();

                // If no players left, mark game as completed
                if (remainingPlayers === 0) {
                  await transactionalEntityManager
                    .createQueryBuilder()
                    .update(Game)
                    .set({
                      status: GameStatus.COMPLETED,
                      endTime: new Date(),
                    })
                    .where("id = :id", { id: gameIdForQuery }) // Use validated ID
                    .execute();
                }

                // Update game state to reflect player removal
                const gameState = game.state;
                delete gameState.players[userId];
                gameState.turnOrder = gameState.turnOrder.filter(
                  (id) => id !== userId,
                );

                await transactionalEntityManager
                  .createQueryBuilder()
                  .update(Game)
                  .set({ state: gameState })
                  .where("id = :id", { id: gameIdForQuery }) // Use validated ID
                  .execute();
              },
            );

            // Remove from socket room
            this.leaveRoom(socket, room.roomCode);
            logger.info(
              `Removed disconnected user ${userId} from game ${room.gameId}`,
            );

            // Notify other players
            this.emitGameStateUpdate(room.roomCode, {
              type: "PLAYER_LEFT",
              gameId: room.gameId,
              roomCode: room.roomCode,
              player: {
                id: userId,
              },
              timestamp: new Date(),
            });
          } catch (error) {
            logger.error("Error cleaning up disconnected player:", error);
          }
        } else if (game.status === GameStatus.IN_PROGRESS) {
          // Handle disconnection during active game
          await setDisconnectedPlayerRedis(userId, {
            gameId: room.gameId,
            disconnectedAt: new Date(),
            canReconnect: true,
            reconnectionWindow: this.RECONNECTION_WINDOW,
          });

          // Notify other players about disconnection
          this.emitGameStateUpdate(room.roomCode, {
            type: "PLAYER_DISCONNECTED",
            roomCode: room.roomCode,
            player: {
              id: userId,
            },
            reconnectionTimeout: this.RECONNECTION_WINDOW,
          });

          // Before setting up the timeout, validate that we have a proper game ID
          // If room.gameId is not a UUID format, use the actual game.id which is guaranteed to be a UUID
          const isUUID =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              room.gameId,
            );
          const gameIdForTimeout = isUUID ? room.gameId : game.id;

          logger.info(
            `Setting reconnection timeout for user ${userId} with validated game ID ${gameIdForTimeout}`,
          );

          // Set up reconnection timeout with validated game ID
          setTimeout(() => {
            this.handleReconnectionTimeout(userId, gameIdForTimeout);
          }, this.RECONNECTION_WINDOW);
        }
      }
    } catch (error) {
      logger.error(`Error handling disconnect for ${socket.id}:`, error);
    }
  }

  private async handleReconnectionTimeout(
    userId: string,
    gameId: string,
  ): Promise<void> {
    try {
      const disconnectInfo = await getDisconnectedPlayerRedis(userId);
      if (!disconnectInfo || !disconnectInfo.canReconnect) return;

      // Validate gameId is proper UUID format before attempting database query
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          gameId,
        );

      let game = null;
      if (isUUID) {
        game = await this.getGameState(gameId);
      } else {
        logger.warn(
          `Non-UUID gameId "${gameId}" in handleReconnectionTimeout - this may cause issues`,
        );
        return; // Early return to avoid errors
      }

      if (!game) return;

      // If player hasn't reconnected within window, handle as forfeit
      if (game.status === "IN_PROGRESS") {
        // Update game state to handle player forfeit
        this.emitGameStateUpdate(game.roomCode, {
          type: "PLAYER_FORFEITED",
          roomCode: game.roomCode,
          player: {
            id: userId,
          },
        });
      }

      await removeDisconnectedPlayerRedis(userId);
    } catch (error) {
      logger.error(
        `Error handling reconnection timeout for user ${userId}:`,
        error,
      );
    }
  }

  private findRoomBySocket(socket: Socket): GameRoom | undefined {
    for (const [_, room] of this.rooms) {
      if (room.players.has(socket.id)) {
        return room;
      }
    }
    return undefined;
  }

  // Public methods for emitting game events
  public emitGameStateUpdate(
    roomCode: string,
    gameState: GameStateUpdatePayload,
  ): void {
    try {
      this.io
        .to(`game:${roomCode}`)
        .emit(GameEvents.GAME_STATE_UPDATED, gameState);
      logger.debug(`Emitted game state update for room ${roomCode}`, {
        type: gameState.type,
      });
    } catch (error) {
      logger.error(
        `Error emitting game state update for room ${roomCode}:`,
        error,
      );
    }
  }

  public emitSystemMessage(
    roomCode: string,
    message: SystemMessagePayload,
  ): void {
    try {
      this.io.to(`game:${roomCode}`).emit(GameEvents.SYSTEM_MESSAGE, message);
      logger.debug(`Emitted system message to room ${roomCode}`, {
        message: message.message,
        status: message.status,
      });
    } catch (error) {
      logger.error(`Error emitting system message to room ${roomCode}:`, error);
    }
  }

  public emitMatchmakingUpdate(update: MatchmakingUpdatePayload): void {
    try {
      this.io.emit(GameEvents.MATCHMAKING_UPDATE, update);
      logger.debug(`Emitted matchmaking update`, {
        type: update.type,
        userId: update.userId,
      });
    } catch (error) {
      logger.error(`Error emitting matchmaking update:`, error);
    }
  }

  private async emitQueueStatistics(): Promise<void> {
    try {
      // Calculate queue stats and emit updates to all users in queue
      const queue = await getQueuedPlayersFromRedis();
      const totalInQueue = queue.length;
      let position = 0;
      for (const player of queue) {
        position++;
        // Emit queue position update to this specific player
        this.io.to(player.socketId).emit(GameEvents.QUEUE_POSITION_UPDATE, {
          position,
          totalInQueue,
          estimatedWaitTime: this.calculateEstimatedWaitTime(position),
          timestamp: new Date(),
        });
      }
      logger.debug(`Emitted queue statistics to ${totalInQueue} players`);
    } catch (error) {
      logger.error(`Error emitting queue statistics:`, error);
    }
  }

  private calculateEstimatedWaitTime(position: number): number {
    // Base wait time is 30 seconds + 15 seconds per position
    return 30 + position * 15;
  }

  private async handlePlayerReady(
    socket: Socket,
    gameIdOrRoomCode: string,
    playerId: string,
    isReady: boolean,
  ): Promise<void> {
    try {
      await this.ensureDatabaseConnection();

      // Check if the input is a UUID format (likely a game ID) or not (likely a room code)
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          gameIdOrRoomCode,
        );

      let game = await this.gameRepository.findOne({
        where: isUUID
          ? { id: gameIdOrRoomCode }
          : { roomCode: gameIdOrRoomCode },
        relations: ["players", "players.user"],
      });

      if (!game) {
        throw new Error(`Game ${gameIdOrRoomCode} not found`);
      }

      // Store the game ID for later use
      const gameId = game.id;

      // Before proceeding, make sure all players have an entry in the game state
      // This is critical to ensure no player is lost in the game state
      if (
        game.state.players &&
        game.players.length > Object.keys(game.state.players).length
      ) {
        logger.info(
          `Found player count mismatch: ${
            game.players.length
          } players in game, but only ${
            Object.keys(game.state.players).length
          } in game state. Syncing players...`,
        );

        // Create state entries for all players that are missing
        for (const playerEntry of game.players) {
          const playerIdInState = Object.keys(game.state.players).find(
            (id) =>
              id === playerEntry.userId ||
              id === playerEntry.id ||
              game.state.players[id].userId === playerEntry.userId,
          );

          if (!playerIdInState) {
            // Player not found in state, create entry
            const stateId = playerEntry.userId || playerEntry.id;

            // Create empty TokenMove array for moveHistory
            const emptyMoveHistory: any[] = [];

            // Create player state entry
            game.state.players[stateId] = {
              userId: playerEntry.userId,
              username: playerEntry.user?.username || "Unknown",
              isReady: false, // Default to not ready
              pieces: [0, 0, 0, 0],
              color: playerEntry.color || GameColor.RED,
              points: 0,
              kills: 0,
              timeRemaining: 0,
              lastMoveTime: new Date(),
              moveHistory: emptyMoveHistory,
              position: playerEntry.position || 0,
              isActive: true,
              tokenPositions: [0, 0, 0, 0],
              joinedAt: new Date(),
              lives: 3, // Default lives
            };

            logger.info(
              `Added missing player ${stateId} to game state during sync`,
            );
          }
        }

        // Save the updated game state with all players
        await this.gameRepository
          .createQueryBuilder()
          .update(Game)
          .set({ state: game.state })
          .where("id = :id", { id: game.id })
          .execute();

        logger.info(
          `Synced all players to game state. Now have ${
            Object.keys(game.state.players).length
          } players in state.`,
        );
      }

      // Detailed logging of player and game state information
      logger.info(`Handling player ready event for game ${gameId}`, {
        requestedPlayerId: playerId,
        availablePlayers: game.players.map((p) => ({
          id: p.id,
          userId: p.userId,
          userIdFromObj: p.user?.id,
        })),
        gameStatePlayerIds: Object.keys(game.state.players || {}),
        gameStatePlayerDetails: Object.entries(game.state.players || {}).map(
          ([id, player]) => ({
            id,
            userId: player.userId,
            isReady: player.isReady,
          }),
        ),
      });

      // Find the player in the game - check various ID fields
      const playerInGame = game.players.find((p) => {
        return (
          p.userId === playerId ||
          p.id === playerId ||
          (p.user && p.user.id === playerId)
        );
      });

      if (!playerInGame) {
        logger.warn(
          `Player ${playerId} not found in game ${gameId}. Available players:`,
          game.players.map((p) => ({
            id: p.id,
            userId: p.userId,
            userIdFromObj: p.user?.id,
          })),
        );
        throw new Error(`Player ${playerId} not found in game ${gameId}`);
      }

      // Update player ready state in the game entity
      playerInGame.isReady = isReady;
      await this.gameRepository.manager.save(playerInGame);

      // For debugging - log the player ready state in the entity after saving
      logger.info(
        `Player entity ${playerInGame.userId} isReady=${playerInGame.isReady} after save`,
      );

      // Method 1: Try to find player by ID in game state
      let statePlayerId = Object.keys(game.state.players || {}).find(
        (id) =>
          id === playerId ||
          id === playerInGame.id ||
          id === playerInGame.userId,
      );

      // Method 2: Try to find by userId field in the player state objects
      if (!statePlayerId) {
        statePlayerId = Object.keys(game.state.players || {}).find(
          (id) =>
            game.state.players[id].userId === playerId ||
            game.state.players[id].userId === playerInGame.id ||
            game.state.players[id].userId === playerInGame.userId,
        );
      }

      // Method 3: Try to find the first player that has matching user data
      if (!statePlayerId && playerInGame.user) {
        statePlayerId = Object.keys(game.state.players || {}).find(
          (id) =>
            game.state.players[id].username === playerInGame.user.username,
        );
      }

      // If we still can't find the player ID in state, update the game state to include this player
      if (!statePlayerId) {
        logger.warn(
          `Player ${playerId} not found in game state. Creating state entry.`,
          {
            playerInGame: {
              id: playerInGame.id,
              userId: playerInGame.userId,
              username: playerInGame.user?.username,
            },
            existingStatePlayers: Object.keys(game.state.players || {}),
          },
        );

        // Use player's userId as the key in game state if player doesn't exist in state
        statePlayerId = playerInGame.userId || playerInGame.id;

        // Create player entry in game state if it doesn't exist
        if (game.state.players && !game.state.players[statePlayerId]) {
          // Create empty TokenMove array for moveHistory
          const emptyMoveHistory: any[] = [];

          game.state.players[statePlayerId] = {
            userId: playerInGame.userId,
            username: playerInGame.user?.username || "Unknown",
            isReady: isReady,
            pieces: [0, 0, 0, 0],
            color: playerInGame.color || GameColor.RED,
            points: 0,
            kills: 0,
            timeRemaining: 0,
            lastMoveTime: new Date(),
            moveHistory: emptyMoveHistory, // This satisfies the type requirement
            position: playerInGame.position || 0,
            isActive: true,
            tokenPositions: [0, 0, 0, 0],
            joinedAt: new Date(),
            lives: 3, // Add default lives
          };

          logger.info(
            `Created new player state for ${statePlayerId} in game ${game.id}`,
          );
        }
      }

      // Now we have determined the correct player ID in state, update the ready status
      if (game.state.players && statePlayerId) {
        // First, log the player state before update
        logger.info(
          `Player state before update: ${statePlayerId} isReady=${game.state.players[statePlayerId].isReady}`,
        );

        // Update the player's ready state
        game.state.players[statePlayerId].isReady = isReady;

        // Log the player state after the update
        logger.info(
          `Player state after update: ${statePlayerId} isReady=${game.state.players[statePlayerId].isReady}`,
        );

        // We now need a direct SQL update to avoid race conditions
        logger.info(`Using direct SQL update for player ready state`);

        // Create the SQL to directly update the specific player's ready state in the JSON
        // Using the correct table name 'games' (not 'game')
        const updateQuery = `
          UPDATE games
          SET state = jsonb_set(
            state,
            '{players, ${statePlayerId}, isReady}',
            'true',
            true
          )
          WHERE id = $1
        `;

        try {
          // Execute the update directly
          await this.gameRepository.query(updateQuery, [gameId]);
          logger.info(
            `SQL update completed successfully for player ${statePlayerId} in game ${gameId}`,
          );
        } catch (error) {
          logger.error(`SQL update failed: ${error.message}`);

          // Fallback to the old method if the SQL fails
          let gameToUpdate = await this.gameRepository.findOne({
            where: { id: gameId },
          });

          if (gameToUpdate) {
            // Make deep copy of state to avoid reference issues
            const stateCopy = JSON.parse(JSON.stringify(gameToUpdate.state));

            // Double check the player's ready state is set
            if (stateCopy.players && stateCopy.players[statePlayerId]) {
              stateCopy.players[statePlayerId].isReady = isReady;
              logger.info(
                `Fallback: Set ready state for ${statePlayerId} is ${isReady} in state copy`,
              );
            }

            // Update the game state
            gameToUpdate.state = stateCopy;

            // Save the entire game object
            logger.info(
              `Fallback: Saving game state with updated player ready status`,
            );
            await this.gameRepository.save(gameToUpdate);
          }
        }

        // Verify state was saved correctly (regardless of method used)
        const verifyGame = await this.gameRepository.findOne({
          where: { id: gameId },
        });
        if (verifyGame && verifyGame.state.players[statePlayerId]) {
          logger.info(
            `Verified ready state after save: ${statePlayerId} isReady=${verifyGame.state.players[statePlayerId].isReady}`,
          );
        } else {
          logger.error(
            `Could not verify player ${statePlayerId} in game ${gameId} after ready state update`,
          );
        }

        // After saving, fetch the latest game state to ensure we have the most up-to-date data
        const updatedGame = await this.gameRepository.findOne({
          where: { id: gameId },
          relations: ["players", "players.user"],
        });

        if (!updatedGame) {
          logger.error(`Game ${gameId} not found after updating ready state`);
          return;
        }

        // Check if all players are ready using the fresh game state
        // Log each player's ready state for debugging
        logger.info(`Checking all player ready states:`, {
          players: Object.entries(updatedGame.state.players).map(
            ([id, player]) => ({
              id,
              userId: player.userId,
              isReady: player.isReady,
            }),
          ),
        });

        // Check in two ways to be extra sure
        const playersArray = Object.values(updatedGame.state.players);
        logger.info(`Player count in state: ${playersArray.length}`);

        // Method 1: Check every player's ready state
        const allPlayersReady = playersArray.every((player) => player.isReady);

        // Method 2: Count ready players and compare with total
        const readyCount = playersArray.filter(
          (player) => player.isReady,
        ).length;
        const totalCount = playersArray.length;
        const allReadyByCount = readyCount === totalCount && totalCount > 0;

        logger.info(
          `Ready check results: every()=${allPlayersReady}, count=${readyCount}/${totalCount}=${allReadyByCount}`,
        );

        // Use method 2 as it's more reliable for debugging
        const allPlayersAreReady = allReadyByCount;

        // Log detailed player information
        logger.info(`Game state after ready update (${statePlayerId}):`, {
          gameId,
          playersCount: Object.keys(updatedGame.state.players).length,
          expectedPlayers: updatedGame.maxPlayers,
          status: updatedGame.status,
          players: Object.keys(updatedGame.state.players).map((id) => ({
            id,
            userId: updatedGame.state.players[id].userId,
            isReady: updatedGame.state.players[id].isReady,
          })),
          allPlayersReady,
        });

        // Emit player ready event with latest state
        this.emitGameStateUpdate(updatedGame.roomCode, {
          type: "PLAYER_READY",
          gameId,
          roomCode: updatedGame.roomCode,
          player: {
            id: statePlayerId,
            isReady,
          },
          allPlayersReady,
          timestamp: new Date(),
        });

        logger.info(
          `Player ${statePlayerId} set ready state to ${isReady} in game ${gameId}`,
          {
            allPlayersReady,
            playerInGameId: playerInGame.id,
            playerInGameUserId: playerInGame.userId,
            totalPlayers: Object.keys(updatedGame.state.players).length,
          },
        );

        // Start game if all players are ready and minimum players are met
        if (
          allPlayersAreReady && // Use our new more robust check
          Object.keys(updatedGame.state.players).length >=
            (updatedGame.state.minPlayers || 2) &&
          Object.keys(updatedGame.state.players).length ===
            updatedGame.maxPlayers &&
          (updatedGame.status === GameStatus.WAITING ||
            updatedGame.status === GameStatus.STARTING)
        ) {
          // Using a global lock via the timers map to prevent race conditions
          const lockKey = `startCheck_${gameId}`;

          // Only one thread should start the countdown
          if (
            !this.gameStartTimers.has(gameId) &&
            !this.gameStartTimers.has(lockKey)
          ) {
            // Set a temporary lock
            this.gameStartTimers.set(
              lockKey,
              setTimeout(() => {
                this.gameStartTimers.delete(lockKey);
              }, 5000),
            );

            logger.info(
              `Starting game countdown for game ${gameId} with ${
                Object.keys(updatedGame.state.players).length
              }/${updatedGame.maxPlayers} players - all players ready`,
            );
            this.startGameCountdown(updatedGame);
          } else {
            logger.info(
              `Game countdown already started or locked for game ${gameId}`,
            );
          }
        } else if (!allPlayersAreReady) {
          logger.info(`Not all players are ready in game ${gameId}`);
        } else if (
          Object.keys(updatedGame.state.players).length <
          (updatedGame.state.minPlayers || 2)
        ) {
          logger.info(
            `Not enough players in game ${gameId}: ${
              Object.keys(updatedGame.state.players).length
            } < ${updatedGame.state.minPlayers || 2}`,
          );
        } else if (
          Object.keys(updatedGame.state.players).length !==
          updatedGame.maxPlayers
        ) {
          logger.info(
            `Not at max capacity in game ${gameId}: ${
              Object.keys(updatedGame.state.players).length
            } != ${updatedGame.maxPlayers}`,
          );
        } else {
          logger.info(
            `Game ${gameId} not in startable state: ${updatedGame.status}`,
          );
        }
      } else {
        logger.error(
          `Failed to determine player state ID for player ${playerId} in game ${gameIdOrRoomCode}`,
        );
      }
    } catch (error) {
      logger.error(
        `Error handling player ready for game ${gameIdOrRoomCode}, player ${playerId}:`,
        error,
      );
      throw error;
    }
  }

  private startGameCountdown(game: Game): void {
    try {
      const roomCode = game.roomCode;
      const gameId = game.id;
      const countdown = 5; // 5 second countdown

      // Clear any existing timer for this game
      if (this.gameStartTimers.has(gameId)) {
        clearTimeout(this.gameStartTimers.get(gameId));
      }

      // Emit game starting event
      this.emitGameStateUpdate(roomCode, {
        type: "GAME_STARTING",
        gameId,
        roomCode,
        countdown,
        timestamp: new Date(),
      });

      // Emit system message
      this.emitSystemMessage(roomCode, {
        message: `Game starting in ${countdown} seconds...`,
        type: "GAME_STARTING",
        status: "INFO",
      });

      // Set timeout to start the game
      const timer = setTimeout(async () => {
        await this.startGame(gameId);
      }, countdown * 1000);

      this.gameStartTimers.set(gameId, timer);
      logger.info(`Started game countdown for game ${gameId}`);
    } catch (error) {
      logger.error(`Error starting game countdown:`, error);
    }
  }

  public async startGame(gameId: string): Promise<void> {
    try {
      await this.ensureDatabaseConnection();

      const game = await this.gameRepository.findOne({
        where: { id: gameId },
        relations: ["players", "gameType"],
      });


      if (!game) {
        throw new Error(`Game ${gameId} not found`);
      }

      // Allow starting the game from various states - more permissive to handle race conditions
      if (
        ![GameStatus.WAITING, GameStatus.STARTING].includes(
          game.status as GameStatus,
        )
      ) {
        logger.warn(
          `Cannot start game ${gameId} - not in valid state (current: ${game.status})`,
        );

        // If the game is already in progress, don't return - just emit the started event
        if (game.status === GameStatus.IN_PROGRESS) {
          logger.info(
            `Game ${gameId} is already in progress, just emitting events`,
          );
        } else {
          return;
        }
      }

      // Log the current state of players before starting
      logger.info(`Starting game ${gameId}`, {
        playerCount: game.state?.players
          ? Object.keys(game.state.players).length
          : 0,
        playerDetails: game.state?.players
          ? Object.entries(game.state.players).map(([id, player]) => ({
              id,
              userId: player.userId,
              isReady: player.isReady,
            }))
          : [],
      });

      // Deduct entry fees when game actually starts
      if (game.entryFee > 0) {
        const { deductGameEntryFee } = await import("./walletService");
        const activePlayers = await this.gameRepository
          .createQueryBuilder("game")
          .leftJoinAndSelect("game.players", "player")
          .where("game.id = :gameId", { gameId })
          .andWhere("player.isActive = true")
          .getOne();

        if (activePlayers && activePlayers.players) {
          for (const player of activePlayers.players) {
            try {
              await deductGameEntryFee(
                player.userId,
                game.entryFee,
                game.id,
                game.gameType?.name || "Unknown Game Type",
              );
              logger.info(
                `Entry fee of ${game.entryFee} deducted for user ${player.userId} at game start`,
              );
            } catch (error) {
              logger.error(
                `Failed to deduct entry fee for user ${player.userId}: ${error.message}`,
              );
              // Continue with other players even if one fails
            }
          }
        }
      }

      // Update game status
      game.status = GameStatus.IN_PROGRESS;
      game.state.gameStartTime = new Date();

      // Update game state
      if (game.state) {
        game.state.status = GameStatus.IN_PROGRESS;
        // Remove startTime assignment since it's not in GameState type

        // Generate turn order based on player positions
        if (!game.state.turnOrder || game.state.turnOrder.length === 0) {
          // Get player data from the database to ensure we have positions
          const gamePlayers = await this.gameRepository
            .createQueryBuilder("game")
            .leftJoinAndSelect("game.players", "player")
            .where("game.id = :gameId", { gameId })
            .getOne();

          if (gamePlayers && gamePlayers.players.length > 0) {
            // Sort players by position to ensure position 0 goes first
            const sortedPlayers = [...gamePlayers.players]
              .sort((a, b) => a.position - b.position)
              .filter((p) => p.isActive);

            // Set turn order based on sorted positions
            game.state.turnOrder = sortedPlayers.map((p) => p.userId);

            logger.info(
              `Generated position-based turn order for game ${gameId}`,
              {
                turnOrder: game.state.turnOrder,
                positions: sortedPlayers.map((p) => p.position),
              },
            );
          } else {
            // Fallback if we can't get players data
            const playerIds = Object.keys(game.state.players);
            game.state.turnOrder = playerIds;
            logger.warn(
              `Using default player order for game ${gameId} - couldn't get position data`,
            );
          }
        }

        // Set first player as the active player (should be position 0)
        game.state.currentPlayer = game.state.turnOrder[0];
        logger.info(
          `First player in game ${gameId} is ${game.state.currentPlayer}`,
        );
      }

      // Save the game
      await this.gameRepository.save(game);
      // Start quick game timer for QUICK variant games
      if (game.variant === "QUICK") {
        try {
          const QuickGameTimerService = await import('./quickGameTimerService');
          const quickGameTimerService = QuickGameTimerService.default.getInstance();
          await quickGameTimerService.startQuickGameTimer(game);
          logger.info(`Quick game timer started for QUICK variant game ${gameId}`);
        } catch (timerError) {
          logger.error(`Failed to start quick game timer for game ${gameId}:`, timerError);
        }
      }

      // Emit game started event
      this.emitGameStateUpdate(game.roomCode, {
        type: "GAME_STARTED",
        gameId,
        roomCode: game.roomCode,
        status: GameStatus.IN_PROGRESS,
        startTime: game.state.gameStartTime,
        players: game.state?.players,
        timestamp: new Date(),
      });

      // Emit system message
      this.emitSystemMessage(game.roomCode, {
        message: `Game has started!`,
        type: "GAME_STARTED",
        status: "INFO",
      });

      logger.info(`Game ${gameId} started successfully`, {
        startTime: game.state.gameStartTime,
        players: Object.keys(game.state?.players || {}).length,
        roomCode: game.roomCode,
      });

      // Start turn timeout for the first player
      if (game.state?.currentPlayer) {
        const timeoutDuration = game.turnTimeLimit || 30; // Default 30 seconds
        logger.info(
          `Started initial turn timeout for player ${game.state.currentPlayer} in game ${gameId}`,
          {
            timeoutDuration,
          },
        );
        // Actually start the turn timeout service
        try {
          const { enhancedTurnTimeoutService } = await import('./enhancedTurnTimeoutService');
          await enhancedTurnTimeoutService.startTurnTimeout({
            gameId,
            playerId: game.state.currentPlayer,
            timeoutInSeconds: timeoutDuration,
            gameTypeTimeout: game.gameType?.turnTimeLimit,
            overrideTimeout: game.turnTimeLimit
          });
        } catch (timerError) {
          logger.error(`Failed to start turn timeout for game ${gameId}:`, timerError);
        }
      }

      // Clean up the timer
      this.gameStartTimers.delete(gameId);
    } catch (error) {
      logger.error(`Error starting game ${gameId}:`, error);

      // Make sure we clean up the timer even if there's an error
      this.gameStartTimers.delete(gameId);
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  public async getGameState(gameIdOrRoomCode: string): Promise<Game | null> {
    try {
      await this.ensureDatabaseConnection();

      // Check if the input is a UUID format (likely a game ID) or not (likely a room code)
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          gameIdOrRoomCode,
        );

      let game = null;

      // First try to find by the format we think it is (UUID or roomCode)
      if (isUUID) {
        // Try to find by ID first
        game = await this.gameRepository.findOne({
          where: { id: gameIdOrRoomCode },
          relations: ["players", "players.user"],
        });
      } else {
        // Try to find by roomCode
        game = await this.gameRepository.findOne({
          where: { roomCode: gameIdOrRoomCode },
          relations: ["players", "players.user"],
        });
      }

      // If not found, try the other format
      if (!game && isUUID) {
        // Try by roomCode as fallback
        game = await this.gameRepository.findOne({
          where: { roomCode: gameIdOrRoomCode },
          relations: ["players", "players.user"],
        });
      } else if (!game) {
        // Don't try by id if it's not a UUID format to avoid SQL errors
        // Just log that we couldn't find the game
        logger.warn(`Could not find game with roomCode: ${gameIdOrRoomCode}`);
      }

      return game;
    } catch (error) {
      logger.error(
        `Error getting game state for game/room ${gameIdOrRoomCode}:`,
        error,
      );
      return null;
    }
  }

  // Method to check if a player is connected to a specific room
  public isPlayerConnected(roomCode: string, userId: string): boolean {
    try {
      // Check if the room exists
      const room = this.rooms.get(roomCode);
      if (!room) {
        logger.debug(
          `Room ${roomCode} not found when checking player connection`,
        );
        return false;
      }

      // Find all connected sockets for the given user ID
      const connectedSockets = this.findSocketsByUserId(userId);

      // Check if any of the user's sockets are in the room
      for (const socket of this.io.sockets.sockets.values()) {
        if (socket.data.user?.id === userId) {
          // Check if this socket is in the room
          if (room.players.has(socket.id)) {
            logger.debug(`Player ${userId} is connected to room ${roomCode}`);
            return true;
          }
        }
      }

      logger.debug(`Player ${userId} is not connected to room ${roomCode}`);
      return false;
    } catch (error) {
      logger.error(
        `Error checking if player ${userId} is connected to room ${roomCode}:`,
        error,
      );
      return false;
    }
  }

  // Utility method to find all socket connections for a user
  private findSocketsByUserId(userId: string): Socket[] {
    const userSockets: Socket[] = [];

    for (const socket of this.io.sockets.sockets.values()) {
      if (socket.data.user?.id === userId) {
        userSockets.push(socket);
      }
    }

    return userSockets;
  }

  public emitTurnChange(
    roomCode: string,
    nextPlayerId: string,
    gameId: string,
  ): void {
    try {
      this.io.to(`game:${roomCode}`).emit(GameEvents.TURN_CHANGED, {
        nextPlayerId,
        gameId,
      } as TurnChangePayload);

      logger.debug(`Emitted turn change for room ${roomCode}`, {
        nextPlayerId,
        gameId,
      });
    } catch (error) {
      logger.error(`Error emitting turn change for room ${roomCode}:`, error);
    }
  }

  public emitGameCompleted(
    roomCode: string,
    gameResult: GameCompletedPayload,
  ): void {
    try {
      this.io
        .to(`game:${roomCode}`)
        .emit(GameEvents.GAME_COMPLETED, gameResult);

      logger.debug(`Emitted game completed for room ${roomCode}`, {
        winner: gameResult.winner.id,
        endTime: gameResult.endTime,
      });
    } catch (error) {
      logger.error(
        `Error emitting game completed for room ${roomCode}:`,
        error,
      );
    }
  }

  // Method to emit events to a specific room
  public emitToRoom(roomCode: string, event: string, data: any): void {
    try {
      this.io.to(`game:${roomCode}`).emit(event, data);
      logger.debug(`Emitted event ${event} to room ${roomCode}`, { data });
    } catch (error) {
      logger.error(`Error emitting event ${event} to room ${roomCode}:`, error);
    }
  }

  // Initialize turn timeout service with socket service reference
  private initializeTurnTimeoutService(): void {
    turnTimeoutManager.initialize(this);
  }

  // Add new method to check if user can rejoin a game (Redis-based)
  public async canRejoinGame(
    userId: string,
    gameIdOrRoomCode: string,
  ): Promise<boolean> {
    try {
      const disconnectInfo = await getDisconnectedPlayerRedis(userId);
      if (!disconnectInfo) return false;
      // Validate if the identifier is a UUID
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          gameIdOrRoomCode,
        );
      let game = null;
      if (isUUID) {
        // If it's a UUID, try to get the game by ID
        game = await this.getGameState(gameIdOrRoomCode);
      } else {
        // If it's not a UUID, it's likely a room code
        logger.info(
          `Non-UUID format identifier "${gameIdOrRoomCode}" in canRejoinGame, treating as room code`,
        );
        // Attempt to query by room code
        game = await this.gameRepository.findOne({
          where: { roomCode: gameIdOrRoomCode },
          relations: ["players", "players.user"],
        });
      }
      if (!game || game.status !== "IN_PROGRESS") {
        logger.warn(
          `Cannot rejoin game: game not found or not in progress ${gameIdOrRoomCode}`,
        );
        return false;
      }
      const timeSinceDisconnect =
        Date.now() - disconnectInfo.disconnectedAt.getTime();
      const canRejoin =
        disconnectInfo.canReconnect &&
        timeSinceDisconnect < disconnectInfo.reconnectionWindow;
      if (canRejoin) {
        logger.info(
          `User ${userId} can rejoin game ${gameIdOrRoomCode} (${timeSinceDisconnect}ms since disconnect)`,
        );
      } else {
        logger.info(
          `User ${userId} cannot rejoin game ${gameIdOrRoomCode} (${timeSinceDisconnect}ms since disconnect)`,
        );
      }
      return canRejoin;
    } catch (error) {
      logger.error(`Error checking rejoin status for user ${userId}:`, error);
      return false;
    }
  }
}

export default SocketService;
