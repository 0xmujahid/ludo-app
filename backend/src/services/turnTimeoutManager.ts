import { enhancedTurnTimeoutService } from "./enhancedTurnTimeoutService";
import { logger } from "../utils/logger";
import { GameStatus } from "../types/game";
import { Game } from "../entities/Game";
import SocketService from "./socketService";

/**
 * Turn Timeout Manager
 * Manages turn timeouts for games and integrates with game lifecycle events
 */
class TurnTimeoutManager {
  private static instance: TurnTimeoutManager;

  private constructor() {}

  public static getInstance(): TurnTimeoutManager {
    if (!TurnTimeoutManager.instance) {
      TurnTimeoutManager.instance = new TurnTimeoutManager();
    }
    return TurnTimeoutManager.instance;
  }

  /**
   * Initialize turn timeout for a new turn
   */
  public async startTurnTimeout(game: Game, playerId: string): Promise<void> {
    try {
      // Determine timeout duration with priority: game.turnTimeLimit > gameType.turnTimeLimit > default
      const defaultTimeout = 30; // 30 seconds default
      const gameTypeTimeout = game.gameType?.turnTimeLimit;
      const overrideTimeout = game.turnTimeLimit;
      
      let finalTimeout = defaultTimeout;
      let timeoutSource = "default";
      
      if (overrideTimeout && overrideTimeout > 0) {
        finalTimeout = overrideTimeout;
        timeoutSource = "game override";
      } else if (gameTypeTimeout && gameTypeTimeout > 0) {
        finalTimeout = gameTypeTimeout;
        timeoutSource = "game type";
      }
      
      const timeoutConfig = {
        gameId: game.id,
        playerId,
        timeoutInSeconds: finalTimeout,
        gameTypeTimeout: gameTypeTimeout,
        overrideTimeout: overrideTimeout,
      };

      await enhancedTurnTimeoutService.startTurnTimeout(timeoutConfig);

      logger.info(
        `Turn timeout started for player ${playerId} in game ${game.id}`,
        {
          gameType: game.gameType?.name,
          gameTypeTimeout: gameTypeTimeout,
          overrideTimeout: overrideTimeout,
          finalTimeout: finalTimeout,
          timeoutSource: timeoutSource,
          roomCode: game.roomCode,
        },
      );
    } catch (error) {
      logger.error(
        `Failed to start turn timeout for player ${playerId} in game ${game.id}:`,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          gameType: game.gameType?.name,
          roomCode: game.roomCode,
        },
      );
    }
  }

  /**
   * Reset timeout for bonus moves (when player gets another turn)
   */
  public async resetTimeoutForBonus(
    gameId: string,
    playerId: string,
  ): Promise<void> {
    try {
      await enhancedTurnTimeoutService.resetTimerForBonus(gameId, playerId);
      logger.info(
        `Timeout reset for bonus turn - player ${playerId} in game ${gameId}`,
      );
    } catch (error) {
      logger.error(
        `Failed to reset timeout for bonus - player ${playerId} in game ${gameId}:`,
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
    }
  }

  /**
   * Clear timeout when turn changes or game events occur
   */
  public clearTimeout(gameId: string, reason: string): void {
    try {
      enhancedTurnTimeoutService.clearAllTimersForGame(gameId);
      logger.debug(
        `Turn timeout cleared for game ${gameId}, reason: ${reason}`,
      );
    } catch (error) {
      logger.error(`Failed to clear timeout for game ${gameId}:`, {
        reason,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Handle game lifecycle events that require timeout management
   */
  public handleGameEvent(
    game: Game,
    event: "GAME_END" | "PLAYER_LEFT" | "GAME_PAUSED",
  ): void {
    try {
      enhancedTurnTimeoutService.clearTimeoutForGameEnd(game.id, event);
      logger.info(`Turn timeout cleared for game ${game.id} due to ${event}`);
    } catch (error) {
      logger.error(
        `Failed to handle game event ${event} for game ${game.id}:`,
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
    }
  }

  /**
   * Initialize the timeout service with socket service
   */
  public initialize(socketService: SocketService): void {
    enhancedTurnTimeoutService.setSocketService(socketService);
    logger.info("Turn timeout manager initialized successfully");
  }

  /**
   * Get remaining time for a game's current turn
   */
  public getRemainingTime(gameId: string): number | null {
    return enhancedTurnTimeoutService.getRemainingTime(gameId);
  }

  /**
   * Check if a game has an active timer
   */
  public hasActiveTimer(gameId: string): boolean {
    return enhancedTurnTimeoutService.hasActiveTimer(gameId);
  }

  /**
   * Get timer statistics for monitoring
   */
  public getTimerStats(): any {
    return enhancedTurnTimeoutService.getActiveTimersStats();
  }

  /**
   * Cleanup all timers (for shutdown)
   */
  public cleanup(): void {
    enhancedTurnTimeoutService.cleanup();
    logger.info("Turn timeout manager cleaned up successfully");
  }
}

export const turnTimeoutManager = TurnTimeoutManager.getInstance();
export default TurnTimeoutManager;
