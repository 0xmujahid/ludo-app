import { logger } from "../utils/logger";
import { getDataSource } from "../config/database";
import { Game } from "../entities/Game";
import { GamePlayers } from "../entities/GamePlayers";
import { GameStatus, GameState, PlayerState } from "../types/game";
import { GameType } from "../entities/GameType";
import SocketService from "./socketService";

interface TurnTimer {
  gameId: string;
  playerId: string;
  timeoutId: NodeJS.Timeout;
  tickIntervalId: NodeJS.Timeout;
  startTime: Date;
  duration: number;
  remainingTime: number;
  roomCode?: string; // Cache roomCode for efficient emit operations
}

interface TurnTimeoutConfig {
  gameId: string;
  playerId: string;
  timeoutInSeconds: number;
  gameTypeTimeout?: number;
  overrideTimeout?: number;
}

interface TurnTimeoutEvents {
  TURN_TIME_RESET: 'turn-time-reset';
  TURN_TIME_TICK: 'turn-time-tick';
  TURN_TIMEOUT: 'turn-timeout';
  LIFE_DEDUCTED: 'life-deducted';
}

export const TURN_TIMEOUT_EVENTS: TurnTimeoutEvents = {
  TURN_TIME_RESET: 'turn-time-reset',
  TURN_TIME_TICK: 'turn-time-tick',
  TURN_TIMEOUT: 'turn-timeout',
  LIFE_DEDUCTED: 'life-deducted'
};

class EnhancedTurnTimeoutService {
  private static instance: EnhancedTurnTimeoutService;
  private activeTurnTimers: Map<string, TurnTimer> = new Map(); // Key: gameId-playerId
  private socketService: SocketService | null = null;

  private constructor() {}

  public static getInstance(): EnhancedTurnTimeoutService {
    if (!EnhancedTurnTimeoutService.instance) {
      EnhancedTurnTimeoutService.instance = new EnhancedTurnTimeoutService();
    }
    return EnhancedTurnTimeoutService.instance;
  }

  public setSocketService(socketService: SocketService): void {
    this.socketService = socketService;
  }

  /**
   * Start turn timeout with dynamic timeout fetching from game type
   */
  public async startTurnTimeout(config: TurnTimeoutConfig): Promise<void> {
    const { gameId, playerId, timeoutInSeconds, gameTypeTimeout, overrideTimeout } = config;

    // Clear any existing timer for this game (all players)
    this.clearAllTimersForGame(gameId);

    // Determine final timeout duration
    let finalTimeout = timeoutInSeconds;
    
    if (overrideTimeout) {
      finalTimeout = overrideTimeout;
      logger.info(`Using override timeout: ${overrideTimeout}s for game ${gameId}`);
    } else if (gameTypeTimeout) {
      finalTimeout = gameTypeTimeout;
      logger.info(`Using game type timeout: ${gameTypeTimeout}s for game ${gameId}`);
    }

    // Start main timeout
    const timeoutId = setTimeout(async () => {
      await this.handleTurnTimeout(gameId, playerId);
    }, finalTimeout * 1000);

    // Start tick interval for live countdown
    const tickIntervalId = setInterval(async () => {
      await this.emitTimeTick(gameId, playerId);
    }, 1000);

    const turnTimer: TurnTimer = {
      gameId,
      playerId,
      timeoutId,
      tickIntervalId,
      startTime: new Date(),
      duration: finalTimeout,
      remainingTime: finalTimeout
    };

    const timerKey = `${gameId}-${playerId}`;
    this.activeTurnTimers.set(timerKey, turnTimer);

    // Emit turn-time-reset event
    await this.emitTimeReset(gameId, playerId, finalTimeout);

    logger.info(`Enhanced turn timeout started for player ${playerId} in game ${gameId}`, {
      timeoutDuration: finalTimeout,
      startTime: turnTimer.startTime,
      hasOverride: !!overrideTimeout,
      hasGameTypeTimeout: !!gameTypeTimeout,
      timerKey: timerKey,
      activeTimersCount: this.activeTurnTimers.size
    });
  }

