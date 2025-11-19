import { logger } from "../utils/logger";
import { getDataSource } from "../config/database";
import { Game } from "../entities/Game";
import { GameType } from "../entities/GameType";
import { GameStatus } from "../types/game";
import { GameState, PlayerState } from "../types/game";
import { handleGameCompletion } from "./gameService";
import SocketService from "./socketService";
import { enhancedTurnTimeoutService } from "./enhancedTurnTimeoutService";

interface QuickGameTimer {
  gameId: string;
  timeRemaining: number; // in seconds
  totalTime: number; // in seconds
  startTime: Date;
  timerId?: NodeJS.Timeout;
  isActive: boolean;
}

class QuickGameTimerService {
  private static instance: QuickGameTimerService;
  private activeTimers: Map<string, QuickGameTimer> = new Map();

  private constructor() {}

  public static getInstance(): QuickGameTimerService {
    if (!QuickGameTimerService.instance) {
      QuickGameTimerService.instance = new QuickGameTimerService();
    }
    return QuickGameTimerService.instance;
  }

  /**
   * Starts a quick game countdown timer
   */
  public async startQuickGameTimer(game: Game): Promise<void> {
    logger.info(`startQuickGameTimer called for game ${game.id}`, {
      gameId: game.id,
      variant: game.variant,
      roomCode: game.roomCode,
      hasGameType: !!game.gameType,
      gameTypeName: game.gameType?.name,
      quickGameTimeLimit: game.gameType?.quickGameTimeLimit,
      quickGameTimerEnabled: game.gameType?.rules?.quickGameTimerEnabled
    });
    
    try {
      // Only start timer for QUICK variant games
      if (game.variant !== "QUICK") {
        logger.info(`Game ${game.id} is not QUICK variant (${game.variant}), skipping timer`);
        return;
      }

      // Get timer duration from game type (quickGameTimeLimit)
      const timerDuration = game.gameType?.quickGameTimeLimit || 300; // Default 5 minutes

      // Check if timer is enabled for this game type
      const isTimerEnabled =
        game.gameType?.rules?.quickGameTimerEnabled !== false; // Default to enabled

      if (!isTimerEnabled) {
        logger.info(`Quick game timer disabled for game ${game.id}`);
        return;
      }

      // Clear any existing timer for this game
      this.clearQuickGameTimer(game.id);

      const startTime = new Date();
      const quickTimer: QuickGameTimer = {
        gameId: game.id,
        timeRemaining: timerDuration,
        totalTime: timerDuration,
        startTime,
        isActive: true,
      };

      // Start the countdown timer
      quickTimer.timerId = setInterval(async () => {
        await this.handleTimerTick(game.id);
      }, 1000); // Tick every second

      this.activeTimers.set(game.id, quickTimer);

      logger.info(`Quick game timer started for game ${game.id}`, {
        duration: timerDuration,
        gameType: game.gameType?.name,
      });

      // Emit timer start event
      this.emitTimerEvent(game.roomCode, "quick_game_timer_started", {
        gameId: game.id,
        timeRemaining: timerDuration,
        totalTime: timerDuration,
      });

      // Also emit game state update with timer info
      await this.emitGameStateUpdate(game, "QUICK_GAME_TIMER_STARTED", {
        timeRemaining: timerDuration,
        totalTime: timerDuration,
        isActive: true,
        warningZone: false,
      });
    } catch (error) {
      logger.error(
        `Error starting quick game timer for game ${game.id}:`,
        error,
      );
    }
  }

  /**
   * Handles each timer tick (every second)
   */
  private async handleTimerTick(gameId: string): Promise<void> {
    try {
      const timer = this.activeTimers.get(gameId);
      if (!timer || !timer.isActive) {
        return;
      }

      timer.timeRemaining -= 1;

      // Emit timer tick event every second for better real-time feedback
      if (true) {
        const dataSource = await getDataSource();
        const gameRepository = dataSource.getRepository(Game);
        const game = await gameRepository.findOne({
          where: { id: gameId },
          relations: ["gameType"],
        });

        if (game) {
          this.emitTimerEvent(game.roomCode, "quick_game_timer_tick", {
            gameId: gameId,
            timeRemaining: timer.timeRemaining,
            totalTime: timer.totalTime,
            warningZone: timer.timeRemaining <= 60, // Last minute warning
          });

          // Also emit game state update with timer info
          await this.emitGameStateUpdate(game, "QUICK_GAME_TIMER_TICK", {
            timeRemaining: timer.timeRemaining,
            totalTime: timer.totalTime,
            isActive: true,
            warningZone: timer.timeRemaining <= 60,
          });
        }
      }

      // Check if timer has expired
      if (timer.timeRemaining <= 0) {
        await this.handleTimerExpired(gameId);
      }
    } catch (error) {
      logger.error(`Error in quick game timer tick for game ${gameId}:`, error);
    }
  }

