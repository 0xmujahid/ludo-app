import { Repository } from "typeorm";
import { logger } from "../utils/logger";
import { Game } from "../entities/Game";
import { GamePlayers } from "../entities/GamePlayers";
import { User } from "../entities/User";
import {
  GameState,
  PlayerState,
  GameColor,
  DiceRollResult,
  MoveResult,
  GameVariant,
  GameStatus,
} from "../types/game";
// Remove this import for now

import { GameType } from "../entities/GameType";
import { WalletType } from "../types/gameType";
import SocketService from "./socketService";
import { getDataSource } from "../config/database";
import { enhancedTurnTimeoutService } from "./enhancedTurnTimeoutService";
import { turnTimeoutManager } from "./turnTimeoutManager";
import {
  calculateNextPosition,
  isValidMove as isValidPathMove,
  getValidMovesForPlayer,
  isPieceAtHome,
  canCapture,
  hasPlayerWon as hasPlayerWonPath,
  getPlayerStartingPosition,
  getPlayerPath,
} from "../utils/playerPaths";
import { updateAllPlayersPointsCorrectly } from "../utils/pointCalculation";
import { redisClient } from "../config/redis";
import * as adminService from "./adminService";
import { UserStats } from "../entities/UserStats";
import { Wallet } from "../entities/Wallet";
import { Transaction } from "../entities/Transaction";
import { TransactionType, TransactionStatus, PaymentMethod } from "../types/transaction";
import { AppDataSource } from "../config/database";
import { calculateCashbackContribution } from "./walletService";
import { Config } from "../entities/Config";
import { TransactionCategorizer } from "../utils/transactionCategorizer";
// Enhanced Game Ranking and Prize Distribution System
interface GameRanking {
  rank: number;
  playerId: string;
  username: string;
  position: number;
  isWinner: boolean;
  prizeMoney: number;
  points: number;
  tokensAtHome: number;
  totalMoves: number;
}

interface PrizeDistribution {
  totalEntryFees: number;
  tdsDeduction: number;
  feeDeduction: number;
  netPrizePool: number;
  playerPrizes: { [playerId: string]: number };
}

// Game countdown timer for quick games
const gameCountdowns: Map<string, NodeJS.Timeout> = new Map();

// Quick game countdown timer
function startQuickGameCountdown(gameId: string, timeLimit: number): void {
  const timeout = setTimeout(async () => {
    await handleQuickGameTimeout(gameId);
  }, timeLimit * 1000);

  gameCountdowns.set(gameId, timeout);
  
  logger.info(`Quick game countdown started for game ${gameId} with ${timeLimit} seconds`);
}

async function handleQuickGameTimeout(gameId: string): Promise<void> {
  try {
    const game = await gameRepository.findOne({
      where: { id: gameId },
      relations: ["players", "gameType"]
    });

    if (!game || game.status !== GameStatus.IN_PROGRESS) {
      return;
    }

    // Complete the game due to time limit (will be implemented below)
    game.status = GameStatus.COMPLETED;
    game.endTime = new Date();
    await gameRepository.save(game);
    
    logger.info(`Quick game ${gameId} completed due to time limit`);
  } catch (error) {
    logger.error("Error handling quick game timeout:", error);
  }
}

// Calculate game rankings based on game variant
function calculateGameRankings(gameState: GameState, players: GamePlayers[], gameType: GameType): GameRanking[] {
  const rankings: GameRanking[] = [];
  
  players.forEach(player => {
    const playerState = gameState.players[player.userId];
    if (!playerState) return;

    let tokensAtHome = 0;
    let totalMoves = 0;
    
    // Count tokens at home (position 57)
    playerState.pieces.forEach(piece => {
      if (piece === 57) tokensAtHome++;
    });
    
    // Calculate total moves from move history
    totalMoves = gameState.moveHistory
      .filter(move => move.playerId === player.userId)
      .length;

    rankings.push({
      rank: 0, // Will be calculated after sorting
      playerId: player.userId,
      username: player.username,
      position: player.position,
      isWinner: false, // Will be updated
      prizeMoney: 0, // Will be calculated
      points: playerState.points || 0,
      tokensAtHome,
      totalMoves
    });
  });

  // Sort rankings based on game variant
  if (gameState.variant === GameVariant.CLASSIC) {
    // Classic: Rank by tokens at home, then by total moves (fewer is better)
    rankings.sort((a, b) => {
      if (a.tokensAtHome !== b.tokensAtHome) {
        return b.tokensAtHome - a.tokensAtHome; // More tokens at home = better rank
      }
      return a.totalMoves - b.totalMoves; // Fewer moves = better rank
    });
  } else if (gameState.variant === GameVariant.QUICK) {
    // Quick: Rank by points
    rankings.sort((a, b) => b.points - a.points);
  } else {
    // Kill mode or other variants: Rank by points
    rankings.sort((a, b) => b.points - a.points);
  }

  // Assign ranks and winner status
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
    ranking.isWinner = index === 0;
  });

  return rankings;
}

// Calculate prize distribution based on entry fees and config
async function calculatePrizeDistribution(
  entryFee: number,
  playerCount: number,
  gameType: GameType,
  isTournament: boolean = false
): Promise<PrizeDistribution> {
  if (isTournament) {
    // No prize calculation for tournament games
    return {
      totalEntryFees: 0,
      tdsDeduction: 0,
      feeDeduction: 0,
      netPrizePool: 0,
      playerPrizes: {}
    };
  }

  const totalEntryFees = entryFee * playerCount;
  
  // Get active config for TDS and fee percentages
  const dataSource = await getDataSource();
  const configRepo = dataSource.getRepository(Config);
  const activeConfig = await configRepo.findOne({ where: { status: true } });
  
  if (!activeConfig) {
    throw new Error("No active configuration found");
  }

  const tdsPercentage = activeConfig.tds / 100;
  const feePercentage = activeConfig.fee / 100;
  
  const tdsDeduction = totalEntryFees * tdsPercentage;
  const feeDeduction = totalEntryFees * feePercentage;
  const netPrizePool = totalEntryFees - tdsDeduction - feeDeduction;

  // Get distribution percentages based on player count
  let distributionPercentages: number[] = [];
  if (playerCount === 2) {
    distributionPercentages = activeConfig.twoPlayer;
  } else if (playerCount === 3) {
    distributionPercentages = activeConfig.threePlayer;
  } else if (playerCount === 4) {
    distributionPercentages = activeConfig.fourPlayer;
  }

  const playerPrizes: { [playerId: string]: number } = {};
  
  // Calculate individual prizes (percentages are already in the right order)
  distributionPercentages.forEach((percentage, index) => {
    const prize = (netPrizePool * percentage) / 100;
    playerPrizes[`rank_${index + 1}`] = prize;
  });

  return {
    totalEntryFees,
    tdsDeduction,
    feeDeduction,
    netPrizePool,
    playerPrizes
  };
}

// Distribute winnings to players
async function distributeWinnings(
  rankings: GameRanking[],
  prizeDistribution: PrizeDistribution,
  gameId: string
): Promise<void> {
  const dataSource = await getDataSource();
  const walletRepo = dataSource.getRepository(Wallet);
  const transactionRepo = dataSource.getRepository(Transaction);

  for (const ranking of rankings) {
    const prizeKey = `rank_${ranking.rank}`;
    const prizeMoney = prizeDistribution.playerPrizes[prizeKey] || 0;
    
    if (prizeMoney > 0) {
      // Update player's wallet
      const wallet = await walletRepo.findOne({ 
        where: { userId: ranking.playerId } 
      });
      
      if (wallet) {
        wallet.winningAmount += prizeMoney;
        await walletRepo.save(wallet);

        // Create transaction record
        const transaction = transactionRepo.create({
          amount: prizeMoney,
          transactionType: TransactionType.GAME_WINNING, // FIXED: Use correct field name 'transactionType'
          direction: TransactionCategorizer.getDirection(TransactionType.GAME_WINNING),
          category: TransactionCategorizer.getCategory(TransactionType.GAME_WINNING, { sourceType: "game" }),
          status: TransactionStatus.COMPLETED,
          description: `Game winnings - Rank ${ranking.rank}`,
          paymentMethod: PaymentMethod.SYSTEM, // FIXED: Add missing paymentMethod
          walletId: wallet.id,
          userId: ranking.playerId
        });
        
        await transactionRepo.save(transaction);
        
        logger.info(`Distributed ${prizeMoney} to player ${ranking.playerId} for rank ${ranking.rank}`);
      }
    }
    
    // Update ranking with prize money
    ranking.prizeMoney = prizeMoney;
  }
}

