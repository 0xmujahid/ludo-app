import { logger } from "../utils/logger";
import { getDataSource } from "../config/database";
import { Game } from "../entities/Game";
import { GamePlayers } from "../entities/GamePlayers";
import { GameStatus } from "../types/game";
import { GameEvents } from "./socketService";
import { handleGameCompletion } from "./gameService";

interface TurnTimer {
  gameId: string;
  playerId: string;
  timeoutId: NodeJS.Timeout;
  startTime: Date;
  duration: number;
}

class TurnTimeoutService {
  private static instance: TurnTimeoutService;
  private activeTurnTimers: Map<string, TurnTimer> = new Map();
  private socketService: any;

  private constructor() {}

  public static getInstance(): TurnTimeoutService {
    if (!TurnTimeoutService.instance) {
      TurnTimeoutService.instance = new TurnTimeoutService();
    }
    return TurnTimeoutService.instance;
  }

  public setSocketService(socketService: any) {
    this.socketService = socketService;
  }

  /**
   * Start a turn timeout for a specific player
   */
  public startTurnTimeout(gameId: string, playerId: string, timeoutDuration: number): void {
    // Clear any existing timeout for this game
    this.clearTurnTimeout(gameId);

    const timeoutId = setTimeout(async () => {
      await this.handleTurnTimeout(gameId, playerId);
    }, timeoutDuration * 1000); // Convert seconds to milliseconds

    const turnTimer: TurnTimer = {
      gameId,
      playerId,
      timeoutId,
      startTime: new Date(),
      duration: timeoutDuration
    };

    this.activeTurnTimers.set(gameId, turnTimer);

    logger.info(`Turn timeout started for player ${playerId} in game ${gameId}`, {
      timeoutDuration,
      startTime: turnTimer.startTime
    });
  }

  /**
   * Clear the turn timeout for a specific game
   */
  public clearTurnTimeout(gameId: string): void {
    const existingTimer = this.activeTurnTimers.get(gameId);
    if (existingTimer) {
      clearTimeout(existingTimer.timeoutId);
      this.activeTurnTimers.delete(gameId);
      logger.debug(`Turn timeout cleared for game ${gameId}`);
    }
  }