  /**
   * Reset timer without changing turn (for bonus moves)
   */
  public async resetTimerForBonus(gameId: string, playerId: string): Promise<void> {
    const timerKey = `${gameId}-${playerId}`;
    const existingTimer = this.activeTurnTimers.get(timerKey);
    if (!existingTimer) {
      logger.warn(`Cannot reset timer for bonus - no active timer for player ${playerId} in game ${gameId}. Starting new timer...`);
      // If no timer exists, start a new one with default duration
      await this.startTurnTimeout({
        gameId,
        playerId,
        timeoutInSeconds: 30, // Default timeout
        gameTypeTimeout: undefined,
        overrideTimeout: undefined
      });
      return;
    }

    // Get the original timeout duration
    const originalDuration = existingTimer.duration;

    // Clear existing timers
    clearTimeout(existingTimer.timeoutId);
    clearInterval(existingTimer.tickIntervalId);

    // Start new timers with same duration
    const timeoutId = setTimeout(async () => {
      await this.handleTurnTimeout(gameId, playerId);
    }, originalDuration * 1000);

    const tickIntervalId = setInterval(async () => {
      await this.emitTimeTick(gameId, playerId);
    }, 1000);

    // Update timer object
    existingTimer.timeoutId = timeoutId;
    existingTimer.tickIntervalId = tickIntervalId;
    existingTimer.startTime = new Date();
    existingTimer.remainingTime = originalDuration;

    // Emit turn-time-reset event
    await this.emitTimeReset(gameId, playerId, originalDuration);

    logger.info(`Timer reset for bonus move - player ${playerId} in game ${gameId}`, {
      duration: originalDuration
    });
  }