// Enhanced game completion with ranking and prize distribution
async function completeGameWithRankings(game: Game, reason: string = "NORMAL_COMPLETION"): Promise<void> {
  try {
    game.status = GameStatus.COMPLETED;
    game.endTime = new Date();
    
    const gameState = game.state as GameState;
    const rankings = calculateGameRankings(gameState, game.players, game.gameType);
    
    // Calculate and distribute prizes (if not tournament)
    let prizeDistribution: PrizeDistribution | null = null;
    if (reason !== "TOURNAMENT_GAME") {
      prizeDistribution = await calculatePrizeDistribution(
        game.entryFee,
        game.players.length,
        game.gameType,
        false
      );
      
      await distributeWinnings(rankings, prizeDistribution, game.id);
    }

    // Update player statistics
    for (const ranking of rankings) {
      const gamePlayer = game.players.find(p => p.userId === ranking.playerId);
      if (gamePlayer) {
        gamePlayer.isWinner = ranking.isWinner;
        gamePlayer.prizeMoney = ranking.prizeMoney;
        gamePlayer.points = ranking.points;
        await gamePlayerRepository.save(gamePlayer);
      }
    }

    await gameRepository.save(game);

    // Clear timeouts
    enhancedTurnTimeoutService.clearTimeoutForGameEnd(game.id, 'GAME_END');
    gameCountdowns.delete(game.id);

    // Emit game completion with rankings
    try {
      getSocketService().emitGameStateUpdate(game.roomCode, {
        type: "GAME_STATUS_UPDATED",
        gameId: game.id,
        roomCode: game.roomCode,
        timestamp: new Date(),
      });
      
      // Also emit a specific ranking event with the full ranking data
      getSocketService().emitToRoom(game.roomCode, "game_completed", {
        gameId: game.id,
        reason,
        rankings,
        prizeDistribution,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to emit game completion event:", error);
    }

    logger.info(`Game ${game.id} completed with reason: ${reason}`);
  } catch (error) {
    logger.error("Error completing game:", error);
    throw error;
  }
}

// Redis key helpers
const REDIS_QUEUE_KEY = "matchmaking:queue";
const REDIS_QUEUE_JOIN_TIMES = "matchmaking:joinTimes";
const REDIS_DISCONNECTED_KEY = "game:disconnectedPlayers";
const REDIS_ACTIVE_GAMES_KEY = "game:activeGamesByUser";

// Helper functions for Redis queue
async function addPlayerToQueueRedis(player: PlayerInQueue) {
  await redisClient.lpush(REDIS_QUEUE_KEY, JSON.stringify(player));
  await redisClient.hset(
    REDIS_QUEUE_JOIN_TIMES,
    player.user.id,
    Date.now().toString()
  );
}
async function removePlayerFromQueueRedis(userId: string) {
  const queue = await redisClient.lrange(REDIS_QUEUE_KEY, 0, -1);
  const updatedQueue = queue.filter(
    (item) => JSON.parse(item).user.id !== userId
  );
  await redisClient.del(REDIS_QUEUE_KEY);
  for (const player of updatedQueue.reverse()) {
    await redisClient.lpush(REDIS_QUEUE_KEY, player);
  }
  await redisClient.hdel(REDIS_QUEUE_JOIN_TIMES, userId);
}
async function getQueueFromRedis(): Promise<PlayerInQueue[]> {
  const queue = await redisClient.lrange(REDIS_QUEUE_KEY, 0, -1);
  return queue.map((item) => JSON.parse(item));
}
async function getQueueJoinTime(userId: string): Promise<number | null> {
  const time = await redisClient.hget(REDIS_QUEUE_JOIN_TIMES, userId);
  return time ? parseInt(time) : null;
}
// Disconnected players helpers
async function setDisconnectedPlayer(
  userId: string,
  state: DisconnectionState
) {
  await redisClient.hset(REDIS_DISCONNECTED_KEY, userId, JSON.stringify(state));
}
async function getDisconnectedPlayer(
  userId: string
): Promise<DisconnectionState | null> {
  const val = await redisClient.hget(REDIS_DISCONNECTED_KEY, userId);
  return val ? JSON.parse(val) : null;
}
async function removeDisconnectedPlayer(userId: string) {
  await redisClient.hdel(REDIS_DISCONNECTED_KEY, userId);
}
// Types and Interfaces
interface QueueStatus {
  position: number;
  totalInQueue: number;
  estimatedWaitTime: number;
  matchmakingRegion: string;
  gameVariant: GameVariant;
}

interface QueueStatistics {
  totalPlayers: number;
  averageWaitTime: number;
  regionStats: {
    [key: string]: number;
  };
  variantStats: {
    [key: string]: number;
  };
}

interface RecentGame {
  gameId: string;
  won: boolean;
  timestamp: Date;
}

interface PlayerInQueue {
  user: User;
  joinedAt: Date;
  skillRating: number;
  preferredVariant: GameVariant;
  region: string;
  recentPerformance: number;
  gameTypeId: string;
}

interface TokenMove {
  playerId: string;
  tokenId: number;
  fromPosition: number;
  toPosition: number;
  kills: number;
  timestamp: Date;
  diceValue?: number;
  isBonus?: boolean;
}

interface DisconnectionState {
  disconnectedAt: Date;
  canRejoin: boolean;
  gameId: string;
  position: number;
}

// Constants
const K_FACTOR = 32;
const MATCHMAKING_WEIGHTS = {
  skillWeight: 0.4,
  expWeight: 0.2,
  perfWeight: 0.2,
  waitTimeWeight: 0.2,
};

// Repository initialization
let gameRepository: Repository<Game>;
let userRepository: Repository<User>;
let gamePlayerRepository: Repository<GamePlayers>;
let gameTypeRepository: Repository<GameType>;
let initialized = false;
let socketService: SocketService | null = null;

// Redis key helpers

// Enhanced Database-Based Queue Functions (alongside existing in-memory queue)
async function persistPlayerToDatabase(player: PlayerInQueue): Promise<void> {
  try {
    await ensureInitialized();

    // Remove any existing entries for this user
    await gameRepository.query(
      "UPDATE matchmaking_queue SET is_active = false WHERE user_id = $1 AND is_active = true",
      [player.user.id]
    );

    // Add new entry to database for persistence
    await gameRepository.query(
      `
      INSERT INTO matchmaking_queue (
        user_id, game_type_id, preferred_variant, region, skill_rating, is_active, joined_at
      ) VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
    `,
      [
        player.user.id,
        player.gameTypeId,
        player.preferredVariant,
        player.region,
        Math.round(player.skillRating),
      ]
    );

    logger.info(
      `Player ${player.user.id} persisted to database queue for reliability`
    );
  } catch (error) {
    logger.error("Failed to persist player to database queue:", error);
    // Continue with in-memory queue even if database fails
  }
}

async function removePlayerFromDatabase(userId: string): Promise<void> {
  try {
    await ensureInitialized();

    await gameRepository.query(
      "UPDATE matchmaking_queue SET is_active = false WHERE user_id = $1 AND is_active = true",
      [userId]
    );

    logger.info(`Player ${userId} removed from database queue`);
  } catch (error) {
    logger.error("Failed to remove player from database queue:", error);
    // Continue with in-memory queue cleanup
  }
}

async function getEnhancedQueueStats(): Promise<{
  inMemory: number;
  database: number;
}> {
  try {
    await ensureInitialized();
    const dbResult = await gameRepository.query(`
      SELECT COUNT(*) as count FROM matchmaking_queue WHERE is_active = true
    `);
    const inMemory = await redisClient.llen(REDIS_QUEUE_KEY);
    return {
      inMemory,
      database: parseInt(dbResult[0]?.count || "0"),
    };
  } catch (error) {
    logger.error("Failed to get enhanced queue stats:", error);
    return {
      inMemory: 0,
      database: 0,
    };
  }
}

// Database queue cleanup job
function startDatabaseQueueCleanup(): void {
  setInterval(async () => {
    try {
      await ensureInitialized();

      // Clean up expired entries (older than 10 minutes)
      const result = await gameRepository.query(`
        UPDATE matchmaking_queue 
        SET is_active = false 
        WHERE is_active = true AND joined_at < NOW() - INTERVAL '10 minutes'
      `);

      if (result.rowCount > 0) {
        logger.info(
          `Database queue cleanup: Removed ${result.rowCount} expired entries`
        );
      }

      // Log queue statistics every 5 minutes
      const stats = await getEnhancedQueueStats();
      logger.info("Enhanced Queue Stats:", {
        inMemoryQueue: stats.inMemory,
        databaseQueue: stats.database,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Database queue cleanup error:", error);
    }
  }, 5 * 60 * 1000); // Run every 5 minutes
}

// Helper Functions
function getSocketService(): SocketService {
  if (!socketService) {
    socketService = SocketService.getInstance();
    if (!socketService) {
      throw new Error("Failed to initialize SocketService");
    }
  }
  return socketService;
}

async function initializeRepositories() {
  try {
    logger.info("Initializing game service repositories...");
    const dataSource = await getDataSource();

    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    gameRepository = dataSource.getRepository(Game);
    userRepository = dataSource.getRepository(User);
    gamePlayerRepository = dataSource.getRepository(GamePlayers);
    gameTypeRepository = dataSource.getRepository(GameType);

    await Promise.all([
      gameRepository.query("SELECT 1"),
      userRepository.query("SELECT 1"),
      gamePlayerRepository.query("SELECT 1"),
      gameTypeRepository.query("SELECT 1"),
    ]);

    initialized = true;
    logger.info("Game service repositories initialized successfully");

    // Start database queue cleanup job
    startDatabaseQueueCleanup();
  } catch (error) {
    logger.error("Failed to initialize repositories:", error);
    initialized = false;
    throw error;
  }
}

async function ensureInitialized() {
  if (!initialized) {
    await initializeRepositories();
  }
}

function generateRoomCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const codeLength = 6;
  const timestamp = Date.now().toString(36).slice(-3);
  let code = timestamp;

  for (let i = 0; i < codeLength - 3; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return code.toUpperCase();
}

function canStartGame(game: Game): boolean {
  const readyPlayers = game.players.filter((p) => p.isActive && p.isReady);
  const totalPlayers = game.players.length;
  const minPlayers = game.state.minPlayers || 2;

  // First check if we have minimum required players
  if (totalPlayers < minPlayers) {
    return false;
  }

  // For 2-player games
  if (game.maxPlayers === 2) {
    return totalPlayers === 2 && readyPlayers.length === 2;
  }

  // For 3-4 player games
  if (game.maxPlayers > 2) {
    // If we have max players and all are ready, start immediately
    if (totalPlayers === game.maxPlayers && readyPlayers.length === totalPlayers) {
      return true;
    }
    
    // If we have minimum players and all connected players are ready, start
    if (totalPlayers >= minPlayers && readyPlayers.length === totalPlayers) {
      return true;
    }
  }

  return false;
}

function calculateSkillRating(user: User): number {
  return user.eloRating || 1500;
}

function calculateRecentPerformance(user: User): number {
  const recentGames = user.recentGames || [];
  return recentGames
    .slice(-10)
    .reduce((score, game) => score + (game.won ? 1 : -1), 0);
}

function hasPlayerWon(playerState: PlayerState, gameType?: GameType): boolean {
  // CRITICAL: For CLASSIC variant, ONLY check if all pieces are home (NEVER by points)
  // This check must come FIRST to prevent any points-based winning for Classic games
  if (playerState.variant === GameVariant.CLASSIC) {
    const allPiecesHome = playerState.pieces.every((position) => position === 57);
    logger.info('DEBUG CLASSIC win check (ONLY pieces-based):', { 
      allPiecesHome, 
      pieces: playerState.pieces,
      variant: playerState.variant,
      points: playerState.points,
      gameTypePointsToWin: gameType?.pointsToWin,
      message: 'Classic games can ONLY win by getting all pieces home, never by points'
    });
    return allPiecesHome; // 57 is the home position
  }
  // For QUICK variant, check completion mode: timer-based vs points-based
  if (playerState.variant === GameVariant.QUICK) {
    // If timer is enabled, the game will end by timer expiry (not by reaching points)
    const isTimerEnabled = gameType?.rules?.quickGameTimerEnabled !== false; // Default to enabled
    
    if (isTimerEnabled) {
      // Timer-based QUICK games: Never complete by reaching points threshold
      // Game completion will be handled by QuickGameTimerService when timer expires
      return false;
    } else {
      // Points-based QUICK games: Complete when reaching points threshold
      const pointsThreshold = gameType?.quickGamePoints || 200; // Use game type's quick points or default
      return (playerState.points || 0) >= pointsThreshold;
    }
  }

  // REMOVED - CLASSIC check moved to top of function

  // For other variants (like KILL) that use points-based winning (configurable from game type)
  // Note: This should never apply to CLASSIC games
  if (gameType?.pointsToWin && gameType.pointsToWin > 0) {
    logger.info('DEBUG points-based win check for non-classic variant:', { 
      variant: playerState.variant,
      points: playerState.points, 
      pointsToWin: gameType.pointsToWin,
      hasWon: (playerState.points || 0) >= gameType.pointsToWin
    });
    return (playerState.points || 0) >= gameType.pointsToWin;
  }
  
  // Fallback: check if all pieces are home
  const allPiecesHome = playerState.pieces.every((position) => position === 57);
  logger.info('DEBUG fallback win check:', { 
    variant: playerState.variant,
    allPiecesHome, 
    pieces: playerState.pieces 
  });
  return allPiecesHome;
}

function checkForKills(
  gameState: GameState,
  userId: string,
  position: number,
  playerIndex: number,
  totalPlayers: number
): string[] {
  const kills: string[] = [];
  Object.entries(gameState.players).forEach(([playerId, state]) => {
    if (playerId !== userId) {
      const defenderPlayerIndex = state.position;
      state.pieces.forEach((piece, index) => {
        if (
          piece === position &&
          piece !== 0 &&
          !isPieceAtHome(piece, defenderPlayerIndex, totalPlayers)
        ) {
          // Check if capture is allowed using path system
          if (
            canCapture(
              position,
              piece,
              playerIndex,
              defenderPlayerIndex,
              totalPlayers
            )
          ) {
            state.pieces[index] = 0;
            state.tokenPositions[index] = 0; // Fix: Also update tokenPositions
            kills.push(playerId);
          }
        }
      });
    }
  });
  return kills;
}

function isValidMove(
  currentPosition: number,
  diceRoll: number,
  playerIndex: number,
  totalPlayers: number
): boolean {
  return isValidPathMove(currentPosition, diceRoll, playerIndex, totalPlayers);
}

function calculatePoints(
  playerState: PlayerState,
  move: TokenMove,
  gameState: GameState
): number {
  let points = 0;
  const gameType = gameState.customRules;
  const distanceMoved = move.toPosition - move.fromPosition;

  // Points for moving a token out of home (opening a token)
  if (move.fromPosition === 0 && move.toPosition > 0) {
    points += gameType?.captureReward || 10;
  }

  // Points for token movement
  if (distanceMoved > 0) {
    // Only add distance points if not moving from home (position 0)
    if (move.fromPosition !== 0) {
      points += distanceMoved;
    }
  }

  // Points for capturing opponent's token
  if (move.kills > 0) {
    // Base points for capture
    points += (gameType?.captureReward || 10) * move.kills;

    // Additional points based on the distance the captured token had moved
    const killedTokens = gameState.moveHistory
      .filter(
        (m) => m.playerId !== playerState.userId && m.tokenId === move.tokenId
      )
      .slice(-1); // Get the last move of the killed token

    if (killedTokens.length > 0) {
      const killedTokenMove = killedTokens[0];
      const killedTokenDistance =
        killedTokenMove.toPosition - killedTokenMove.fromPosition;
      points += killedTokenDistance; // Add points equal to the distance the killed token had moved
    }
  }

  // Points for reaching home
  if (move.toPosition === 57) {
    points += gameType?.classicBonusPoints || 20;
  }

  // Points for landing on special squares
  const specialSquare = gameState.specialSquares[move.toPosition];
  if (specialSquare) {
    switch (specialSquare.type) {
      case "bonus":
        points += specialSquare.points || 5;
        break;
      case "kill":
        points += gameType?.killModeBonus || 15;
        break;
    }
  }

  // Penalty points for being captured
  if (move.fromPosition > 0 && move.toPosition === 0) {
    points -= gameType?.classicPenaltyPoints || 5;
  }

  return points;
}

function checkValidMoves(
  playerState: PlayerState,
  diceRoll: number,
  totalPlayers: number
): boolean {
  const playerIndex = playerState.position;
  console.log(
    `checkValidMoves: playerIndex=${playerIndex}, diceRoll=${diceRoll}, totalPlayers=${totalPlayers}`
  );
  console.log(`checkValidMoves: pieces=`, playerState.pieces);

  const validMoves = getValidMovesForPlayer(
    playerState.pieces,
    diceRoll,
    playerIndex,
    totalPlayers
  );
  console.log(`checkValidMoves: validMoves found=`, validMoves);

  return validMoves.length > 0;
}

function getNextPlayer(
  players: GamePlayers[],
  currentPlayerId: string
): string {
  // Get active players and sort them by position to ensure position-based turn order
  const activePlayers = players
    .filter((p) => p.isActive)
    .sort((a, b) => a.position - b.position);

  const currentIndex = activePlayers.findIndex(
    (p) => p.userId === currentPlayerId
  );

  // If player not found or is the last player, return the first player (position 0)
  if (currentIndex === -1 || currentIndex === activePlayers.length - 1) {
    return activePlayers[0].userId;
  }

  // Otherwise return the next player in position order
  return activePlayers[currentIndex + 1].userId;
}

// Game State Management Functions
function updateGameStateWithDiceRoll(
  variant: GameVariant,
  currentState: GameState,
  userId: string,
  diceResult: number
): GameState {
  const updatedState: GameState = {
    ...currentState,
    diceRoll: diceResult,
    lastMoveTime: new Date(),
  };

  // Update move history
  updatedState.moveHistory = [
    ...updatedState.moveHistory,
    {
      playerId: userId,
      tokenId: -1,
      fromPosition: -1,
      toPosition: -1,
      kills: 0,
      timestamp: new Date(),
      diceValue: diceResult,
    },
  ];

  if (variant === GameVariant.QUICK) {
    const playerState = updatedState.players[userId];
    if (playerState) {
      playerState.points =
        (playerState.points || 0) + (diceResult === 6 ? 2 : 1);
    }
  }

  // Handle variant-specific rules
  if (diceResult === 6) {
    updatedState.consecutiveSixes += 1;
  } else {
    updatedState.consecutiveSixes = 0;
  }

  return updatedState;
}

function updateGameStateWithPieceMovement(
  variant: GameVariant,
  gameState: GameState,
  userId: string,
  pieceId: number
): GameState {
  const now = new Date();
  const updatedState = { ...gameState };
  const playerState = updatedState.players[userId];
  const currentPosition = playerState.pieces[pieceId];
  const playerIndex = playerState.position;
  const totalPlayers = Object.keys(updatedState.players).length;
  const newPosition = calculateNextPosition(
    currentPosition,
    updatedState.diceRoll,
    playerIndex,
    totalPlayers
  );

  // Update piece position
  playerState.pieces[pieceId] = newPosition;
  playerState.tokenPositions[pieceId] = newPosition;

  // Check for kills
  const kills = checkForKills(
    updatedState,
    userId,
    newPosition,
    playerIndex,
    totalPlayers
  );

  // Create move record
  const move: TokenMove = {
    playerId: userId,
    tokenId: pieceId,
    fromPosition: currentPosition,
    toPosition: newPosition,
    kills: kills.length,
    timestamp: now,
    diceValue: updatedState.diceRoll,
    isBonus: updatedState.diceRoll === 6,
  };

  // Update history and state
  updatedState.moveHistory = [...updatedState.moveHistory, move];
  updatedState.lastMoveTime = now;

  // Calculate and update points
  // New points system: points equal to dice value moved
  // Calculate base points from all token positions
  let totalPlayerPoints = 0;
  playerState.pieces.forEach(position => {
    totalPlayerPoints += position; // Each token contributes its position value as points
  });
  
  let killBonusPoints = 0; // Track bonus points from kills
  
  // Handle kill mechanics - deduct points based on token position when killed
  if (kills.length > 0) {
    kills.forEach(killedPlayerId => {
      const killedPlayer = updatedState.players[killedPlayerId];
      if (killedPlayer) {
        // The killed token was at newPosition, so use that as the points to transfer
        const killedTokenPoints = newPosition;
        
        // Get kill bonus from game rules  
        const killBonus = updatedState.customRules?.captureReward || 10;
        
        // Killer gains: killed token's points + kill bonus
        killBonusPoints += killedTokenPoints + killBonus;
        
        // Recalculate killed player's total points after token reset (token is now at 0)
        let killedPlayerNewTotal = 0;
        killedPlayer.pieces.forEach(position => {
          killedPlayerNewTotal += position;
        });
        killedPlayer.points = killedPlayerNewTotal;
        
        logger.info(`Kill mechanic: Player ${userId} gained ${killedTokenPoints + killBonus} points (${killedTokenPoints} from token + ${killBonus} bonus) from killing player ${killedPlayerId}'s token. Killed player points updated to: ${killedPlayerNewTotal}`);
      }
    });
  }
  // Update player's total points: base points from all tokens + kill bonuses
  playerState.points = totalPlayerPoints + killBonusPoints;

  // Update kills count
  if (kills.length > 0) {
    playerState.kills = (playerState.kills || 0) + kills.length;
  }

  return updatedState;
}

function initializeGameState(
  variant: GameVariant,
  gameTypeData: GameType
): GameState {
  const now = new Date();
  return {
    players: {},
    currentPlayer: "",
    turnOrder: [],
    diceRoll: 0,
    winner: null,
    gameStartTime: now,
    lastMoveTime: now,
    timePerMove: gameTypeData.timePerMove || 30,
    status: GameStatus.WAITING,
    variant: variant,
    minPlayers: gameTypeData.minPlayers || 2,
    customRules: {
      skipTurnOnSix: gameTypeData.rules?.skipTurnOnSix || false,
      multipleTokensPerSquare:
        gameTypeData.rules?.multipleTokensPerSquare || false,
      safeZoneRules: gameTypeData.rules?.safeZoneRules || "standard",
      captureReward: gameTypeData.rules?.captureReward || 10,
      bonusTurnOnSix: gameTypeData.rules?.bonusTurnOnSix || true,
      timeoutPenalty: gameTypeData.rules?.timeoutPenalty || 5,
      reconnectionTime: gameTypeData.rules?.reconnectionTime || 60,
      disqualificationMoves: gameTypeData.rules?.disqualificationMoves || 3,
      winningAmount: gameTypeData.rules?.winningAmount || 0,
      rankingPoints: {
        first: gameTypeData.rules?.rankingPoints?.first || 100,
        second: gameTypeData.rules?.rankingPoints?.second || 60,
        third: gameTypeData.rules?.rankingPoints?.third || 30,
        fourth: gameTypeData.rules?.rankingPoints?.fourth || 10,
      },
      killModeEnabled: variant === GameVariant.KILL,
      livesPerPlayer:
        variant === GameVariant.KILL ? gameTypeData.lifeCount || 3 : undefined,
    },
    consecutiveSixes: 0,
    moveHistory: [],
    allPlayersReady: false,
    specialSquares: {},
    maxMoves: gameTypeData.maxMoves || 50,
    timeLimit: gameTypeData.timeLimit || 600,
    turnTimeLimit: gameTypeData.turnTimeLimit || 30,
    moveCount: 0,
    pointsToWin: gameTypeData.pointsToWin || 100,
    roomCode: generateRoomCode(),
    isPrivate: false,
    password: "",
    entryFee: gameTypeData.entryFee || 0,
    maxPlayers: gameTypeData.maxPlayers || 4,
  };
}

async function handlePlayerDisconnection(userId: string): Promise<void> {
  try {
    logger.info(`Handling disconnection for user ${userId}`);
    await ensureInitialized();

    // 1. Remove from matchmaking queue if present (Redis)
    await removePlayerFromQueueRedis(userId);
    logger.info(`Player ${userId} removed from matchmaking queue (Redis)`);
    // Notify other players in queue about the removal
    try {
      getSocketService().emitMatchmakingUpdate({
        type: "LEFT_QUEUE",
        userId,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to emit queue leave event:", error);
    }

    // 2. Handle active game cleanup
    const game = await findActiveGameForUser(userId);
    if (!game) {
      return;
    }
    const gamePlayer = game.players.find((p) => p.userId === userId);
    if (!gamePlayer) {
      return;
    }
    if (game.status === GameStatus.WAITING) {
      try {
        // First, remove the player entry completely
        await gamePlayerRepository.delete({
          gameId: game.id,
          userId: userId,
        });

        // Update game state
        const updatedState = { ...game.state };
        delete updatedState.players[userId];
        updatedState.turnOrder = updatedState.turnOrder.filter(
          (id) => id !== userId
        );
        game.state = updatedState;

        // Remove from playerIds array
        game.playerIds = game.playerIds.filter((id) => id !== userId);
        await gameRepository.save(game);

        // Check remaining players
        const remainingPlayers = await gamePlayerRepository
          .createQueryBuilder("player")
          .where("player.gameId = :gameId", { gameId: game.id })
          .andWhere("player.isActive = true")
          .getMany();

        // If no active players left, clean up the game
        if (remainingPlayers.length === 0) {
          game.status = GameStatus.COMPLETED;
          game.endTime = new Date();
          await gameRepository.save(game);
          logger.info(`Game ${game.id} completed - no active players`);
        }

        // Notify other players
        getSocketService().emitGameStateUpdate(game.roomCode, {
          type: "PLAYER_LEFT",
          gameId: game.id,
          roomCode: game.roomCode,
          player: {
            id: userId,
            position: gamePlayer.position,
          },
          timestamp: new Date(),
        });

        logger.info(
          `Player ${userId} removed from game ${game.id} in waiting state`
        );
      } catch (error) {
        logger.error("Error cleaning up disconnected player:", error);
        throw error;
      }
    } else if (game.status === GameStatus.IN_PROGRESS) {
      // Handle disconnection during active game
      const disconnectionState: DisconnectionState = {
        disconnectedAt: new Date(),
        canRejoin: true,
        gameId: game.id,
        position: gamePlayer.position,
      };
      await setDisconnectedPlayer(userId, disconnectionState);

      // Update player state to inactive
      gamePlayer.isActive = false;
      await gamePlayerRepository.save(gamePlayer);

      // Notify other players
      getSocketService().emitGameStateUpdate(game.roomCode, {
        type: "PLAYER_DISCONNECTED",
        gameId: game.id,
        roomCode: game.roomCode,
        player: {
          id: userId,
          position: gamePlayer.position,
        },
        reconnectionTimeout: game.state.customRules.reconnectionTime,
        timestamp: new Date(),
      });

      // Start reconnection timeout
      setTimeout(async () => {
        await handleReconnectionTimeout(userId, game.id);
      }, game.state.customRules.reconnectionTime * 1000);

      logger.info(
        `Player ${userId} marked as disconnected in active game ${game.id}`
      );
    }
  } catch (error) {
    logger.error("Error handling player disconnection:", error);
    throw error;
  }
}

async function handleReconnectionTimeout(userId: string, gameId: string) {
  const state = await getDisconnectedPlayer(userId);
  if (!state) {
    return;
  }

  const currentGame = await gameRepository.findOne({
    where: { id: gameId },
    relations: ["players"],
  });

  if (!currentGame || currentGame.status !== GameStatus.IN_PROGRESS) {
    await removeDisconnectedPlayer(userId);
    return;
  }

  const currentPlayer = currentGame.players.find((p) => p.userId === userId);
  if (!currentPlayer || !currentPlayer.isActive) {
    // Auto-forfeit after reconnection timeout
    await handlePlayerForfeit(gameId, userId);
  }
  await removeDisconnectedPlayer(userId);
}

async function handlePlayerForfeit(
  gameId: string,
  userId: string
): Promise<void> {
  const game = await gameRepository.findOne({
    where: { id: gameId },
    relations: ["players"],
  });

  if (!game) {
    return;
  }

  const gamePlayer = game.players.find((p) => p.userId === userId);
  if (!gamePlayer) {
    return;
  }

  gamePlayer.isActive = false;
  await gamePlayerRepository.save(gamePlayer);

  // Update game state
  const gameState = game.state as GameState;
  if (gameState.currentPlayer === userId) {
    gameState.currentPlayer = getNextPlayer(game.players, userId);
  }

  // Remove player from turn order
  gameState.turnOrder = gameState.turnOrder.filter((id) => id !== userId);

  // Check if game should end
  const activePlayers = game.players.filter((p) => p.isActive);
  if (activePlayers.length < game.state.minPlayers) {
    game.status = GameStatus.COMPLETED;
    game.endTime = new Date();

    // Determine winner if only one player remains
    if (activePlayers.length === 1) {
      gameState.winner = activePlayers[0].userId;
    }
  }

  game.state = gameState;
  await gameRepository.save(game);

  // Remove from disconnected players map if exists
  await removeDisconnectedPlayer(userId);

  try {
    getSocketService().emitGameStateUpdate(game.roomCode, {
      type: "PLAYER_FORFEITED",
      gameId: game.id,
      roomCode: game.roomCode,
      player: {
        id: userId,
        position: gamePlayer.position,
      },
      nextPlayer: {
        id: gameState.currentPlayer,
        position: gameState.players[gameState.currentPlayer]?.position || 0,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to emit player forfeit event:", error);
  }
}

async function leaveGame(userId: string): Promise<void> {
  await ensureInitialized();

  // Find the active game for this user
  const activeGame = await findActiveGameForUser(userId);
  if (!activeGame) {
    throw new Error("No active game found to leave");
  }

  // Handle forfeit for this user
  await handlePlayerForfeit(activeGame.id, userId);

  logger.info(`User ${userId} left game ${activeGame.id}`);
}

async function findActiveGameForUser(userId: string): Promise<Game | null> {
  const game = await gameRepository
    .createQueryBuilder("game")
    .leftJoinAndSelect("game.players", "players")
    .where("players.userId = :userId", { userId })
    .andWhere("game.status IN (:...statuses)", {
      statuses: [GameStatus.WAITING, GameStatus.IN_PROGRESS],
    })
    .getOne();

  return game;
}

async function canRejoinGame(
  userId: string
): Promise<{ canRejoin: boolean; gameId?: string }> {
  const disconnectionState = await getDisconnectedPlayer(userId);
  if (!disconnectionState) {
    return { canRejoin: false };
  }

  const game = await gameRepository.findOne({
    where: { id: disconnectionState.gameId },
    relations: ["players"],
  });

  if (!game || game.status !== GameStatus.IN_PROGRESS) {
    await removeDisconnectedPlayer(userId);
    return { canRejoin: false };
  }

  return {
    canRejoin: true,
    gameId: disconnectionState.gameId,
  };
}

async function rejoinGame(gameId: string, userId: string): Promise<Game> {
  const game = await gameRepository.findOne({
    where: { id: gameId },
    relations: ["players"],
  });

  if (!game) {
    throw new Error("Game not found");
  }

  const gamePlayer = game.players.find((p) => p.userId === userId);
  if (!gamePlayer) {
    throw new Error("Player not found in game");
  }

  gamePlayer.isActive = true;
  await gamePlayerRepository.save(gamePlayer);
  await removeDisconnectedPlayer(userId);

  try {
    getSocketService().emitGameStateUpdate(game.roomCode, {
      type: "PLAYER_JOINED",
      gameId: game.id,
      roomCode: game.roomCode,
      player: {
        id: userId,
        position: gamePlayer.position,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to emit player rejoin event:", error);
  }

  return game;
}

async function startQueueUpdates(userId: string): Promise<void> {
  const updateInterval = setInterval(async () => {
    const position = await getQueuePosition(userId);
    if (!position) {
      clearInterval(updateInterval);
      return;
    }
    try {
      const socket = getSocketService();
      await socket.emitMatchmakingUpdate({
        type: "QUEUE_POSITION_UPDATE",
        userId,
        queueStatus: position,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to emit queue position update:", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
      });
    }
  }, 5000);
  setTimeout(() => {
    clearInterval(updateInterval);
  }, 120000);
}

// Update getQueueStatistics to use Redis
async function getQueueStatistics(): Promise<QueueStatistics> {
  const now = new Date();
  const regionStats: { [key: string]: number } = {};
  const variantStats: { [key: string]: number } = {};
  let totalWaitTime = 0;
  const queue = await getQueueFromRedis();
  for (const player of queue) {
    regionStats[player.region] = (regionStats[player.region] || 0) + 1;
    variantStats[player.preferredVariant] =
      (variantStats[player.preferredVariant] || 0) + 1;
    const joinTime = await getQueueJoinTime(player.user.id);
    if (joinTime) {
      totalWaitTime += now.getTime() - joinTime;
    }
  }
  return {
    totalPlayers: queue.length,
    averageWaitTime: queue.length > 0 ? totalWaitTime / queue.length : 0,
    regionStats,
    variantStats,
  };
}

// Update getQueuePosition to use Redis
async function getQueuePosition(userId: string): Promise<QueueStatus | null> {
  const queue = await getQueueFromRedis();
  const playerIndex = queue.findIndex((p) => p.user.id === userId);
  if (playerIndex === -1) return null;
  const player = queue[playerIndex];
  const joinTime = await getQueueJoinTime(userId);
  const now = new Date();
  const waitTime = joinTime ? now.getTime() - joinTime : 0;
  const estimatedWaitTime = Math.max(0, (120000 - waitTime) / 1000);
  return {
    position: playerIndex + 1,
    totalInQueue: queue.length,
    estimatedWaitTime,
    matchmakingRegion: player.region,
    gameVariant: player.preferredVariant,
  };
}

// Update findMatch to use Redis
async function findMatch(player: PlayerInQueue): Promise<Game | null> {
  try {
    const now = new Date();
    const maxWaitTime = 120000; // 2 minutes
    const initialSkillRange = 100;
    const skillRangeIncrement = 50;
    let skillRange = initialSkillRange;

    // Get game type to check min/max players
    const gameType = await gameTypeRepository.findOne({
      where: { id: player.gameTypeId }
    });

    if (!gameType) {
      throw new Error("Game type not found");
    }

    const minPlayers = gameType.minPlayers || 2;
    const maxPlayers = gameType.maxPlayers || 4;

    // Remove player from queue if they're no longer active
    const queue = await getQueueFromRedis();
    const playerStillInQueue = queue.find((p) => p.user.id === player.user.id);
    if (!playerStillInQueue) {
      logger.info(`Player ${player.user.id} no longer in queue`);
      return null;
    }

    while (skillRange <= 1000) {
      // Find potential matches based on criteria
      const potentialMatches = queue.filter(
        (p) =>
          p.user.id !== player.user.id &&
          p.preferredVariant === player.preferredVariant &&
          p.region === player.region &&
          p.gameTypeId === player.gameTypeId &&
          Math.abs(p.skillRating - player.skillRating) <= skillRange
      );

      // For 2-player games, find single match
      if (maxPlayers === 2) {
        if (potentialMatches.length > 0) {
          const match = findBestMatch(
            player,
            potentialMatches,
            now.getTime() - player.joinedAt.getTime()
          );
          if (match) {
            return await createMatchWithPlayers([player, match]);
          }
        }
      } 
      // For 3-4 player games, try to find enough players
      else {
        // First try to find a full game
        if (potentialMatches.length >= maxPlayers - 1) {
          const selectedMatches = selectBestMatches(
            player,
            potentialMatches,
            maxPlayers - 1,
            now.getTime() - player.joinedAt.getTime()
          );
          if (selectedMatches.length === maxPlayers - 1) {
            return await createMatchWithPlayers([player, ...selectedMatches]);
          }
        }
        // Then try to find minimum players
        else if (potentialMatches.length >= minPlayers - 1) {
          const selectedMatches = selectBestMatches(
            player,
            potentialMatches,
            minPlayers - 1,
            now.getTime() - player.joinedAt.getTime()
          );
          if (selectedMatches.length === minPlayers - 1) {
            return await createMatchWithPlayers([player, ...selectedMatches]);
          }
        }
      }

      // Increase skill range and wait before next attempt
      skillRange += skillRangeIncrement;
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if max wait time exceeded
      const joinTime = await getQueueJoinTime(player.user.id);
      if (joinTime && now.getTime() - joinTime > maxWaitTime) {
        logger.info(`Max wait time exceeded for player ${player.user.id}`);
        // Try to match with any available players
        const anyMatches = queue.filter((p) => p.user.id !== player.user.id);
        
        if (maxPlayers === 2 && anyMatches.length > 0) {
          const anyMatch = findBestMatch(player, anyMatches, maxWaitTime);
          if (anyMatch) {
            return await createMatchWithPlayers([player, anyMatch]);
          }
        } else if (anyMatches.length >= minPlayers - 1) {
          const selectedMatches = selectBestMatches(
            player,
            anyMatches,
            minPlayers - 1,
            maxWaitTime
          );
          if (selectedMatches.length === minPlayers - 1) {
            return await createMatchWithPlayers([player, ...selectedMatches]);
          }
        }
      }
    }
    return null;
  } catch (error) {
    logger.error("Error in findMatch:", error);
    return null;
  }
}

// Helper function to create match with multiple players
async function createMatchWithPlayers(players: PlayerInQueue[]): Promise<Game | null> {
  try {
    // Remove all players from queue
    for (const player of players) {
      await removePlayerFromQueueRedis(player.user.id);
    }

    // Create new game
    const newGame = await createGame(
      players.map(p => p.user.id),
      players[0].preferredVariant,
      players[0].gameTypeId
    );

    // Send match found notifications to all players
    for (const player of players) {
      const matchedPlayers = players
        .filter(p => p.user.id !== player.user.id)
        .map(p => p.user.id);
      
      await getSocketService().emitMatchmakingUpdate({
        type: "MATCH_FOUND",
        userId: player.user.id,
        matchedWith: matchedPlayers.length === 1 ? matchedPlayers[0] : matchedPlayers,
        roomCode: newGame.roomCode,
        gameId: newGame.id,
        timestamp: new Date(),
      });
    }

    logger.info(`Created new game ${newGame.id} for ${players.length} matched players`);
    return newGame;
  } catch (error) {
    logger.error("Failed to create game for matched players:", error);
    // Put players back in queue if game creation fails
    for (const player of players) {
      await addPlayerToQueueRedis(player);
    }
    return null;
  }
}

// Helper function to select best matches for multi-player games
function selectBestMatches(
  player: PlayerInQueue,
  potentialMatches: PlayerInQueue[],
  count: number,
  waitTime: number
): PlayerInQueue[] {
  // Sort potential matches by match score
  const scoredMatches = potentialMatches
    .map(match => ({
      match,
      score: calculateMatchScore(player, match, waitTime)
    }))
    .sort((a, b) => b.score - a.score);

  // Return top N matches
  return scoredMatches.slice(0, count).map(m => m.match);
}

function findBestMatch(
  player: PlayerInQueue,
  potentialMatches: PlayerInQueue[],
  waitTime: number
): PlayerInQueue | null {
  const weightedMatches = potentialMatches.map((match) => ({
    match,
    score: calculateMatchScore(player, match, waitTime),
  }));

  weightedMatches.sort((a, b) => b.score - a.score);
  return weightedMatches[0]?.match || null;
}

function calculateMatchScore(
  player1: PlayerInQueue,
  player2: PlayerInQueue,
  waitTime: number
): number {
  const skillDifference = Math.abs(player1.skillRating - player2.skillRating);
  const experienceDifference = Math.abs(
    player1.user.totalGamesPlayed - player2.user.totalGamesPlayed
  );
  const performanceDifference = Math.abs(
    player1.recentPerformance - player2.recentPerformance
  );

  const normalizedSkillDiff = 1 - skillDifference / 1000;
  const normalizedExpDiff =
    1 -
    experienceDifference /
      Math.max(player1.user.totalGamesPlayed, player2.user.totalGamesPlayed);
  const normalizedPerfDiff = 1 - performanceDifference / 20;
  const normalizedWaitTime = Math.min(waitTime / 120000, 1);

  return (
    normalizedSkillDiff * MATCHMAKING_WEIGHTS.skillWeight +
    normalizedExpDiff * MATCHMAKING_WEIGHTS.expWeight +
    normalizedPerfDiff * MATCHMAKING_WEIGHTS.perfWeight +
    normalizedWaitTime * MATCHMAKING_WEIGHTS.waitTimeWeight
  );
}

// Update joinMatchmaking to use Redis
async function joinMatchmaking(
  userId: string,
  preferredVariant: GameVariant,
  region: string,
  gameTypeId: string
): Promise<Game | null> {
  try {
    logger.debug("Starting joinMatchmaking process", {
      userId,
      variant: preferredVariant,
      region,
      gameTypeId,
    });
    await ensureInitialized();
    // Check if user is already in an active game - if so, automatically leave it
    const activeGame = await findActiveGameForUser(userId);
    if (activeGame) {
      logger.info(
        `User ${userId} is already in an active game ${activeGame.id}, automatically leaving to join new matchmaking`
      );
      try {
        await handlePlayerForfeit(activeGame.id, userId);
        logger.info(
          `User ${userId} automatically left game ${activeGame.id} to join matchmaking`
        );
      } catch (error) {
        logger.error(`Failed to leave active game for user ${userId}:`, error);
        throw new Error("Failed to leave current game. Please try again.");
      }
    }
    // Check if user is already in queue - remove from old queue and clean up (Redis)
    await removePlayerFromQueueRedis(userId);
    await removePlayerFromDatabase(userId);
    // Emit queue left event
    try {
      const socket = getSocketService();
      await socket.emitMatchmakingUpdate({
        type: "LEFT_QUEUE",
        userId,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to emit queue left event:", error);
    }
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }
    const gameType = await gameTypeRepository.findOne({
      where: { id: gameTypeId, isActive: true },
    });
    if (!gameType) {
      throw new Error("Invalid or inactive game type");
    }
    const skillRating = calculateSkillRating(user);
    const recentPerformance = calculateRecentPerformance(user);
    const playerInQueue: PlayerInQueue = {
      user,
      joinedAt: new Date(),
      skillRating,
      preferredVariant,
      region,
      recentPerformance,
      gameTypeId,
    };
    // Check for existing games that need more players
    const availableGames = await gameRepository.find({
      where: {
        status: GameStatus.WAITING,
        variant: preferredVariant,
        gameTypeId: gameTypeId,
      },
      relations: ["players"],
    });
    for (const game of availableGames) {
      if (game.players.length < game.maxPlayers && !game.isPrivate) {
        try {
          const joinedGame = await joinGame(game.id, userId);
          logger.info(`User ${userId} joined existing game ${game.id}`);
          return joinedGame;
        } catch (error) {
          logger.error(`Failed to join existing game ${game.id}:`, error);
          continue;
        }
      }
    }
    // If no suitable game found, add to queue (Redis and DB)
    await addPlayerToQueueRedis(playerInQueue);
    await persistPlayerToDatabase(playerInQueue);
    try {
      const socket = getSocketService();
      await socket.emitMatchmakingUpdate({
        type: "JOINED_QUEUE",
        userId,
        queueStatus: await getQueuePosition(userId),
        timestamp: new Date(),
      });
      // Start queue position updates
      startQueueUpdates(userId);
      // Try to find a match immediately
      const match = await findMatch(playerInQueue);
      if (match) {
        await redisClient.hdel(REDIS_QUEUE_JOIN_TIMES, userId);
        await socket.emitMatchmakingUpdate({
          type: "MATCH_FOUND",
          userId,
          matchedWith: match.players[0].userId,
          roomCode: match.roomCode,
          gameId: match.id,
          timestamp: new Date(),
        });
        logger.info(`Match found for user ${userId} with game ${match.id}`);
        return match;
      }
      logger.info(`User ${userId} added to matchmaking queue (Redis)`);
      return null;
    } catch (error) {
      // If socket error occurs, still keep player in queue but log error
      logger.error("Socket service error in matchmaking:", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
      });
      return null;
    }
  } catch (error) {
    logger.error("Error in joinMatchmaking:", error);
    // Remove from queue if error occurs (Redis)
    await removePlayerFromQueueRedis(userId);
    await removePlayerFromDatabase(userId);
    throw error;
  }
}

// Update leaveMatchmaking to use Redis
async function leaveMatchmaking(userId: string): Promise<void> {
  await removePlayerFromQueueRedis(userId);
  // Also remove from database queue
  await removePlayerFromDatabase(userId);
  try {
    getSocketService().emitMatchmakingUpdate({
      type: "LEFT_QUEUE",
      userId,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to emit queue leave event:", { error, userId });
  }
}

async function rollDice(
  gameId: string,
  userId: string
): Promise<DiceRollResult> {
  await ensureInitialized();

  const game = await gameRepository.findOne({
    where: { id: gameId },
    relations: ["players", "gameType"],
  });

  if (!game) {
    throw new Error("Game not found");
  }

  if (game.status !== GameStatus.IN_PROGRESS) {
    throw new Error(`Game is not in progress. Current status: ${game.status}`);
  }

  const gameState = game.state as GameState;
  if (gameState.currentPlayer !== userId) {
    throw new Error("It's not your turn");
  }

  if (gameState.diceRoll !== 0) {
    throw new Error("You have already rolled the dice");
  }

  // Clear any existing timeout for the current player since they took action
  // DO NOT clear timeout when rolling dice - timer should continue until player moves piece
  // turnTimeoutManager.clearTimeout(gameId, "turn_action");

  const diceResult = Math.floor(Math.random() * 6) + 1;
  const playerState = gameState.players[userId];
  const totalPlayers = Object.keys(gameState.players).length;
  const hasValidMoves = checkValidMoves(playerState, diceResult, totalPlayers);

  // Calculate actual valid moves for the frontend
  const playerIndex = playerState.position;
  const validMovesData = getValidMovesForPlayer(
    playerState.pieces,
    diceResult,
    playerIndex,
    totalPlayers
  );

  // Convert backend format (pieceIndex) to frontend format (pieceId)
  const convertedValidMoves = validMovesData.map((move, index) => {
    const playerColor =
      playerState.position === 0
        ? "R"
        : playerState.position === 1
        ? "G"
        : playerState.position === 2
        ? "Y"
        : "B";
    return {
      pieceId: `${playerColor}${move.pieceIndex + 1}`,
      currentPos: move.currentPos,
      nextPos: move.nextPos,
    };
  });

  // Emit dice roll event through socket
  try {
    getSocketService().emitGameStateUpdate(game.roomCode, {
      type: "DICE_ROLLED",
      gameId,
      roomCode: game.roomCode,
      player: {
        id: userId,
        position: playerState.position,
      },
      diceResult,
      hasValidMoves,
      validMoves: convertedValidMoves,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to emit dice roll update:", { error, gameId, userId });
  }

  game.state = updateGameStateWithDiceRoll(
    game.variant,
    gameState,
    userId,
    diceResult
  );

  if (!hasValidMoves) {
    game.state.currentPlayer = getNextPlayer(game.players, userId);
    game.state.diceRoll = 0;

    // Emit game state update for turn change in movePiece
    try {
      getSocketService().emitGameStateUpdate(game.roomCode, {
        type: "TURN_CHANGED",
        gameId,
        roomCode: game.roomCode,
        player: {
          id: userId,
          position: game.state.players[userId].position,
        },
        nextPlayer: {
          id: game.state.currentPlayer,
          position: game.state.players[game.state.currentPlayer]?.position || 0,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to emit turn change update in movePiece:", { error, gameId });
    }

    // Clear any existing timeout for the current player
    turnTimeoutManager.clearTimeout(gameId, "turn_action");

    // Emit turn change event through socket
    try {
      getSocketService().emitTurnChange(
        game.roomCode,
        game.state.currentPlayer,
        gameId
      );
      
      // Emit game state update for turn change
      getSocketService().emitGameStateUpdate(game.roomCode, {
        type: "TURN_CHANGED",
        gameId,
        roomCode: game.roomCode,
        player: {
          id: userId,
          position: game.state.players[userId].position,
        },
        nextPlayer: {
          id: game.state.currentPlayer,
          position: game.state.players[game.state.currentPlayer]?.position || 0,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to emit turn change:", { error, gameId });
    }

    // Start timeout for the next player
    const nextPlayer = game.state.currentPlayer;
    if (nextPlayer) {
      const timeoutDuration = game.turnTimeLimit || 30; // Default 30 seconds
      await turnTimeoutManager.startTurnTimeout(game, nextPlayer);
      logger.info(`Started turn timeout for next player ${nextPlayer} after dice roll with no valid moves`);
    }
  } else {
    // Player has valid moves, continue with the same timeout (don't restart)
    // The timer should keep running for the entire turn duration
    logger.info(`Player ${userId} has valid moves, timer continues running`);
  }

  await gameRepository.save(game);

  return {
    diceResult,
    gameState: game.state,
    hasValidMoves,
  };
}

async function movePiece(
  gameId: string,
  userId: string,
  pieceId: number
): Promise<MoveResult> {
  const game = await gameRepository.findOne({
    where: { id: gameId },
    relations: ["players", "gameType"],
  });

  if (!game) {
    throw new Error("Game not found");
  }

  if (game.status !== GameStatus.IN_PROGRESS) {
    throw new Error("Game is not in progress");
  }

  const gameState = game.state as GameState;
  if (gameState.currentPlayer !== userId) {
    throw new Error("It's not your turn");
  }

  // DO NOT clear timeout here - timer should continue running for entire turn duration
  // Timer will only be cleared when turn actually changes or timeout occurs
  // Don't clear timeout here - let the bonus turn logic decide whether to clear or reset timer

  const playerState = gameState.players[userId];
  const currentPosition = playerState.pieces[pieceId];
  const playerIndex = playerState.position;
  const totalPlayers = Object.keys(gameState.players).length;

  console.log(
    `Debug movePiece: Player ${userId}, position ${playerIndex}, totalPlayers ${totalPlayers}, currentPos ${currentPosition}, diceRoll ${gameState.diceRoll}`
  );

  if (
    !isValidMove(currentPosition, gameState.diceRoll, playerIndex, totalPlayers)
  ) {
    throw new Error("Invalid move");
  }

  const newPosition = calculateNextPosition(
    currentPosition,
    gameState.diceRoll,
    playerIndex,
    totalPlayers
  );
  console.log(`Debug movePiece: Calculated new position ${newPosition}`);

  const kills = checkForKills(
    gameState,
    userId,
    newPosition,
    playerIndex,
    totalPlayers
  );

  const move: TokenMove = {
    playerId: userId,
    tokenId: pieceId,
    fromPosition: currentPosition,
    toPosition: newPosition,
    kills: kills.length,
    timestamp: new Date(),
  };

  // Update game state with piece movement FIRST
  game.state = updateGameStateWithPieceMovement(
    game.variant,
    gameState,
    userId,
    pieceId
  );

  // Calculate and update points after state is updated
  const pointsEarned = calculatePoints(playerState, move, gameState);
  game.state.players[userId].points =
    (game.state.players[userId].points || 0) + pointsEarned;

  // FIXED POINT SYSTEM: Override incorrect calculations with step-based system
  updateAllPlayersPointsCorrectly(game.state);

  // Add kill bonuses for current player if there were kills
  if (kills.length > 0) {
    const killBonus = gameState.customRules?.captureReward || 10;
    const bonusPoints = kills.length * killBonus;
    game.state.players[userId].points += bonusPoints;
    
    logger.info(`FIXED POINTS: Player ${userId} gained ${bonusPoints} kill bonus points from ${kills.length} kills`);
  }


  if (game.state.players[userId]) {
    game.state.players[userId].kills =
      (game.state.players[userId].kills || 0) + kills.length;
  }

  // CRITICAL: Check if player won (this might be the cause of unexpected game completion)
  if (hasPlayerWon(game.state.players[userId], game.gameType)) {
    const playerState = game.state.players[userId];
    logger.info(`GAME COMPLETION TRIGGERED: Player ${userId} won game ${game.id}`, {
      variant: playerState.variant,
      points: playerState.points,
      pieces: playerState.pieces,
      winCondition: playerState.variant === GameVariant.QUICK 
        ? `Reached ${game.gameType?.quickGamePoints || 200}+ points` 
        : playerState.variant === GameVariant.CLASSIC
          ? 'All pieces home (traditional Ludo rule)'
          : game.gameType?.pointsToWin && game.gameType.pointsToWin > 0 
            ? `Reached ${game.gameType.pointsToWin}+ points` 
            : 'All pieces home',
      allPiecesHome: playerState.pieces.every(pos => pos === 57),
      isClassicVariant: playerState.variant === GameVariant.CLASSIC,
      gameTypePointsToWin: game.gameType?.pointsToWin
    });
    game.state.winner = userId;
    game.status = GameStatus.COMPLETED;
    game.endTime = new Date();

    await updateUserStats(game.players, game);
    await handleGameCompletion(game);
  }

  // Check if player should get another turn (rolled 6, captured opponent, or reached home)
  const rolledSix = gameState.diceRoll === 6;
  const capturedOpponent = kills.length > 0;
  const reachedHome = isPieceAtHome(newPosition, playerIndex, totalPlayers);

  // Player gets another turn if they rolled 6, captured someone, or reached home
  // But only if they still have valid moves available and haven't won the game
  const hasRemainingMoves = checkValidMoves(
    game.state.players[userId],
    6,
    totalPlayers
  );
  const hasWon = hasPlayerWon(game.state.players[userId], game.gameType);

  const shouldKeepTurn =
    (rolledSix || capturedOpponent || reachedHome) &&
    hasRemainingMoves &&
    !hasWon;

  console.log(
    `Turn decision: rolledSix=${rolledSix}, capturedOpponent=${capturedOpponent}, reachedHome=${reachedHome}, hasRemainingMoves=${hasRemainingMoves}, hasWon=${hasWon}, shouldKeepTurn=${shouldKeepTurn}`
  );

  if (!shouldKeepTurn) {
    // Change turn to next player
    game.state.currentPlayer = getNextPlayer(game.players, userId);

    // Clear any existing timeout for the current player
    turnTimeoutManager.clearTimeout(gameId, "turn_action");

    // Start timeout for the next player
    const nextPlayer = game.state.currentPlayer;
    if (nextPlayer) {
      const timeoutDuration = game.turnTimeLimit || 30; // Default 30 seconds
      await turnTimeoutManager.startTurnTimeout(game, nextPlayer);
    }

    // Reset dice roll only when turn changes
    game.state.diceRoll = 0;

    // Emit game state update for turn change in movePiece
    try {
      getSocketService().emitGameStateUpdate(game.roomCode, {
        type: "TURN_CHANGED",
        gameId,
        roomCode: game.roomCode,
        player: {
          id: userId,
          position: game.state.players[userId].position,
        },
        nextPlayer: {
          id: game.state.currentPlayer,
          position: game.state.players[game.state.currentPlayer]?.position || 0,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to emit turn change update in movePiece:", { error, gameId });
    }
  } else {
    // Debug: Bonus turn detected
    console.log(`Bonus turn detected for player ${userId}: rolledSix=${rolledSix}, capturedOpponent=${capturedOpponent}, reachedHome=${reachedHome}`);
    // Player gets another turn (rolled 6), clear timeout and start a new one
    turnTimeoutManager.clearTimeout(gameId, "turn_action");
    const timeoutDuration = game.turnTimeLimit || 30; // Default 30 seconds for dice roll
    await turnTimeoutManager.resetTimeoutForBonus(gameId, userId);

    // Keep dice roll as 0 so player can roll again
    game.state.diceRoll = 0;

    // FIXED: Don't emit TURN_CHANGED for bonus turns - it confuses the frontend
    logger.info(`Player ${userId} gets bonus turn - ready for next dice roll, no turn change needed`);
    //     // Emit game state update for turn change in movePiece
    //     try {
    //       getSocketService().emitGameStateUpdate(game.roomCode, {
    //         type: "TURN_CHANGED",
    //         gameId,
    //         roomCode: game.roomCode,
    //         player: {
    //           id: userId,
    //           position: game.state.players[userId].position,
    //         },
    //         nextPlayer: {
    //           id: game.state.currentPlayer,
    //           position: game.state.players[game.state.currentPlayer]?.position || 0,
    //         },
    //         timestamp: new Date(),
    //       });
    //     } catch (error) {
    //       logger.error("Failed to emit turn change update in movePiece:", { error, gameId });
    //     }
  }

  // SAVE GAME STATE TO DATABASE FIRST
  await gameRepository.save(game);

  // THEN emit socket events after database is updated
  // Emit piece movement through socket
  try {
    getSocketService().emitGameStateUpdate(game.roomCode, {
      type: "PIECE_MOVED",
      gameId,
      roomCode: game.roomCode,
      player: {
        id: userId,
        position: game.state.players[userId].position,
      },
      kills: kills.map((playerId) => ({
        playerId,
        position: newPosition,
      })),
    });
  } catch (error) {
    logger.error("Failed to emit piece moved update:", {
      error,
      gameId,
      userId,
    });
  }

  if (kills.length > 0) {
    // Emit capture event through socket
    try {
      getSocketService().emitGameStateUpdate(game.roomCode, {
        type: "PLAYER_CAPTURED",
        gameId,
        roomCode: game.roomCode,
        player: {
          id: userId,
          position: game.state.players[userId].position,
        },
        kills: kills.map((piece) => ({
          playerId: piece,
          position: newPosition,
        })),
      });
    } catch (error) {
      logger.error("Failed to emit player captured update:", {
        error,
        gameId,
        userId,
      });
    }
  }

  if (game.status === GameStatus.COMPLETED) {
    // Emit game completion through socket
    try {
      getSocketService().emitGameCompleted(game.roomCode, {
        gameId,
        winner: {
          id: userId,
          position: game.state.players[userId].position,
        },
        finalState: game.state,
        endTime: game.endTime!,
      });
    } catch (error) {
      logger.error("Failed to emit game completed:", { error, gameId, userId });
    }
  }

  if (!shouldKeepTurn) {
    // Emit turn change event through socket
    try {
      getSocketService().emitTurnChange(
        game.roomCode,
        game.state.currentPlayer,
        gameId
      );
      
      // Emit game state update for turn change
      getSocketService().emitGameStateUpdate(game.roomCode, {
        type: "TURN_CHANGED",
        gameId,
        roomCode: game.roomCode,
        player: {
          id: userId,
          position: game.state.players[userId].position,
        },
        nextPlayer: {
          id: game.state.currentPlayer,
          position: game.state.players[game.state.currentPlayer]?.position || 0,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to emit turn change:", { error, gameId });
    }
  }

  return {
    gameState: game.state,
    move,
    kills: kills.length,
  };
}

async function createGame(
  userIds: string[],
  variant: GameVariant,
  gameTypeId: string
): Promise<Game> {
  await ensureInitialized();

  const users = await userRepository.findByIds(userIds);
  if (users.length !== userIds.length) {
    throw new Error("One or more users not found");
  }

  const gameType = await gameTypeRepository.findOne({
    where: { id: gameTypeId },
  });

  if (!gameType) {
    throw new Error("Game type not found");
  }

  // Note: Entry fee will be deducted when the game actually starts, not during creation

  const initialGameState = initializeGameState(variant, gameType);

  const game = await gameRepository.save({
    status: GameStatus.WAITING,
    variant,
    gameTypeId,
    state: initialGameState,
    startTime: new Date(),
    maxPlayers: gameType.maxPlayers || 2,
    entryFee: gameType.entryFee || 0,
    roomCode: generateRoomCode(),
  });

  const gameColors: GameColor[] = [
    GameColor.RED,
    GameColor.GREEN,
    GameColor.YELLOW,
    GameColor.BLUE,
  ];

  const gamePlayers = users.map((user, index) =>
    gamePlayerRepository.create({
      userId: user.id,
      username: user.username,
      position: index,
      isActive: true,
      tokenPositions: [0, 0, 0, 0],
      joinedAt: new Date(),
      gameId: game.id,
      color: gameColors[index],
    })
  );

  const savedPlayers = await gamePlayerRepository.save(gamePlayers);
  game.players = savedPlayers;

  getSocketService().emitSystemMessage(
    game.roomCode,

    {
      message: `Game created with type: ${gameType.name}. Waiting for players to join.`,
      type: "WAITING",
      status: "INFO",
    }
  );

  return game;
}

async function getActiveGames(): Promise<Game[]> {
  await ensureInitialized();

  return gameRepository.find({
    where: { status: GameStatus.WAITING },
    relations: ["players"],
  });
}

async function createCustomRoom(
  userId: string,
  entryFee: number,
  maxPlayers: number,
  variant: GameVariant,
  isPrivate: boolean = false,
  password?: string,
  customRules?: any
): Promise<Game> {
  await ensureInitialized();

  const user = await userRepository.findOne({
    where: { id: userId },
    relations: ["games"],
  });

  if (!user) {
    throw new Error("User not found");
  }

  const activeGame = user.games?.find(
    (game: Game) => game.status !== GameStatus.COMPLETED
  );
  if (activeGame) {
    throw new Error("User is already in an active game");
  }

  let roomCode: string;
  let isValidCode = false;
  let attempts = 0;
  const maxAttempts = 5;

  while (!isValidCode && attempts < maxAttempts) {
    roomCode = generateRoomCode();
    isValidCode = await isRoomCodeValid(roomCode);
    attempts++;
  }

  if (!isValidCode) {
    throw new Error("Failed to generate valid room code");
  }

  const defaultRules = {
    skipTurnOnSix: false,
    multipleTokensPerSquare: false,
    safeZoneRules: "standard",
    captureReward: 10,
    bonusTurnOnSix: true,
    timeoutPenalty: 5,
    reconnectionTime: 60,
    disqualificationMoves: 3,
    winningAmount: 0,
    rankingPoints: {
      first: 100,
      second: 60,
      third: 30,
      fourth: 10,
    },
  };

  const mergedRules = customRules
    ? { ...defaultRules, ...customRules }
    : defaultRules;

  const initialState: GameState = {
    players: {},
    currentPlayer: "",
    turnOrder: [],
    diceRoll: 0,
    winner: null,
    gameStartTime: new Date(),
    lastMoveTime: new Date(),
    timePerMove: 30,
    status: GameStatus.WAITING,
    variant,
    minPlayers: 2,
    customRules: mergedRules,
    consecutiveSixes: 0,
    moveHistory: [],
    allPlayersReady: false,
    specialSquares: {},
    maxMoves: 50,
    timeLimit: 600,
    turnTimeLimit: 30,
    moveCount: 0,
    pointsToWin: 100,
    isPrivate,
    entryFee,
    maxPlayers,
    roomCode,
    password: isPrivate ? password : undefined,
  };

  const game = gameRepository.create({
    status: GameStatus.WAITING,
    variant,
    state: initialState,
    startTime: new Date(),
    maxPlayers,
    entryFee,
    roomCode,
    isPrivate,
    password: isPrivate ? password : undefined,
  });

  const savedGame = await gameRepository.save(game);

  const gamePlayer = gamePlayerRepository.create({
    game: savedGame,
    userId: user.id,
    username: user.username,
    position: 0,
    isActive: true,
    tokenPositions: [0, 0, 0, 0],
    joinedAt: new Date(),
  });

  savedGame.players = [await gamePlayerRepository.save(gamePlayer)];

  getSocketService().emitSystemMessage(
    game.roomCode,

    {
      message: `Custom room created. Waiting for players to join.`,
      type: "WAITING",
      status: "INFO",
    }
  );

  return savedGame;
}

async function updateUserStats(
  players: GamePlayers[],
  game: Game
): Promise<void> {
  const dataSource = await getDataSource();
  const userStatsRepository = dataSource.getRepository(UserStats);
  const gameState = game.state as GameState;

  // Calculate rankings based on game variant
  let rankings: { userId: string; score: number }[] = [];

  if (game.variant === GameVariant.QUICK) {
    // For QUICK variant, rank by points
    rankings = Object.entries(gameState.players)
      .map(([userId, state]) => ({
        userId,
        score: state.points || 0,
      }))
      .sort((a, b) => b.score - a.score);
  } else {
    // For CLASSIC variant, rank by pieces home
    rankings = Object.entries(gameState.players)
      .map(([userId, state]) => ({
        userId,
        score: state.pieces.filter((pos) => pos === 57).length,
      }))
      .sort((a, b) => b.score - a.score);
  }

  // Update stats for each player
  for (const player of players) {
    const stats =
      (await userStatsRepository.findOne({
        where: { userId: player.userId },
      })) || new UserStats();

    if (!stats.userId) {
      stats.userId = player.userId;
    }

    // Update basic stats
    stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
    if (gameState.winner === player.userId) {
      stats.gamesWon = (stats.gamesWon || 0) + 1;
    }

    // Update variant-specific stats
    if (game.variant === GameVariant.QUICK) {
      const playerState = gameState.players[player.userId];
      stats.quickGamesPlayed = (stats.quickGamesPlayed || 0) + 1;
      if (gameState.winner === player.userId) {
        stats.quickGamesWon = (stats.quickGamesWon || 0) + 1;
      }
      stats.totalPoints = (stats.totalPoints || 0) + (playerState.points || 0);
    } else {
      stats.classicGamesPlayed = (stats.classicGamesPlayed || 0) + 1;
      if (gameState.winner === player.userId) {
        stats.classicGamesWon = (stats.classicGamesWon || 0) + 1;
      }
    }

    // Update kills and captures
    const playerState = gameState.players[player.userId];
    stats.totalKills = (stats.totalKills || 0) + (playerState.kills || 0);

    // Update ranking points
    const playerRank = rankings.findIndex((r) => r.userId === player.userId);
    if (playerRank !== -1) {
      const rankingPoints = gameState.customRules?.rankingPoints;
      if (rankingPoints) {
        switch (playerRank) {
          case 0:
            stats.rankingPoints =
              (stats.rankingPoints || 0) + rankingPoints.first;
            break;
          case 1:
            stats.rankingPoints =
              (stats.rankingPoints || 0) + rankingPoints.second;
            break;
          case 2:
            stats.rankingPoints =
              (stats.rankingPoints || 0) + rankingPoints.third;
            break;
          case 3:
            stats.rankingPoints =
              (stats.rankingPoints || 0) + rankingPoints.fourth;
            break;
        }
      }
    }

    await userStatsRepository.save(stats);
  }
}

async function isRoomCodeValid(roomCode: string): Promise<boolean> {
  const existingGame = await gameRepository.findOne({
    where: { roomCode },
    select: ["status"],
  });

  return !existingGame || existingGame.status === GameStatus.COMPLETED;
}

function isSafeZone(position: number): boolean {
  const safePositions = [1, 9, 14, 22, 27, 35, 40, 48];
  return safePositions.includes(position);
}

async function joinGame(gameId: string, userId: string): Promise<Game> {
  return await AppDataSource.transaction(async (transactionalEntityManager) => {
    const game = await transactionalEntityManager.findOne(Game, {
      where: { id: gameId },
      relations: ["players", "gameType"],
    });

    if (!game) {
      throw new Error("Game not found");
    }

    if (game.status !== GameStatus.WAITING) {
      throw new Error("Game has already started");
    }

    const currentPlayers = game.players || [];
    if (currentPlayers.length >= game.maxPlayers) {
      throw new Error("Game is full");
    }

    // Check if user is already in the game
    if (currentPlayers.some((p) => p.userId === userId)) {
      throw new Error("User is already in the game");
    }

    const user = await transactionalEntityManager.findOne(User, {
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Find available position
    let nextPosition = 0;
    const usedPositions = new Set(currentPlayers.map((p) => p.position));
    while (usedPositions.has(nextPosition) && nextPosition < game.maxPlayers) {
      nextPosition++;
    }

    if (nextPosition >= game.maxPlayers) {
      throw new Error("No valid positions available");
    }

    // Create new player
    const colors = [
      GameColor.RED,
      GameColor.GREEN,
      GameColor.YELLOW,
      GameColor.BLUE,
    ];
    const gamePlayer = transactionalEntityManager.create(GamePlayers, {
      gameId: game.id,
      userId: user.id,
      username: user.username,
      position: nextPosition,
      isActive: true,
      tokenPositions: [0, 0, 0, 0],
      joinedAt: new Date(),
      color: colors[nextPosition],
      isReady: false,
    });

    await transactionalEntityManager.save(gamePlayer);
    game.players = [...currentPlayers, gamePlayer];

    return game;
  });
}

function startGame(currentState: GameState, players: GamePlayers[]): GameState {
  const now = new Date();
  const updatedState = { ...currentState };

  updatedState.status = GameStatus.IN_PROGRESS;
  updatedState.gameStartTime = now;
  updatedState.lastMoveTime = now;
  updatedState.currentPlayer = players[0].userId;
  updatedState.diceRoll = 0;
  updatedState.consecutiveSixes = 0;
  updatedState.moveHistory = [];

  players.forEach((player) => {
    updatedState.players[player.userId] = {
      pieces: currentState.variant === GameVariant.QUICK 
        ? (() => {
            const startingPos = players.length === 2 
              ? (player.position === 0 ? 67 : 24)  // 2-player: positions 67 and 24
              : [67, 4, 24, 51][player.position]; // 4-player: positions 67, 4, 24, 51
            logger.info(`QUICK variant: Player ${player.userId} tokens start at position ${startingPos}`, {
              playerPosition: player.position,
              playerCount: players.length
            });
            return [startingPos, startingPos, startingPos, startingPos];
          })()
        : [0, 0, 0, 0],
      color: player.color,
      points: 0,
      kills: 0,
      timeRemaining: currentState.timePerMove,
      lastMoveTime: now,
      moveHistory: [],
      userId: player.userId,
      username: player.username,
      isReady: true,
      position: player.position,
      tokenPositions: currentState.variant === GameVariant.QUICK 
        ? (() => {
            const startingPos = players.length === 2 
              ? (player.position === 0 ? 67 : 24)  
              : [67, 4, 24, 51][player.position];
            return [startingPos, startingPos, startingPos, startingPos];
          })()
        : (player.tokenPositions || [0, 0, 0, 0]),
      isActive: player.isActive,
      joinedAt: player.joinedAt || now,
      lives: currentState.customRules?.livesPerPlayer || undefined,
      variant: currentState.variant, // Set the variant for each player
    };
  });

  const sortedPlayers = [...players].sort((a, b) => a.position - b.position);
  updatedState.currentPlayer = sortedPlayers[0].userId;
  updatedState.turnOrder = sortedPlayers.map((p) => p.userId);

  return updatedState;
}

// Add getGameState implementation
async function getGameState(gameId: string): Promise<GameState> {
  await ensureInitialized();

  const game = await gameRepository.findOne({
    where: { id: gameId },
    relations: ["players"],
  });

  if (!game) {
    throw new Error("Game not found");
  }

  return game.state as GameState;
}

export const calculateWinningAmounts = async (
  gameType: GameType,
  totalPool: number,
  playerCount: number,
  playerRankings: { [playerId: string]: number }
): Promise<{ [playerId: string]: { type: WalletType; amount: number } }> => {
  // Get active config for fee and tds
  const activeConfig = await adminService.getActiveConfig();

  // Calculate deductions
  const tdsAmount = (totalPool * activeConfig.tds) / 100;
  const feeAmount = (totalPool * activeConfig.fee) / 100;
  const remainingPool = totalPool - tdsAmount - feeAmount;

  // Get distribution based on player count
  let distribution;
  switch (playerCount) {
    case 2:
      distribution = gameType.twoPlayers;
      break;
    case 3:
      distribution = gameType.threePlayers;
      break;
    case 4:
      distribution = gameType.fourPlayers;
      break;
    default:
      throw new Error(`Invalid player count: ${playerCount}`);
  }

  // Calculate amounts for each position
  const winningAmounts: {
    [playerId: string]: { type: WalletType; amount: number };
  } = {};

  // Sort players by their ranking
  const sortedPlayers = Object.entries(playerRankings)
    .sort(([, rankA], [, rankB]) => rankA - rankB)
    .map(([playerId]) => playerId);

  // Distribute winnings based on rankings
  sortedPlayers.forEach((playerId, index) => {
    const positionKeys = ['first', 'second', 'third', 'fourth'];
    const position = positionKeys[index] as keyof typeof distribution;
    if (distribution[position]) {
      const { type, amount } = distribution[position];
      const positionAmount = (remainingPool * amount) / 100;
      winningAmounts[playerId] = {
        type,
        amount: positionAmount,
      };
    }
  });

  return winningAmounts;
};

async function handleGameCompletion(game: Game): Promise<void> {
  const dataSource = await getDataSource();
  const gameRepository = dataSource.getRepository(Game);
  const walletRepository = dataSource.getRepository(Wallet);
  const transactionRepository = dataSource.getRepository(Transaction);

  try {
    // Check if winning amounts were already processed (more reliable than game status)
    // Game status might be COMPLETED but winnings not distributed due to race conditions

    // Check if winning amounts were already processed by looking for existing transactions
    const existingTransactionsQuery = await dataSource.query(
      `SELECT COUNT(*) as count FROM transactions 
       WHERE type = $1 AND status = $2 AND (description LIKE $3 OR metadata->>'gameId' = $4)`,
      [TransactionType.GAME_WINNING, TransactionStatus.COMPLETED, `%${game.id}%`, game.id]
    );
    const existingTransactionsCount = parseInt(existingTransactionsQuery[0].count);

    if (existingTransactionsCount > 0) {
      logger.warn(`Game ${game.id} already has ${existingTransactionsCount} winning transactions, skipping duplicate processing`);
      // Just update the game status and return
      game.status = GameStatus.COMPLETED;
      game.endTime = new Date();
      await gameRepository.save(game);
      return;
    }

    logger.info(`Starting game completion processing for game ${game.id} (status: ${game.status})`);

    // Clear quick game timer for QUICK variant games
    if (game.variant === 'QUICK') {
      try {
        const { default: QuickGameTimerService } = await import('./quickGameTimerService');
        const timerService = QuickGameTimerService.getInstance();
        timerService.clearQuickGameTimer(game.id);
        logger.info(`Quick game timer cleared for completed game ${game.id}`);
      } catch (error) {
        logger.error(`Error clearing quick game timer for game ${game.id}:`, error);
      }
    }

    // Clear all turn timers for this game since it's completing
    try {
      const { enhancedTurnTimeoutService } = await import('./enhancedTurnTimeoutService');
      enhancedTurnTimeoutService.clearTimeoutForGameEnd(game.id, 'GAME_END');
      logger.info(`Turn timers cleared for completed game ${game.id}`);
    } catch (error) {
      logger.error(`Error clearing turn timers for game ${game.id}:`, error);
    }

    // Get all players who participated in the game and their rankings
    const gameState = game.state as GameState;
    const allPlayers = Object.entries(gameState.players)
      // .filter(([_, state]) => state.isActive) // Fixed: Use all players for winning calculation
      .map(([userId, state]) => ({
        userId,
        score:
          game.variant === GameVariant.QUICK
            ? state.points || 0
            : state.pieces.filter((pos) => pos === 57).length,
      }))
      .sort((a, b) => b.score - a.score);

    // Calculate total pool
    const totalPool = game.entryFee * allPlayers.length;

    // Calculate winning amounts
    const winningAmounts = await calculateWinningAmounts(
      game.gameType,
      totalPool,
      allPlayers.length,
      // FIXED ISSUE 1: Use proper rankings based on winner, not array index
      Object.fromEntries(
        gameState.winner 
          ? [
              [gameState.winner, 1], // Winner gets rank 1
              ...allPlayers.filter(p => p.userId !== gameState.winner).map((p, i) => [p.userId, i + 2])
            ]
          : allPlayers.map((p, i) => [p.userId, i + 1]) // If no winner, use score order
      )
    );

    // Update wallets and create transactions
    for (const [playerId, winning] of Object.entries(winningAmounts)) {
      const wallet = await walletRepository.findOne({
        where: { userId: playerId },
        relations: ["user"],
      });

      if (wallet) {
        // Update wallet
        // FIXED ISSUE 2: Update wallet amounts correctly  
        const previousWinning = Number(wallet.winningAmount);
        wallet.winningAmount = previousWinning + winning.amount;
        wallet.totalBalance =
          Number(wallet.balance) +
          Number(wallet.winningAmount) +
          Number(wallet.cashbackAmount);
        await walletRepository.save(wallet);

        // Create transaction record
        const transaction = transactionRepository.create({
          amount: winning.amount,
          transactionType: TransactionType.GAME_WINNING, // FIXED: Use correct field name 'transactionType'
          status: TransactionStatus.COMPLETED,
          description: `Game winning - Rank ${allPlayers.findIndex((p) => p.userId === playerId) + 1} (Game: ${game.id})`,
          paymentMethod: PaymentMethod.SYSTEM, // FIXED: Add missing paymentMethod
          walletId: wallet.id,
          userId: playerId,
          metadata: {
            gameId: game.id,
            gameType: game.gameType.name,
            position: allPlayers.findIndex((p) => p.userId === playerId) + 1,
          },
        });
        await transactionRepository.save(transaction);
        
        logger.info(`Prize distributed: Player ${playerId} received $${winning.amount} for rank ${allPlayers.findIndex((p) => p.userId === playerId) + 1} in game ${game.id}`);
      }
    }

    // Update game status
    game.status = GameStatus.COMPLETED;
    game.endTime = new Date();
    await gameRepository.save(game);

    // Emit game completion event with winning amounts
    try {
      getSocketService().emitGameCompleted(game.roomCode, {
        gameId: game.id,
        winner: {
          id: gameState.winner,
          position: gameState.players[gameState.winner].position,
        },
        finalState: gameState,
        endTime: game.endTime,
        winningAmounts,
      });
    } catch (error) {
      logger.error("Failed to emit game completed:", {
        error,
        gameId: game.id,
      });
    }
  } catch (error) {
    logger.error("Error handling game completion:", { error, gameId: game.id });
    throw error;
  }
}

// Export necessary functions
export {
  updateGameStateWithDiceRoll,
  updateGameStateWithPieceMovement,
  initializeGameState,
  calculatePoints,
  hasPlayerWon,
  checkForKills,
  isValidMove,
  getQueueStatistics,
  getQueuePosition,
  joinMatchmaking,
  leaveMatchmaking,
  canStartGame,
  initializeRepositories,
  ensureInitialized,
  checkValidMoves,
  getNextPlayer,
  getGameState,
  createGame,
  joinGame,
  rollDice,
  movePiece,
  getActiveGames,
  createCustomRoom,
  handlePlayerDisconnection,
  canRejoinGame,
  rejoinGame,
  findActiveGameForUser,
  leaveGame,
  handleGameCompletion,
};
