// @ts-nocheck
import { Response } from "express";
import * as gameService from "../services/gameService";
import { AuthenticatedRequest, EntityId } from "../types/common";
import { GameVariant } from "../entities/Game";
import SocketService, {
  GameEvents,
  GameStateUpdatePayload,
} from "../services/socketService";
import { logger } from "../utils/logger";
import { GameRoomService } from "../services/gameRoomService";

// Get socket service instance
const socketService = SocketService.getInstance();

export const createGame = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { variant = GameVariant.CLASSIC, gameTypeId = "default" } = req.body;
    const game = await gameService.createGame([userId], variant, gameTypeId);
    res.status(201).json(game);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const createCustomRoom = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const {
      entryFee = 0,
      maxPlayers = 4,
      variant = GameVariant.CLASSIC,
    } = req.body;

    if (typeof entryFee !== "number" || typeof maxPlayers !== "number") {
      res
        .status(400)
        .json({ message: "Invalid entry fee or max players value" });
      return;
    }

    const game = await gameService.createCustomRoom(
      userId,
      entryFee,
      maxPlayers,
      variant,
    );
    res.status(201).json(game);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const joinGame = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { gameId } = req.params;
    const game = await gameService.joinGame(gameId, userId);

    // Notify other players about the new player joining
    socketService.emitGameStateUpdate(game.roomCode, {
      type: "PLAYER_JOINED",
      gameId,
      roomCode: game.roomCode,
      player: {
        id: userId,
        username: req.user?.username,
      },
      timestamp: new Date(),
    });

    res.json(game);
  } catch (error: any) {
    logger.error("Error joining game:", error);
    res.status(400).json({ message: error.message });
  }
};

export const joinMatchmaking = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const {
      preferredVariant = GameVariant.CLASSIC,
      region,
      gameTypeId,
    } = req.body;

    if (!region) {
      res.status(400).json({ message: "Region is required for matchmaking" });
      return;
    }

    if (!gameTypeId) {
      res
        .status(400)
        .json({ message: "Game type is required for matchmaking" });
      return;
    }

    const game = await gameService.joinMatchmaking(
      userId,
      preferredVariant,
      region,
      gameTypeId,
    );

    if (game) {
      res.status(201).json(game);
    } else {
      res.status(202).json({
        message: "Joined matchmaking queue",
        queueInfo: {
          userId,
          region,
          gameTypeId,
          preferredVariant,
        },
      });
    }
  } catch (error: any) {
    logger.error("Error joining matchmaking:", error);
    res.status(400).json({ message: error.message });
  }
};

export const rollDice = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const gameId = req.params.gameId as EntityId;
    const result = await gameService.rollDice(gameId, userId);

    // Emit dice roll event through SocketService
    const gameStateUpdate: GameStateUpdatePayload = {
      type: "DICE_ROLLED",
      gameId,
      roomCode: result.gameState.roomCode,
      player: {
        id: userId,
        position: result.gameState.players[userId].position,
      },
      diceResult: result.diceResult,
      hasValidMoves: result.hasValidMoves,
      timestamp: new Date(),
    };

    socketService.emitGameStateUpdate(
      result.gameState.roomCode,
      gameStateUpdate,
    );
    logger.debug("Emitted dice roll event:", gameStateUpdate);

    res.json(result);
  } catch (error: any) {
    logger.error("Error rolling dice:", error);
    res.status(400).json({ message: error.message });
  }
};

