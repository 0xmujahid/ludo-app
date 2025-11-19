import { Repository } from "typeorm";
import { getDataSource } from "../config/database";
import { Game } from "../entities/Game";
import { User } from "../entities/User";
import {
  GameState,
  GameVariant,
  GameStatus,
  GameColor,
  CustomRules,
} from "../types/game";
import { GamePlayers } from "../entities/GamePlayers";
import { logger } from "../utils/logger";
import { scheduleJob, Job } from "node-schedule";
import * as webhookService from "./webhookService";
import SocketService from "./socketService";
import { Socket } from "socket.io";

interface CreateRoomOptions {
  maxPlayers: number;
  minPlayers?: number; // Add minPlayers option
  entryFee: number;
  variant: GameVariant;
  timePerMove?: number;
  isPrivate?: boolean;
  password?: string;
  customRules?: Partial<CustomRules>;
}

interface RoomValidationResult {
  isValid: boolean;
  error?: string;
}

interface PlayerState {
  isReady: boolean;
  joinedAt: Date;
  color: GameColor;
  pieces: number[];
  points: number;
  kills: number;
  timeRemaining: number;
  lastMoveTime: Date;
  moveHistory: any[];
  position: number;
  userId: string;
  username: string;
  tokenPositions: number[];
  isActive: boolean;
}

// Get socket service instance
const socketService = SocketService.getInstance();