  /**
   * Handles when the quick game timer expires
   */
  private async handleTimerExpired(gameId: string): Promise<void> {
    try {
      logger.info(`Quick game timer expired for game ${gameId}`);

      // Clear the timer
      this.clearQuickGameTimer(gameId);

      // Clear all turn timers for this game since it's ending
      enhancedTurnTimeoutService.clearTimeoutForGameEnd(gameId, 'GAME_END');

      // Get the game and complete it based on points ranking
      const dataSource = await getDataSource();
      const gameRepository = dataSource.getRepository(Game);

      const game = await gameRepository.findOne({
        where: { id: gameId },
        relations: ["gameType"],
      });

      if (!game) {
        logger.warn(`Game ${gameId} not found when timer expired`);
        return;
      }

      if (game.status !== GameStatus.IN_PROGRESS) {
        logger.warn(
          `Game ${gameId} already completed (status: ${game.status}) when QUICK timer expired - likely completed by another system (turn timeout, etc.)`,
        );
        // Even though game is completed, try to ensure winning distribution happened
        try {
          logger.info(`Attempting to ensure winning distribution for already completed game ${gameId}`);
          await handleGameCompletion(game);
        } catch (error) {
          logger.error(`Failed to ensure winning distribution for completed game ${gameId}:`, error);
        }
        return;
      }

      const gameState = game.state as GameState;

      // Rank players by points for QUICK variant
      const playerRankings = this.calculateQuickGameRankings(gameState);
      const winner = playerRankings[0]; // Player with highest points

      // Set the winner in game state
      gameState.winner = winner.userId;
      game.state = gameState;
      game.status = GameStatus.COMPLETED;
      game.endTime = new Date();

      await gameRepository.save(game);

      logger.info(`Quick game ${gameId} completed by timer expiry`, {
        winner: winner.userId,
        finalPoints: winner.points,
        winnerKills: winner.kills,
        winnerTokensAtHome: winner.tokensAtHome,
        rankings: playerRankings.map((p) => ({
          userId: p.userId,
          points: p.points,
          kills: p.kills,
          tokensAtHome: p.tokensAtHome,
          rank: p.rank,
        })),
        completionReason: 'TIMER_EXPIRED',
        totalPlayers: playerRankings.length,
      });

      // Emit standard GAME_COMPLETED event (not custom timer event)
      const socketService = SocketService.getInstance();
      socketService.emitGameCompleted(game.roomCode, {
        gameId: gameId,
        winner: {
          id: winner.userId,
          position: winner.points || 0,
        },
        finalState: gameState,
        endTime: game.endTime!,
      });

      // Also emit quick_game_timer_expired for frontend timer handling
      this.emitTimerEvent(game.roomCode, "quick_game_timer_expired", {
        gameId: gameId,
        winner: winner.userId,
        finalRankings: playerRankings,
      });

      // Emit game state update for timer expiry
      await this.emitGameStateUpdate(game, "QUICK_GAME_TIMER_EXPIRED", {
        timeRemaining: 0,
        totalTime: this.activeTimers.get(gameId)?.totalTime || 0,
        isActive: false,
        warningZone: false,
      });

      // Handle game completion (distribute winnings)
      await handleGameCompletion(game);
    } catch (error) {
      logger.error(
        `Error handling quick game timer expiry for game ${gameId}:`,
        error,
      );
    }
  }