export const movePiece = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const gameId = req.params.gameId as EntityId;
    const { pieceId } = req.body as { pieceId: number };
    const result = await gameService.movePiece(gameId, userId, pieceId);

    // Emit piece movement through SocketService
    const gameStateUpdate: GameStateUpdatePayload = {
      type: "PIECE_MOVED",
      gameId,
      roomCode: result.gameState.roomCode,
      player: {
        id: userId,
        position: result.gameState.players[userId].position,
      },
      kills:
        result.kills > 0
          ? [
              {
                playerId: userId,
                position: result.gameState.players[userId].pieces[pieceId],
              },
            ]
          : [],
      timestamp: new Date(),
    };

    socketService.emitGameStateUpdate(
      result.gameState.roomCode,
      gameStateUpdate,
    );
    logger.debug("Emitted piece moved event:", gameStateUpdate);

    res.json(result);
  } catch (error: any) {
    logger.error("Error moving piece:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getGameState = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const gameId = req.params.gameId as EntityId;
    const gameState = await gameService.getGameState(gameId);

    // Get the game room service instance
    const gameRoomService = GameRoomService.getInstance();

    // Check if the user is part of this game
    const isUserInGame = Object.keys(gameState.players).includes(userId);

    if (isUserInGame) {
      // Get socket connection status for this user
      const isConnected = socketService.isPlayerConnected(gameState.roomCode, userId);

      if (!isConnected) {
        // User is part of the game but not connected - handle reconnection
        logger.info(`Reconnecting user ${userId} to game ${gameId} with room code ${gameState.roomCode}`);

        try {
          // Attempt to reconnect the player to the game
          const updatedGame = await gameRoomService.reconnectPlayer(gameState.roomCode, userId);

          // Emit player reconnection event through socket
          socketService.emitGameStateUpdate(gameState.roomCode, {
            type: "PLAYER_RECONNECTED",
            gameId,
            roomCode: gameState.roomCode,
            player: {
              id: userId,
              username: req.user?.username || "",
              position: gameState.players[userId].position,
              isActive: true
            },
            timestamp: new Date(),
          });

          logger.info(`Successfully reconnected user ${userId} to game ${gameId}`);

          // Return the updated game state after reconnection
          res.json(updatedGame.state);
          return;
        } catch (reconnectError: any) {
          logger.error(`Failed to reconnect user ${userId} to game ${gameId}:`, reconnectError);
          // Continue with the regular response if reconnection fails
        }
      } else {
        // User is already connected, just emit a game state update
        socketService.emitGameStateUpdate(gameState.roomCode, {
          type: "GAME_STATE_SYNC",
          gameId,
          roomCode: gameState.roomCode,
          player: {
            id: userId,
            position: gameState.players[userId].position,
          },
          timestamp: new Date(),
        });

        logger.debug(`Emitted game state sync for already connected user ${userId} in game ${gameId}`);
      }
    } else {
      logger.warn(`User ${userId} requested game state for game ${gameId} but is not part of this game`);
    }

    res.json(gameState);
  } catch (error: any) {
    logger.error("Error getting game state:", error);
    res.status(404).json({ message: error.message });
  }
};

export const getActiveGames = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const activeGames = await gameService.getActiveGames();
    res.json(activeGames);
  } catch (error: any) {
    logger.error("Error getting active games:", error);
    res.status(500).json({ message: error.message });
  }
};

export const leaveMatchmaking = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    await gameService.leaveMatchmaking(userId);
    res.status(200).json({ message: "Successfully left matchmaking" });
  } catch (error: any) {
    logger.error("Error leaving matchmaking:", error);
    res.status(400).json({ message: error.message });
  }
};

export const canRejoinGame = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { gameId } = req.params;
    const canRejoin = await gameService.canRejoinGame(userId);

    if (canRejoin.canRejoin && canRejoin.gameId === gameId) {
      res.json({
        canRejoin: true,
        gameId: canRejoin.gameId,
        message: "You can rejoin this game"
      });
    } else {
      res.json({
        canRejoin: false,
        message: "You cannot rejoin this game"
      });
    }
  } catch (error: any) {
    logger.error("Error checking game rejoin status:", error);
    res.status(400).json({ message: error.message });
  }
};

export const rejoinGame = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { gameId } = req.params;
    const game = await gameService.rejoinGame(gameId, userId);

    res.json({
      success: true,
      game,
      message: "Successfully rejoined the game"
    });
  } catch (error: any) {
    logger.error("Error rejoining game:", error);
    res.status(400).json({ message: error.message });
  }
};

export const leaveGame = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    await gameService.leaveGame(userId);

    res.json({
      success: true,
      message: "Successfully left the game"
    });
  } catch (error: any) {
    logger.error("Error leaving game:", error);
    res.status(400).json({ message: error.message });
  }
};