  /**
   * Handle when a turn timeout occurs
   */
  private async handleTurnTimeout(gameId: string, playerId: string): Promise<void> {
    try {
      logger.info(`Turn timeout occurred for player ${playerId} in game ${gameId}`);

      const dataSource = await getDataSource();
      const gameRepository = dataSource.getRepository(Game);
      const gamePlayerRepository = dataSource.getRepository(GamePlayers);

      // Get the game and player
      const game = await gameRepository.findOne({
        where: { id: gameId },
        relations: ["players"]
      });

      if (!game || game.status !== GameStatus.IN_PROGRESS) {
        logger.warn(`Game ${gameId} not found or not in progress during timeout`);
        return;
      }

      const gamePlayer = game.players.find(p => p.userId === playerId);
      if (!gamePlayer) {
        logger.warn(`Player ${playerId} not found in game ${gameId}`);
        return;
      }

      // Decrease player's life
      const gameState = game.state as any;
      if (gameState.players[playerId]) {
        gameState.players[playerId].lives = Math.max(0, (gameState.players[playerId].lives || 3) - 1);
        
        logger.info(`Player ${playerId} life decreased to ${gameState.players[playerId].lives} due to timeout`);

        // Check if player has no lives left
        if (gameState.players[playerId].lives <= 0) {
          // Mark player as inactive
          gamePlayer.isActive = false;
          gameState.players[playerId].isActive = false;
          
          logger.info(`Player ${playerId} eliminated due to no lives remaining`);
          
          // Remove from turn order
          gameState.turnOrder = gameState.turnOrder.filter((id: string) => id !== playerId);
        }

        // Move to next player's turn
        const nextPlayerId = this.getNextPlayer(gameState.turnOrder, playerId);
        if (nextPlayerId) {
          gameState.currentPlayer = nextPlayerId;
          gameState.lastDiceRoll = 0; // Reset dice for next player
        }

        // Save the updated game state
        game.state = gameState;
        await gameRepository.save(game);
        await gamePlayerRepository.save(gamePlayer);

        // Emit timeout event to all players in the game
        if (this.socketService) {
          this.socketService.emitToRoom(`game:${game.roomCode}`, GameEvents.TURN_TIMEOUT, {
            gameId,
            playerId,
            remainingLives: gameState.players[playerId].lives,
            isEliminated: gameState.players[playerId].lives <= 0,
            nextPlayerId,
            timestamp: new Date()
          });

          // Emit game state update
          this.socketService.emitGameStateUpdate(game.roomCode, {
            type: "TURN_TIMEOUT",
            gameId: game.id,
            roomCode: game.roomCode,
            gameState,
            currentPlayer: nextPlayerId,
            timestamp: new Date()
          });

          // Start timeout for next player if game is still active
          if (nextPlayerId && gameState.turnOrder.length > 1) {
            this.startTurnTimeout(gameId, nextPlayerId, game.turnTimeLimit || 30);
          }
        }

        // Check if game should end (only one player left)
        const activePlayers = gameState.turnOrder.length;
        if (activePlayers <= 1) {
          await this.endGameDueToTimeouts(game);
        }
      }

    } catch (error) {
      logger.error(`Error handling turn timeout for player ${playerId} in game ${gameId}:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      // Clean up the timer
      this.activeTurnTimers.delete(gameId);
    }
  }

  /**
   * Get the next player in turn order
   */
  private getNextPlayer(turnOrder: string[], currentPlayerId: string): string | null {
    if (!turnOrder || turnOrder.length === 0) {
      return null;
    }

    const currentIndex = turnOrder.indexOf(currentPlayerId);
    if (currentIndex === -1) {
      // Current player not in turn order, return first player
      return turnOrder[0];
    }

    // Get next player (wrap around to beginning if at end)
    const nextIndex = (currentIndex + 1) % turnOrder.length;
    return turnOrder[nextIndex];
  }

  /**
   * End the game when too many players have timed out
   */
  private async endGameDueToTimeouts(game: Game): Promise<void> {
    try {
      const dataSource = await getDataSource();
      const gameRepository = dataSource.getRepository(Game);

      // Find the winner (last remaining active player)
      const gameState = game.state as any;
      const remainingPlayers = Object.keys(gameState.players).filter(
        playerId => gameState.players[playerId].isActive && (gameState.players[playerId].lives || 0) > 0
      );

      if (remainingPlayers.length === 1) {
        const winnerId = remainingPlayers[0];
        gameState.winner = winnerId;
        gameState.players[winnerId].isWinner = true;
      }

      // Update game status
      game.status = GameStatus.COMPLETED;
      game.endTime = new Date();
      game.state = gameState;

      await gameRepository.save(game);
      await handleGameCompletion(game);

      logger.info(`Game ${game.id} ended due to timeouts`, {
        remainingPlayers: remainingPlayers.length,
        winner: remainingPlayers[0] || null
      });

      // Emit game completion event
      if (this.socketService) {
        this.socketService.emitGameCompleted(game.roomCode, {
          gameId: game.id,
          winner: remainingPlayers.length === 1 ? { id: remainingPlayers[0] } : null,
          endTime: game.endTime,
          reason: "TIMEOUTS"
        });
      }

    } catch (error) {
      logger.error(`Error ending game ${game.id} due to timeouts:`, {
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Get remaining time for a player's turn
   */
  public getRemainingTime(gameId: string): number | null {
    const timer = this.activeTurnTimers.get(gameId);
    if (!timer) {
      return null;
    }

    const elapsed = Date.now() - timer.startTime.getTime();
    const remaining = Math.max(0, (timer.duration * 1000) - elapsed);
    return Math.floor(remaining / 1000); // Return seconds
  }

  /**
   * Clean up all timers (useful for shutdown)
   */
  public cleanup(): void {
    for (const [gameId, timer] of this.activeTurnTimers) {
      clearTimeout(timer.timeoutId);
      logger.debug(`Cleaned up timer for game ${gameId}`);
    }
    this.activeTurnTimers.clear();
  }
}

export const turnTimeoutService = TurnTimeoutService.getInstance();
export default TurnTimeoutService;