export class GameRoomService {
  private static instance: GameRoomService | null = null;
  private gameRepo!: Repository<Game>;
  private gamePlayerRepo!: Repository<GamePlayers>;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private cleanupJob: Job | null = null;
  private gameStartTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.startCleanupJob();
  }

  private startCleanupJob() {
    try {
      if (this.cleanupJob) {
        this.cleanupJob.cancel();
      }

      this.cleanupJob = scheduleJob("0 0 * * *", async () => {
        logger.info("Starting scheduled cleanup of inactive game rooms");
        try {
          const startTime = new Date();
          await this.cleanupInactiveRooms();
          const endTime = new Date();
          const duration = endTime.getTime() - startTime.getTime();

          logger.info(
            `Completed scheduled cleanup of inactive game rooms. Duration: ${duration}ms`,
          );
        } catch (error) {
          logger.error("Failed to cleanup inactive rooms:", {
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
      });

      logger.info("Game room cleanup job scheduled successfully");
    } catch (error) {
      logger.error("Failed to schedule cleanup job:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  public static getInstance(): GameRoomService {
    if (!GameRoomService.instance) {
      GameRoomService.instance = new GameRoomService();
    }
    return GameRoomService.instance;
  }

  public static async initialize(): Promise<void> {
    const instance = GameRoomService.getInstance();
    await instance.initializeRepositories();
  }

  private async initializeRepositories(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = (async () => {
      const maxRetries = 5;
      let retryCount = 0;
      const baseDelay = 2000;

      while (retryCount < maxRetries) {
        try {
          const dataSource = await getDataSource();

          if (!dataSource.isInitialized) {
            throw new Error("DataSource not initialized");
          }

          this.gameRepo = dataSource.getRepository(Game);
          this.gamePlayerRepo = dataSource.getRepository(GamePlayers);

          await Promise.all([
            this.gameRepo.query("SELECT 1"),
            this.gamePlayerRepo.query("SELECT 1"),
          ]);

          this.initialized = true;
          logger.info("GameRoomService repositories initialized successfully");
          return;
        } catch (error) {
          retryCount++;
          const delay = Math.min(baseDelay * Math.pow(2, retryCount), 10000);

          logger.error("Failed to initialize GameRoomService repositories:", {
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            attempt: retryCount,
            maxRetries,
            nextRetry:
              retryCount < maxRetries ? `in ${delay}ms` : "no more retries",
          });

          if (retryCount >= maxRetries) {
            this.initialized = false;
            throw new Error(
              `Failed to initialize GameRoomService after ${maxRetries} attempts`,
            );
          }

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    })();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeRepositories();
    }
  }

  public async createRoom(
    creator: User,
    options: CreateRoomOptions,
  ): Promise<Game> {
    await this.ensureInitialized();

    const validation = this.validateRoomOptions(options);
    if (!validation.isValid) {
      throw new Error(validation.error || "Invalid room options");
    }

    const existingGames = await this.gameRepo
      .createQueryBuilder("game")
      .innerJoin("game.players", "player")
      .where("player.user.id = :userId", { userId: creator.id })
      .andWhere("game.status != :status", { status: GameStatus.COMPLETED })
      .getMany();

    if (existingGames.length > 0) {
      throw new Error("User is already in an active game");
    }

    if (options.isPrivate && !options.password) {
      throw new Error("Password is required for private rooms");
    }

    const roomCode = await Game.generateRoomCode(this.gameRepo);

    const game = new Game();
    game.roomCode = roomCode;
    game.maxPlayers = options.maxPlayers;
    game.entryFee = options.entryFee;
    game.variant = options.variant;
    game.timePerMove = options.timePerMove || 30;
    game.isPrivate = options.isPrivate || false;
    game.password = options.password;
    game.status = GameStatus.WAITING;
    game.state = this.createInitialGameState(options);

    const gamePlayer = new GamePlayers();
    gamePlayer.game = game;
    gamePlayer.user = creator;
    gamePlayer.position = 0;
    gamePlayer.isActive = true;
    gamePlayer.joinedAt = new Date();
    gamePlayer.isWinner = false;
    gamePlayer.prizeMoney = 0;
    gamePlayer.tokenPositions = [0, 0, 0, 0];
    gamePlayer.color = this.getPlayerColor(0);
    gamePlayer.isReady = false; // Initialize player as not ready
    game.players = [gamePlayer];

    try {
      const savedGame = await this.gameRepo.save(game);
      socketService.emitSystemMessage(game.roomCode, {
        message: `Room ${roomCode} created by ${creator.username}. Waiting for players to join.`,
        type: "WAITING",
        status: "INFO",
      });

      // Update game state with creator's information
      savedGame.state.players[creator.id] = {
        isReady: false,
        joinedAt: new Date(),
        color: gamePlayer.color,
        pieces: [0, 0, 0, 0],
        points: 0,
        kills: 0,
        timeRemaining: savedGame.timePerMove,
        lastMoveTime: new Date(),
        moveHistory: [],
        position: 0,
        userId: creator.id,
        username: creator.username,
        tokenPositions: gamePlayer.tokenPositions,
        isActive: true,
      };

      await this.gameRepo.save(savedGame);

      // Emit room creation event through socket
      socketService.emitGameStateUpdate(game.roomCode, {
        type: "ROOM_CREATED",
        roomCode: savedGame.roomCode,
        creator: creator.username,
        maxPlayers: savedGame.maxPlayers,
        variant: savedGame.variant,
        players: savedGame.state.players, // Changed from playerStates to players
      });

      return savedGame;
    } catch (error) {
      throw new Error(
        `Failed to create room: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  public async joinRoom(
    roomCode: string,
    player: User,
    password?: string,
  ): Promise<Game> {
    await this.ensureInitialized();

    const game = await this.gameRepo.findOne({
      where: { roomCode },
      relations: ["players"],
    });

    if (!game) {
      throw new Error("Room not found");
    }

    if (game.status !== GameStatus.WAITING) {
      throw new Error("Game is not in waiting state");
    }

    if (game.players.length >= game.maxPlayers) {
      throw new Error("Room is full");
    }

    if (game.players.some((p) => p.user.id === player.id)) {
      throw new Error("Player is already in the room");
    }

    const activeGame = await this.gameRepo
      .createQueryBuilder("game")
      .innerJoin("game.players", "player")
      .where("player.user.id = :userId", { userId: player.id })
      .andWhere("game.status != :status", { status: GameStatus.COMPLETED })
      .getOne();

    if (activeGame) {
      throw new Error("Player is already in an active game");
    }

    if (game.isPrivate) {
      if (!password) {
        throw new Error("Password is required for private rooms");
      }
      if (game.password !== password) {
        throw new Error("Invalid room password");
      }
    }

    const gamePlayer = new GamePlayers();
    gamePlayer.game = game;
    gamePlayer.user = player;
    gamePlayer.position = game.players.length;
    gamePlayer.isActive = true;
    gamePlayer.joinedAt = new Date();
    gamePlayer.isWinner = false;
    gamePlayer.prizeMoney = 0;
    gamePlayer.tokenPositions = [0, 0, 0, 0];
    gamePlayer.color = this.getPlayerColor(game.players.length);
    gamePlayer.isReady = false;

    game.players.push(gamePlayer);

    // Update game state with new player's information
    game.state.players[player.id] = {
      isReady: false,
      joinedAt: new Date(),
      color: gamePlayer.color,
      pieces: [0, 0, 0, 0],
      points: 0,
      kills: 0,
      timeRemaining: game.timePerMove,
      lastMoveTime: new Date(),
      moveHistory: [],
      position: gamePlayer.position,
      userId: player.id,
      username: player.username,
      tokenPositions: gamePlayer.tokenPositions,
      isActive: true,
    };

    await this.gamePlayerRepo.save(gamePlayer);
    await this.gameRepo.save(game);

    socketService.emitSystemMessage(game.roomCode, {
      message: `${player.username} has joined the room. Waiting for ${
        game.maxPlayers - game.players.length
      } more players.`,
      type: "WAITING",
      status: "INFO",
    });

    // Emit player join event through socket
    socketService.emitGameStateUpdate(roomCode, {
      type: "PLAYER_JOINED",
      roomCode: game.roomCode,
      player: {
        id: player.id,
        username: player.username,
        color: gamePlayer.color,
        position: gamePlayer.position,
      },
      remainingSlots: game.maxPlayers - game.players.length,
      players: game.state.players, // Changed from playerStates to players
    });

    return game;
  }

  private async handlePlayerReady(
    socket: Socket,
    gameId: string,
    playerId: string,
    isReady: boolean,
  ): Promise<void> {
    try {
      await this.ensureInitialized();

      const game = await this.gameRepo.findOne({
        where: { id: gameId },
        relations: ["players"],
      });

      if (!game) {
        throw new Error("Game not found");
      }

      // Update player ready state
      const player = game.players.find((p) => p.user.id === playerId);
      if (!player) {
        throw new Error("Player not in game");
      }

      player.isReady = isReady;
      game.state.players[playerId].isReady = isReady;

      // Check if game can start based on room size and ready players
      const connectedPlayers = game.players.filter((p) => p.isActive);
      const readyPlayers = connectedPlayers.filter((p) => p.isReady);
      const allPlayersReady = connectedPlayers.every((p) => p.isReady);

      let shouldStartCountdown = false;

      if (game.maxPlayers === 2) {
        // For 2-player rooms, start when both players are present and ready
        shouldStartCountdown = connectedPlayers.length === 2 && allPlayersReady;
      } else {
        // For 3-4 player rooms, only start when room is full and all players are ready
        shouldStartCountdown =
          connectedPlayers.length === game.maxPlayers && allPlayersReady;
      }

      // Start countdown if conditions are met and not already started
      if (shouldStartCountdown && game.status === GameStatus.WAITING) {
        game.status = GameStatus.STARTING;

        // Start countdown only if not already started
        if (!this.gameStartTimers.has(game.roomCode)) {
          const countdown = setTimeout(async () => {
            try {
              // Call the socketService startGame function which handles entry fee deduction
              await socketService.startGame(game.id);
              return; // Exit early since socketService.startGame handles everything
            } catch (error) {
              console.error(`Failed to start game ${game.id}:`, error);
              // Continue with fallback logic below
            }
            game.status = GameStatus.IN_PROGRESS;
            game.state = this.initializeGameState(game);
            await this.gameRepo.save(game);

            socketService.emitGameStateUpdate(game.roomCode, {
              type: "GAME_STARTED",
              roomCode: game.roomCode,
              players: game.state.players,
              startTime: game.state.gameStartTime,
            });
          }, 5000);

          this.gameStartTimers.set(game.roomCode, countdown);

          // Emit game starting event
          socketService.emitGameStateUpdate(game.roomCode, {
            type: "GAME_STARTING",
            roomCode: game.roomCode,
            countdown: 5,
            players: game.state.players,
            allPlayersReady: true,
          });
        }
      }

      await this.gamePlayerRepo.save(player);
      await this.gameRepo.save(game);

      // Emit updated player ready state
      socketService.emitGameStateUpdate(game.roomCode, {
        type: "PLAYER_READY",
        roomCode: game.roomCode,
        player: {
          id: playerId,
          isReady: isReady,
        },
        players: game.state.players,
        allPlayersReady,
      });
    } catch (error) {
      logger.error("Error handling player ready state:", {
        error: error instanceof Error ? error.message : "Unknown error",
        gameId,
        playerId,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  public async setPlayerReady(roomCode: string, player: User): Promise<Game> {
    await this.ensureInitialized();

    const game = await this.gameRepo.findOne({
      where: { roomCode },
      relations: ["players"],
    });

    if (!game) {
      throw new Error("Room not found");
    }

    if (game.status !== GameStatus.WAITING) {
      throw new Error("Game is not in waiting state");
    }

    const playerInGame = game.players.find((p) => p.user.id === player.id);
    if (!playerInGame) {
      throw new Error("Player is not in this room");
    }

    // Update player ready state
    playerInGame.isReady = true;
    game.state.players[player.id].isReady = true;

    // Check if game can start based on room size and ready players
    const connectedPlayers = game.players.filter((p) => p.isActive);
    const readyPlayers = connectedPlayers.filter((p) => p.isReady);
    const allPlayersReady = readyPlayers.length === connectedPlayers.length;

    let shouldStartCountdown = false;

    if (game.maxPlayers === 2) {
      // For 2-player rooms, start when both players are present and ready
      shouldStartCountdown = connectedPlayers.length === 2 && allPlayersReady;
    } else {
      // For 3-4 player rooms, only start when room is full and all players are ready
      shouldStartCountdown =
        connectedPlayers.length === game.maxPlayers && allPlayersReady;
    }

    if (shouldStartCountdown) {
      game.status = GameStatus.STARTING;
      game.state.allPlayersReady = true;

      // Update turn order based on player positions
      const sortedPlayers = [...game.players]
        .sort((a, b) => a.position - b.position)
        .filter((p) => p.isActive);

      game.state.turnOrder = sortedPlayers.map((p) => p.user.id);
      game.state.currentPlayer = game.state.turnOrder[0];

      // Emit game starting event with countdown
      socketService.emitGameStateUpdate(roomCode, {
        type: "GAME_STARTING",
        roomCode: game.roomCode,
        countdown: 5,
        players: game.state.players,
        allPlayersReady: true,
      });

      // Start the game after countdown
      setTimeout(async () => {
        try {
          await this.startGame(roomCode);
        } catch (error) {
          logger.error("Failed to start game after countdown:", {
            error: error instanceof Error ? error.message : "Unknown error",
            roomCode,
          });
        }
      }, 5000);
    }

    await this.gamePlayerRepo.save(playerInGame);
    await this.gameRepo.save(game);

    return game;
  }

  public async updateGameStatus(
    roomCode: string,
    status: GameStatus,
  ): Promise<Game> {
    await this.ensureInitialized();

    const game = await this.gameRepo.findOne({
      where: { roomCode },
      relations: ["players"],
    });

    if (!game) {
      throw new Error("Room not found");
    }

    game.status = status;
    game.state.status = status;

    await this.gameRepo.save(game);

    // Update game status update event
    socketService.emitGameStateUpdate(roomCode, {
      type: "GAME_STATUS_UPDATED",
      status: status,
      roomCode: game.roomCode,
      players: game.state.players,
    });

    return game;
  }

  public async startGame(roomCode: string): Promise<Game> {
    await this.ensureInitialized();

    const game = await this.gameRepo.findOne({
      where: { roomCode },
      relations: ["players"],
    });

    if (!game) {
      throw new Error("Room not found");
    }

    // Get minimum players requirement (default to 2 if not specified)
    const minPlayers = game.state.minPlayers || 2;

    // Verify minimum number of players
    const activePlayers = game.players.filter((p) => p.isActive && p.isReady);
    if (activePlayers.length < minPlayers) {
      throw new Error(
        `At least ${minPlayers} players are required to start the game`,
      );
    }

    if (game.status !== GameStatus.STARTING) {
      throw new Error("Game is not in starting state");
    }

    // Initialize game state
    game.status = GameStatus.IN_PROGRESS;
    game.state = this.initializeGameState(game);

    // Clear any existing start timer
    const existingTimer = this.gameStartTimers.get(roomCode);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.gameStartTimers.delete(roomCode);
    }

    await this.gameRepo.save(game);

    // Emit game started event
    socketService.emitGameStateUpdate(roomCode, {
      type: "GAME_STARTED",
      roomCode: game.roomCode,
      players: game.state.players,
      startTime: game.state.gameStartTime,
    });

    return game;
  }

  private initializeGameState(game: Game): GameState {
    const state = game.state as GameState;
    const now = new Date();

    // Initialize player states with all required properties
    game.players.forEach((player, index) => {
      state.players[player.user.id] = {
        pieces: [0, 0, 0, 0],
        color: this.getPlayerColor(index),
        points: 0,
        kills: 0,
        timeRemaining: state.timePerMove,
        lastMoveTime: now,
        moveHistory: [],
        isReady: true,
        position: player.position,
        userId: player.user.id,
        username: player.user.username || "",
        tokenPositions: player.tokenPositions,
        isActive: player.isActive,
        joinedAt: player.joinedAt || now, // Ensure joinedAt is always set
      };
    });

    // Sort players by position for turn order
    const sortedPlayers = [...game.players]
      .sort((a, b) => a.position - b.position)
      .filter((p) => p.isActive);

    // Set turn order based on player positions
    state.turnOrder = sortedPlayers.map((p) => p.user.id);
    
    // First player (position 0) gets first turn
    state.currentPlayer = state.turnOrder[0];
    
    state.gameStartTime = now;
    state.lastMoveTime = now;
    state.allPlayersReady = true;

    return state;
  }

  private async cleanupInactiveRooms(): Promise<void> {
    await this.ensureInitialized();

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    try {
      const inactiveRooms = await this.gameRepo
        .createQueryBuilder("game")
        .where("game.createdAt <= :date AND game.status = :status", {
          date: oneDayAgo,
          status: GameStatus.WAITING,
        })
        .orWhere("game.createdAt <= :date AND game.status = :completedStatus", {
          date: oneDayAgo,
          completedStatus: GameStatus.COMPLETED,
        })
        .getMany();

      if (inactiveRooms.length > 0) {
        logger.info(`Found ${inactiveRooms.length} inactive rooms to cleanup`);
      }

      for (const room of inactiveRooms) {
        const oldStatus = room.status;
        room.status = GameStatus.COMPLETED;
        await this.gameRepo.save(room);

        // Send webhook for room cleanup
        await webhookService.handleGameStateWebhook(room.id, {
          event: "room_cleaned_up",
          roomCode: room.roomCode,
          oldStatus,
          createdAt: room.createdAt,
          cleanupTime: new Date(),
        });

        logger.info(`Cleaned up inactive room: ${room.roomCode}`, {
          roomId: room.id,
          oldStatus,
          newStatus: GameStatus.COMPLETED,
          createdAt: room.createdAt,
          playerCount: room.players?.length || 0,
        });
      }

      if (inactiveRooms.length > 0) {
        logger.info(
          `Successfully cleaned up ${inactiveRooms.length} inactive rooms`,
        );
      } else {
        logger.debug("No inactive rooms found for cleanup");
      }
    } catch (error) {
      logger.error("Error cleaning up inactive rooms:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error("Failed to cleanup inactive rooms");
    }
  }

  public async triggerCleanup(): Promise<void> {
    logger.info("Manual cleanup triggered");
    await this.cleanupInactiveRooms();
  }

  private validateRoomOptions(
    options: CreateRoomOptions,
  ): RoomValidationResult {
    const errors: string[] = [];

    if (!options.maxPlayers) {
      errors.push("Maximum number of players is required");
    } else if (![2, 3, 4].includes(options.maxPlayers)) {
      errors.push("Room size must be exactly 2, 3, or 4 players");
    }

    // Validate minPlayers
    if (options.minPlayers !== undefined) {
      if (options.minPlayers < 2 || options.minPlayers > options.maxPlayers) {
        errors.push(
          `Minimum players must be between 2 and ${options.maxPlayers}`,
        );
      }
    }

    if (options.entryFee === undefined) {
      errors.push("Entry fee is required");
    } else if (options.entryFee < 0) {
      errors.push("Entry fee cannot be negative");
    }

    if (options.isPrivate) {
      if (!options.password || options.password.trim().length < 4) {
        errors.push(
          "Private rooms require a password of at least 4 characters",
        );
      }
    } else if (options.password) {
      errors.push("Password can only be set for private rooms");
    }

    if (
      options.timePerMove &&
      (options.timePerMove < 10 || options.timePerMove > 300)
    ) {
      errors.push("Time per move must be between 10 and 300 seconds");
    }

    if (options.customRules) {
      if (
        typeof options.customRules.captureReward === "number" &&
        options.customRules.captureReward < 0
      ) {
        errors.push("Capture reward cannot be negative");
      }

      if (
        typeof options.customRules.timeoutPenalty === "number" &&
        options.customRules.timeoutPenalty < 0
      ) {
        errors.push("Timeout penalty cannot be negative");
      }

      if (
        options.customRules.safeZoneRules &&
        !["standard", "strict"].includes(options.customRules.safeZoneRules)
      ) {
        errors.push('Safe zone rules must be either "standard" or "strict"');
      }

      if (
        options.customRules.skipTurnOnSix !== undefined &&
        typeof options.customRules.skipTurnOnSix !== "boolean"
      ) {
        errors.push("Skip turn on six must be a boolean value");
      }

      if (
        options.customRules.multipleTokensPerSquare !== undefined &&
        typeof options.customRules.multipleTokensPerSquare !== "boolean"
      ) {
        errors.push("Multiple tokens per square must be a boolean value");
      }

      if (
        options.customRules.bonusTurnOnSix !== undefined &&
        typeof options.customRules.bonusTurnOnSix !== "boolean"
      ) {
        errors.push("Bonus turn on six must be a boolean value");
      }
      if (
        options.customRules.reconnectionTime !== undefined &&
        typeof options.customRules.reconnectionTime !== "number"
      ) {
        errors.push("Reconnection time must be a number");
      }
      if (
        options.customRules.disqualificationMoves !== undefined &&
        typeof options.customRules.disqualificationMoves !== "number"
      ) {
        errors.push("Disqualification moves must be a number");
      }
      if (
        options.customRules.winningAmount !== undefined &&
        typeof options.customRules.winningAmount !== "number"
      ) {
        errors.push("Winning amount must be a number");
      }
      if (options.customRules.rankingPoints) {
        if (
          options.customRules.rankingPoints.first !== undefined &&
          typeof options.customRules.rankingPoints.first !== "number"
        ) {
          errors.push("Ranking points for first must be a number");
        }
        if (
          options.customRules.rankingPoints.second !== undefined &&
          typeof options.customRules.rankingPoints.second !== "number"
        ) {
          errors.push("Ranking points for second must be a number");
        }
        if (
          options.customRules.rankingPoints.third !== undefined &&
          typeof options.customRules.rankingPoints.third !== "number"
        ) {
          errors.push("Ranking points for third must be a number");
        }
        if (
          options.customRules.rankingPoints.fourth !== undefined &&
          typeof options.customRules.rankingPoints.fourth !== "number"
        ) {
          errors.push("Ranking points for fourth must be a number");
        }
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join("; ") : undefined,
    };
  }

  private createInitialGameState(options: CreateRoomOptions): GameState {
    return {
      players: {},
      currentPlayer: "",
      turnOrder: [],
      diceRoll: 0,
      winner: null,
      gameStartTime: new Date(),
      lastMoveTime: new Date(),
      moveCount: 0,
      pointsToWin: 100,
      timePerMove: options.timePerMove || 30,
      status: GameStatus.WAITING,
      variant: options.variant,
      maxMoves: 50,
      timeLimit: 600,
      turnTimeLimit: 30,
      roomCode: "",
      isPrivate: options.isPrivate || false,
      entryFee: options.entryFee,
      maxPlayers: options.maxPlayers,
      minPlayers: options.minPlayers || 2, // Add minPlayers to game state
      allPlayersReady: false,
      customRules: {
        skipTurnOnSix: options.customRules?.skipTurnOnSix ?? false,
        multipleTokensPerSquare:
          options.customRules?.multipleTokensPerSquare ?? false,
        safeZoneRules: options.customRules?.safeZoneRules ?? "standard",
        captureReward: options.customRules?.captureReward ?? 10,
        bonusTurnOnSix: options.customRules?.bonusTurnOnSix ?? true,
        timeoutPenalty: options.customRules?.timeoutPenalty ?? 5,
        reconnectionTime: options.customRules?.reconnectionTime ?? 60,
        disqualificationMoves: options.customRules?.disqualificationMoves ?? 3,
        winningAmount: options.customRules?.winningAmount ?? 0,
        rankingPoints: {
          first: options.customRules?.rankingPoints?.first ?? 100,
          second: options.customRules?.rankingPoints?.second ?? 60,
          third: options.customRules?.rankingPoints?.third ?? 30,
          fourth: options.customRules?.rankingPoints?.fourth ?? 10,
        },
      },
      consecutiveSixes: 0,
      moveHistory: [],
      specialSquares: {
        // Safe spots based on path system
        67: { type: "safe" }, // Player 1 starting position
        4: { type: "safe" },  // Player 2 starting position
        24: { type: "safe" }, // Player 3 starting position (also player 2 home in 2-player)
        51: { type: "safe" }, // Player 4 starting position
        19: { type: "safe" },
        35: { type: "safe" },
        56: { type: "safe" },
        38: { type: "safe" },
        // Home positions for each player
        60: { type: "home" }, // Player 1 home
        72: { type: "home" }, // Player 3 home
        36: { type: "home" }, // Player 4 home
        ...(options.variant === GameVariant.KILL
          ? {
              15: { type: "kill" },
              30: { type: "kill" },
              45: { type: "kill" },
            }
          : {}),
      },
    };
  }

  private getPlayerColor(position: number): GameColor {
    const colors: GameColor[] = [
      GameColor.RED,
      GameColor.GREEN,
      GameColor.YELLOW,
      GameColor.BLUE,
    ];
    return colors[position % colors.length];
  }

  public async reconnectPlayer(roomCode: string, userId: string): Promise<Game> {
    await this.ensureInitialized();

    const game = await this.gameRepo.findOne({
      where: { roomCode },
      relations: ["players", "players.user"],
    });

    if (!game) {
      throw new Error(`Room ${roomCode} not found`);
    }

    // Find the player in the game
    const playerInGame = game.players.find((p) => p.user.id === userId);
    if (!playerInGame) {
      throw new Error(`Player with ID ${userId} is not part of this game`);
    }

    // Update player active status
    playerInGame.isActive = true;

    // Update game state to reflect player is active again
    if (game.state.players && game.state.players[userId]) {
      game.state.players[userId].isActive = true;
      game.state.players[userId].lastMoveTime = new Date();
    }

    // If game was paused due to this player disconnecting, check if we can resume
    if (game.status === GameStatus.PAUSED) {
      const activePlayers = game.players.filter((p) => p.isActive);

      // Determine minimum players required to continue the game
      const minPlayers = game.state.minPlayers || 2;

      // If we now have enough active players, unpause the game
      if (activePlayers.length >= minPlayers) {
        game.status = GameStatus.IN_PROGRESS;
        game.state.status = GameStatus.IN_PROGRESS;

        // Emit game resumed event
        socketService.emitSystemMessage(game.roomCode, {
          message: `Game resumed as ${playerInGame.user.username} has reconnected.`,
          type: "GAME_RESUMED",
          status: "INFO",
        });
      }
    }

    // Save the updated game state
    await this.gamePlayerRepo.save(playerInGame);
    await this.gameRepo.save(game);

    // Emit welcome back message
    socketService.emitSystemMessage(game.roomCode, {
      message: `${playerInGame.user.username} has reconnected to the game.`,
      type: "PLAYER_RECONNECTED",
      status: "INFO",
    });

    logger.info(`Player ${userId} successfully reconnected to room ${roomCode}`, {
      roomId: game.id,
      userId,
      gameStatus: game.status,
    });

    return game;
  }
}