  /**
   * Calculate player rankings based on points for QUICK variant
   * Enhanced with tie-breaking and additional stats
   */
  private calculateQuickGameRankings(
    gameState: GameState,
  ): Array<{ userId: string; points: number; rank: number; kills?: number; tokensAtHome?: number }> {
    const players = Object.entries(gameState.players)
      .map(([userId, playerState]) => {
        const state = playerState as PlayerState;
        return {
          userId,
          points: state.points || 0,
          kills: state.kills || 0,
          tokensAtHome: state.pieces ? state.pieces.filter(pos => pos === 57).length : 0,
        };
      })
      // Primary sort: points (descending)
      // Tie-breaker 1: kills (descending) 
      // Tie-breaker 2: tokens at home (descending)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.kills !== a.kills) return b.kills - a.kills;
        return b.tokensAtHome - a.tokensAtHome;
      });

    // Assign ranks (handle tied positions properly)
    let currentRank = 1;
    return players.map((player, index) => {
      // If not tied with previous player, update rank
      if (index > 0) {
        const prevPlayer = players[index - 1];
        if (!(player.points === prevPlayer.points && 
              player.kills === prevPlayer.kills && 
              player.tokensAtHome === prevPlayer.tokensAtHome)) {
          currentRank = index + 1;
        }
      }
      
      return {
        ...player,
        rank: currentRank,
      };
    });
  }

  /**
   * Clears the quick game timer for a specific game
   */
  public clearQuickGameTimer(gameId: string): void {
    const timer = this.activeTimers.get(gameId);
    if (timer) {
      if (timer.timerId) {
        clearInterval(timer.timerId);
      }
      timer.isActive = false;
      this.activeTimers.delete(gameId);

      logger.info(`Quick game timer cleared for game ${gameId}`);
    }
  }

  /**
   * Pauses the quick game timer (for disconnections, etc.)
   */
  public pauseQuickGameTimer(gameId: string): void {
    const timer = this.activeTimers.get(gameId);
    if (timer && timer.timerId) {
      clearInterval(timer.timerId);
      timer.timerId = undefined;
      timer.isActive = false;

      logger.info(`Quick game timer paused for game ${gameId}`);
    }
  }

  /**
   * Resumes the quick game timer
   */
  public resumeQuickGameTimer(gameId: string): void {
    const timer = this.activeTimers.get(gameId);
    if (timer && !timer.isActive) {
      timer.timerId = setInterval(async () => {
        await this.handleTimerTick(gameId);
      }, 1000);
      timer.isActive = true;

      logger.info(`Quick game timer resumed for game ${gameId}`);
    }
  }

  /**
   * Gets the current timer status for a game
   */
  public getTimerStatus(gameId: string): QuickGameTimer | null {
    return this.activeTimers.get(gameId) || null;
  }

  /**
   * Emits timer events through Socket.IO
   */
  private emitTimerEvent(roomCode: string, eventType: string, data: any): void {
    try {
      const socketService = SocketService.getInstance();
      if (!socketService) {
        logger.error(`SocketService not available for emitting ${eventType}`);
        return;
      }
      
      if (!roomCode) {
        logger.error(`No roomCode provided for emitting ${eventType}, data:`, data);
        return;
      }
      
      logger.info(`Emitting ${eventType} to room ${roomCode}`, {
        eventType,
        roomCode,
        gameId: data.gameId
      });
      
      socketService.emitToRoom(roomCode, eventType, {
        ...data,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error(`Error emitting timer event ${eventType}:`, error);
    }
  }

  /**
   * Emits game state update with timer information
   */
  private async emitGameStateUpdate(
    game: any,
    eventType: string,
    timerData: {
      timeRemaining: number;
      totalTime: number;
      isActive: boolean;
      warningZone?: boolean;
    },
  ): Promise<void> {
    try {
      const socketService = SocketService.getInstance();
      if (!socketService) {
        return;
      }

      // Fetch gameType if not loaded
      let gameType = game.gameType;
      if (!gameType && game.gameTypeId) {
        const dataSource = await getDataSource();
        const gameTypeRepository = dataSource.getRepository(GameType);
        gameType = await gameTypeRepository.findOne({
          where: { id: game.gameTypeId },
        });
      }

      const gameStateUpdate = {
        type: eventType,
        gameId: game.id,
        roomCode: game.roomCode,
        variant: game.variant,
        status: game.status,
        quickGameTimer: timerData,
        gameType: {
          name: gameType?.name || "Quick Game",
          variant: gameType?.variant || game.variant,
          quickGameTimeLimit: gameType?.quickGameTimeLimit || 120,
          quickGamePoints: gameType?.quickGamePoints || 200,
          rules: {
            quickGameTimerEnabled:
              gameType?.rules?.quickGameTimerEnabled ??
              game.rules?.quickGameTimerEnabled ??
              true,
            ...(gameType?.rules || game.rules || {}),
          },
        },
        gameState: game.state,
        timestamp: new Date(),
      };

      socketService.emitToRoom(
        game.roomCode,
        "gameStateUpdated",
        gameStateUpdate,
      );

      logger.debug(`Emitted game state update for QUICK game ${game.id}`, {
        eventType,
        timeRemaining: timerData.timeRemaining,
        warningZone: timerData.warningZone,
      });
    } catch (error) {
      logger.error(
        `Error emitting game state update for game ${game.id}:`,
        error,
      );
    }
  }

  /**
   * Cleanup all timers (for graceful shutdown)
   */
  public cleanup(): void {
    for (const [gameId] of this.activeTimers) {
      this.clearQuickGameTimer(gameId);
    }
    logger.info("All quick game timers cleared during cleanup");
  }
}

export default QuickGameTimerService;