  /**
   * Clear turn timeout for a specific player in a game
   */
  public clearTurnTimeout(gameId: string, playerId: string): void {
    const timerKey = `${gameId}-${playerId}`;
    const existingTimer = this.activeTurnTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer.timeoutId);
      clearInterval(existingTimer.tickIntervalId);
      this.activeTurnTimers.delete(timerKey);
      logger.debug(`Enhanced turn timeout cleared for player ${playerId} in game ${gameId}`);
    }
  }

  /**
   * Clear all timers for a game (all players)
   */
  public clearAllTimersForGame(gameId: string): void {
    const timersToDelete: string[] = [];
    
    for (const [key, timer] of this.activeTurnTimers) {
      if (key.startsWith(`${gameId}-`)) {
        clearTimeout(timer.timeoutId);
        clearInterval(timer.tickIntervalId);
        timersToDelete.push(key);
      }
    }
    
    timersToDelete.forEach(key => this.activeTurnTimers.delete(key));
    
    if (timersToDelete.length > 0) {
      logger.debug(`Cleared ${timersToDelete.length} timers for game ${gameId}`);
    }
  }

  /**
   * Clear timers when game ends, player leaves, or game is paused
   */
  public clearTimeoutForGameEnd(gameId: string, reason: 'GAME_END' | 'PLAYER_LEFT' | 'GAME_PAUSED'): void {
    this.clearAllTimersForGame(gameId);
    logger.info(`Turn timeout cleared for game ${gameId} due to: ${reason}`);
  }

  /**
   * Handle turn timeout - deduct life and move to next player
   */
  private async handleTurnTimeout(gameId: string, playerId: string): Promise<void> {
    try {
      logger.info(`Turn timeout occurred for player ${playerId} in game ${gameId}`);

      const dataSource = await getDataSource();
      const gameRepository = dataSource.getRepository(Game);
      const gamePlayerRepository = dataSource.getRepository(GamePlayers);

      // Get the game with relations
      const game = await gameRepository.findOne({
        where: { id: gameId },
        relations: ["players", "gameType"]
      });

      if (!game || game.status !== GameStatus.IN_PROGRESS) {
        logger.warn(`Game ${gameId} not found or not in progress during timeout`);
        return;
      }

      const gameState = game.state as GameState;
      
      // Verify this is still the current player
      if (gameState.currentPlayer !== playerId) {
        logger.warn(`Player ${playerId} is no longer current player in game ${gameId}`);
        return;
      }

      // Find the game player
      const gamePlayer = game.players.find(p => p.userId === playerId);
      if (!gamePlayer) {
        logger.warn(`Player ${playerId} not found in game ${gameId}`);
        return;
      }

      // Deduct one life from player
      const playerState = gameState.players[playerId] as PlayerState;
      if (playerState) {
        const currentLives = playerState.lives || 3;
        const newLives = Math.max(0, currentLives - 1);
        playerState.lives = newLives;

        logger.info(`Player ${playerId} life deducted: ${currentLives} → ${newLives}`);

        // Emit life deduction event
        this.emitLifeDeducted(game.roomCode, playerId, newLives, currentLives);

        // Check if player should be eliminated
        if (newLives <= 0) {
          playerState.isActive = false;
          gamePlayer.isActive = false;
          logger.info(`Player ${playerId} eliminated due to no lives remaining`);
        }

        // Move to next player
        const nextPlayerId = this.getNextActivePlayer(game.players, playerId);
        if (nextPlayerId) {
          gameState.currentPlayer = nextPlayerId;
          gameState.diceRoll = 0; // Reset dice for next player
          gameState.lastMoveTime = new Date();

          // Save updated game state
          game.state = gameState;
          await gameRepository.save(game);
          await gamePlayerRepository.save(gamePlayer);

          // Emit timeout event
          this.emitTurnTimeout(game.roomCode, playerId, nextPlayerId, newLives);

          // Emit game state update for turn timeout
          if (this.socketService) {
            this.socketService.emitGameStateUpdate(game.roomCode, {
              type: "TURN_TIMEOUT",
              gameId,
              roomCode: game.roomCode,
              player: {
                id: playerId,
                position: playerState.position,
              },
              nextPlayer: {
                id: nextPlayerId,
                position: gameState.players[nextPlayerId]?.position || 0,
              },
              timestamp: new Date(),
            });
          }

          // Start timeout for next player if game continues
          if (this.shouldContinueGame(game.players)) {
            const timeoutDuration = this.getTimeoutDuration(game);
            await this.startTurnTimeout({
              gameId,
              playerId: nextPlayerId,
              timeoutInSeconds: timeoutDuration,
              gameTypeTimeout: game.gameType?.turnTimeLimit,
              overrideTimeout: game.turnTimeLimit
            });
          } else {
            // End game if not enough active players
            await this.endGameDueToTimeouts(game);
          }
        } else {
          // No next player, end the game
          await this.endGameDueToTimeouts(game);
        }
      }

    } catch (error) {
      logger.error(`Error handling turn timeout for player ${playerId} in game ${gameId}:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      // CRITICAL BUG FIX: Clean up the timer using correct key format (gameId-playerId)
      const timerKey = `${gameId}-${playerId}`;
      this.activeTurnTimers.delete(timerKey);
      logger.debug(`Cleaned up timer for key: ${timerKey}`);
    }
  }

  /**
   * Get timeout duration from game config
   */
  private getTimeoutDuration(game: Game): number {
    // Priority: game.turnTimeLimit > gameType.turnTimeLimit > default (30s)
    return game.turnTimeLimit || game.gameType?.turnTimeLimit || 30;
  }

  /**
   * Get next active player in turn order
   */
  private getNextActivePlayer(players: GamePlayers[], currentPlayerId: string): string | null {
    const activePlayers = players
      .filter(p => p.isActive)
      .sort((a, b) => a.position - b.position);

    if (activePlayers.length <= 1) {
      return null;
    }

    const currentIndex = activePlayers.findIndex(p => p.userId === currentPlayerId);
    if (currentIndex === -1) {
      return activePlayers[0]?.userId || null;
    }

    const nextIndex = (currentIndex + 1) % activePlayers.length;
    return activePlayers[nextIndex]?.userId || null;
  }

  /**
   * Check if game should continue
   */
  private shouldContinueGame(players: GamePlayers[]): boolean {
    const activePlayers = players.filter(p => p.isActive);
    return activePlayers.length > 1;
  }

  /**
   * End game due to timeouts
   */
  private async endGameDueToTimeouts(game: Game): Promise<void> {
    try {
      const dataSource = await getDataSource();
      const gameRepository = dataSource.getRepository(Game);

      const activePlayers = game.players.filter(p => p.isActive);
      
      // Mark game as completed
      game.status = GameStatus.COMPLETED;
      game.endTime = new Date();

      const gameState = game.state as GameState;
      
      if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        gameState.winner = winner.userId;
        const winnerState = gameState.players[winner.userId] as PlayerState;
        if (winnerState) {
          // Mark winner in game state (isWinner is managed at entity level)
          gameState.winner = winner.userId;
        }
        winner.isWinner = true;
      }

      game.state = gameState;
      await gameRepository.save(game);

      logger.info(`Game ${game.id} ended due to timeouts`, {
        activePlayers: activePlayers.length,
        winner: activePlayers[0]?.userId || null
      });

      // Handle game completion (including winning distribution)
      try {
        const { handleGameCompletion } = await import('./gameService');
        logger.info(`Calling handleGameCompletion for game ${game.id}`);
        await handleGameCompletion(game);
        logger.info(`Successfully completed handleGameCompletion for game ${game.id}`);
      } catch (completionError) {
        logger.error(`Error in handleGameCompletion for game ${game.id}:`, {
          error: completionError instanceof Error ? completionError.message : "Unknown error",
          stack: completionError instanceof Error ? completionError.stack : undefined
        });
      }

      // Emit game completion
      if (this.socketService) {
        this.socketService.emitGameCompleted(game.roomCode, {
          gameId: game.id,
          winner: activePlayers.length === 1 ? { 
            id: activePlayers[0].userId,
            position: activePlayers[0].position 
          } : null,
          endTime: game.endTime,
          finalState: gameState
        });
      }

    } catch (error) {
      logger.error(`Error ending game ${game.id} due to timeouts:`, {
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Emit turn-time-reset event
   */
  private async emitTimeReset(gameId: string, playerId: string, timeoutInSeconds: number): Promise<void> {
    if (!this.socketService) return;

    try {
      // Get game to find roomCode
      const dataSource = await getDataSource();
      const gameRepository = dataSource.getRepository(Game);
      const game = await gameRepository.findOne({ where: { id: gameId } });
      
      if (!game) {
        logger.warn(`Cannot emit turn-time-reset: game ${gameId} not found`);
        return;
      }

      const payload = {
        gameId,
        playerId,
        timeoutInSeconds
      };

      this.socketService.emitToRoom(game.roomCode, TURN_TIMEOUT_EVENTS.TURN_TIME_RESET, payload);
      logger.info(`Emitted turn-time-reset for player ${playerId} in game ${gameId} to room ${game.roomCode}`, payload);
    } catch (error) {
      logger.error(`Error emitting turn-time-reset for game ${gameId}:`, {
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Emit turn-time-tick event every second
   */
  private async emitTimeTick(gameId: string, playerId: string): Promise<void> {
    const timerKey = `${gameId}-${playerId}`;
    const timer = this.activeTurnTimers.get(timerKey);
    if (!timer || !this.socketService) return;

    try {
      // Check if game is still active before proceeding
      const dataSource = await getDataSource();
      const gameRepository = dataSource.getRepository(Game);
      const game = await gameRepository.findOne({ where: { id: gameId } });
      
      if (!game) {
        logger.warn(`Cannot emit turn-time-tick: game ${gameId} not found - clearing timer`);
        this.clearTurnTimeout(gameId, playerId);
        return;
      }

      // If game is no longer in progress, clear all timers for this game
      if (game.status !== GameStatus.IN_PROGRESS) {
        logger.info(`Game ${gameId} is no longer in progress (status: ${game.status}) - clearing all timers`);
        this.clearAllTimersForGame(gameId);
        return;
      }

      // Cache roomCode for performance
      if (!timer.roomCode) {
        timer.roomCode = game.roomCode;
      }

      const elapsed = (Date.now() - timer.startTime.getTime()) / 1000;
      const timeLeftInSeconds = Math.max(0, Math.floor(timer.duration - elapsed));
      
      timer.remainingTime = timeLeftInSeconds;

      const payload = {
        gameId,
        playerId,
        timeLeftInSeconds
      };

      this.socketService.emitToRoom(timer.roomCode, TURN_TIMEOUT_EVENTS.TURN_TIME_TICK, payload);
      logger.info(`Emitted turn-time-tick for player ${playerId} in room ${timer.roomCode}`, payload);
      
      // Stop ticking when time runs out
      if (timeLeftInSeconds <= 0) {
        clearInterval(timer.tickIntervalId);
        logger.info(`Stopped tick interval for game ${gameId} - time expired`);
      }
    } catch (error) {
      logger.error(`Error emitting turn-time-tick for game ${gameId}:`, {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      // Clear timer on error to prevent infinite loops
      this.clearTurnTimeout(gameId, playerId);
    }
  }

  /**
   * Emit turn timeout event
   */
  private emitTurnTimeout(roomCode: string, timedOutPlayerId: string, nextPlayerId: string, remainingLives: number): void {
    if (!this.socketService) return;

    const payload = {
      timedOutPlayerId,
      nextPlayerId,
      remainingLives,
      timestamp: new Date()
    };

    this.socketService.emitToRoom(roomCode, TURN_TIMEOUT_EVENTS.TURN_TIMEOUT, payload);
    logger.info(`Emitted turn timeout event for room ${roomCode}`, payload);
  }

  /**
   * Emit life deducted event
   */
  private emitLifeDeducted(roomCode: string, playerId: string, newLives: number, previousLives: number): void {
    if (!this.socketService) return;

    const payload = {
      playerId,
      newLives,
      previousLives,
      timestamp: new Date()
    };

    this.socketService.emitToRoom(roomCode, TURN_TIMEOUT_EVENTS.LIFE_DEDUCTED, payload);
    logger.debug(`Emitted life deducted event for player ${playerId} in room ${roomCode}`, payload);
  }

  /**
   * Get remaining time for a game's current turn
   */
  public getRemainingTime(gameId: string): number | null {
    // Find timer by gameId (any player)
    for (const [key, timer] of this.activeTurnTimers) {
      if (key.startsWith(`${gameId}-`)) {
        const elapsed = (Date.now() - timer.startTime.getTime()) / 1000;
        return Math.max(0, Math.floor(timer.duration - elapsed));
      }
    }
    return null;
  }

  /**
   * Check if a game has an active timer
   */
  public hasActiveTimer(gameId: string): boolean {
    // Find timer by gameId (any player)
    for (const [key, timer] of this.activeTurnTimers) {
      if (key.startsWith(`${gameId}-`)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get timer info for debugging
   */
  public getTimerInfo(gameId: string): any {
    // Find timer by gameId (any player)
    for (const [key, timer] of this.activeTurnTimers) {
      if (key.startsWith(`${gameId}-`)) {
        return {
          gameId: timer.gameId,
          playerId: timer.playerId,
          startTime: timer.startTime,
          duration: timer.duration,
          remainingTime: this.getRemainingTime(gameId)
        };
      }
    }
    return null;
  }

  /**
   * Clean up all timers (for shutdown or cleanup)
   */
  public cleanup(): void {
    for (const [gameId, timer] of this.activeTurnTimers) {
      clearTimeout(timer.timeoutId);
      clearInterval(timer.tickIntervalId);
      logger.debug(`Cleaned up enhanced timer for game ${gameId}`);
    }
    this.activeTurnTimers.clear();
    logger.info("Enhanced turn timeout service cleaned up all timers");
  }

  /**
   * Get statistics about active timers
   */
  public getActiveTimersStats(): {
    totalActiveTimers: number;
    gamesWithTimers: string[];
    averageRemainingTime: number;
  } {
    const gameIds = new Set<string>();
    
    // Extract unique game IDs from timer keys (format: "gameId-playerId")
    for (const key of this.activeTurnTimers.keys()) {
      const gameId = key.split('-')[0];
      gameIds.add(gameId);
    }
    
    const gamesWithTimers = Array.from(gameIds);
    const totalActiveTimers = gamesWithTimers.length;
    
    let totalRemainingTime = 0;
    for (const gameId of gamesWithTimers) {
      const remaining = this.getRemainingTime(gameId);
      if (remaining !== null) {
        totalRemainingTime += remaining;
      }
    }

    return {
      totalActiveTimers,
      gamesWithTimers,
      averageRemainingTime: totalActiveTimers > 0 ? totalRemainingTime / totalActiveTimers : 0
    };
  }
}

export const enhancedTurnTimeoutService = EnhancedTurnTimeoutService.getInstance();
export default EnhancedTurnTimeoutService;