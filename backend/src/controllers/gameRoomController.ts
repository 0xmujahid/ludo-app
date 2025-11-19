// @ts-nocheck
import { Request, Response } from 'express';
import { User } from '../entities/User';
import { AppDataSource } from '../config/database';
import { GameRoomService } from '../services/gameRoomService';
import { Game } from '../entities/Game';
import { logger } from '../utils/logger';
import { io } from '../server';
import { GameStatus, GameVariant } from '../types/game';

interface AuthenticatedRequest extends Request {
  user?: User;
}

// Get singleton instance of GameRoomService
const gameRoomService = GameRoomService.getInstance();

export const createRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { 
      maxPlayers, 
      minPlayers, // Add minPlayers to destructuring
      entryFee, 
      variant, 
      timePerMove, 
      customRules,
      isPrivate,
      password 
    } = req.body;

    const creator = req.user;

    if (!creator) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Validate required fields and room size
    if (!maxPlayers || entryFee === undefined) {
      res.status(400).json({ message: 'Missing required fields: maxPlayers and entryFee are required' });
      return;
    }

    const playerCount = parseInt(maxPlayers);
    if (![2, 3, 4].includes(playerCount)) {
      res.status(400).json({ message: 'Room size must be exactly 2, 3, or 4 players' });
      return;
    }

    // Validate minPlayers if provided
    const minPlayerCount = minPlayers ? parseInt(minPlayers) : 2;
    if (minPlayerCount < 2 || minPlayerCount > playerCount) {
      res.status(400).json({ 
        message: `Minimum players must be between 2 and ${playerCount}` 
      });
      return;
    }

    // Validate entry fee
    const fee = parseFloat(entryFee);
    if (isNaN(fee) || fee < 0) {
      res.status(400).json({ message: 'Entry fee must be a valid non-negative number' });
      return;
    }

    // Validate private room settings
    if (isPrivate && (!password || password.trim().length < 4)) {
      res.status(400).json({ 
        message: 'Private rooms require a password of at least 4 characters' 
      });
      return;
    }

    const game = await gameRoomService.createRoom(creator, {
      maxPlayers: playerCount,
      minPlayers: minPlayerCount, // Pass minPlayers to service
      entryFee: fee,
      variant: (variant as GameVariant) || GameVariant.CLASSIC,
      timePerMove: timePerMove ? parseInt(timePerMove) : undefined,
      isPrivate,
      password,
      customRules: {
        skipTurnOnSix: Boolean(customRules?.skipTurnOnSix),
        multipleTokensPerSquare: Boolean(customRules?.multipleTokensPerSquare),
        safeZoneRules: customRules?.safeZoneRules || 'standard',
        captureReward: parseInt(customRules?.captureReward) || 0,
        bonusTurnOnSix: customRules?.bonusTurnOnSix !== false,
        timeoutPenalty: parseInt(customRules?.timeoutPenalty) || 0
      }
    });

    logger.info(`Room created: ${game.roomCode} by user: ${creator.id}`);

    // Emit room creation WebSocket event with additional info
    io().emit("roomCreated", {
      roomCode: game.roomCode,
      creatorId: creator.id,
      maxPlayers: game.maxPlayers,
      minPlayers: game.state.minPlayers, // Include minPlayers in event
      currentPlayers: game.players.length,
      variant: game.variant,
      timePerMove: game.timePerMove,
      customRules: game.state.customRules,
      playerReadyStates: game.state.players,
      requiredPlayers: game.maxPlayers,
      status: game.status
    });

    res.status(201).json({
      roomCode: game.roomCode,
      maxPlayers: game.maxPlayers,
      minPlayers: game.state.minPlayers, // Include minPlayers in response
      currentPlayers: game.players.length,
      variant: game.variant,
      timePerMove: game.timePerMove,
      customRules: game.state.customRules,
      creatorId: creator.id,
      status: game.status,
      requiredPlayers: game.maxPlayers - game.players.length
    });
  } catch (error) {
    logger.error('Error creating room:', error);
    res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to create room' });
  }
};

export const joinRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomCode } = req.params;
    const { password } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const game = await gameRoomService.joinRoom(roomCode, user, password);

    logger.info(`User ${user.id} joined room: ${roomCode}`);

    // Emit player joined event with enhanced information
    io().emit("playerJoined", {
      roomCode,
      userId: user.id,
      username: user.username,
      currentPlayers: game.players.length,
      maxPlayers: game.maxPlayers,
      readyStates: game.state.players,
      remainingPlayers: game.maxPlayers - game.players.length
    });

    res.json({
      roomCode: game.roomCode,
      maxPlayers: game.maxPlayers,
      currentPlayers: game.players.length,
      variant: game.variant,
      timePerMove: game.timePerMove,
      customRules: game.state.customRules,
      isPrivate: game.isPrivate,
      yourPosition: game.players.find(p => p.userId === user.id)?.position,
      status: game.status,
      remainingPlayers: game.maxPlayers - game.players.length
    });
  } catch (error) {
    logger.error('Error joining room:', error);
    res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to join room' });
  }
};

export const setPlayerReady = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomCode } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const game = await gameRoomService.setPlayerReady(roomCode, user);
    const allPlayersReady = game.players.every(p => p.isReady);
    const connectedPlayers = game.players.filter(p => p.isActive);
    const canStart = connectedPlayers.length >= game.state.minPlayers && 
                    (connectedPlayers.length === game.maxPlayers || allPlayersReady);

    // Emit player ready status update
    io().emit("playerReady", {
      roomCode,
      userId: user.id,
      username: user.username,
      readyStates: game.state.players,
      allPlayersReady: allPlayersReady,
      gameStarting: canStart
    });

    // If conditions met, start 5-second countdown
    if (canStart) {
      game.status = GameStatus.STARTING;
      await gameRoomService.updateGameStatus(roomCode, GameStatus.STARTING);

      // Emit countdown start
      io().emit("gameStarting", {
        roomCode,
        countdown: 5,
        players: game.players.map(p => ({
          id: p.userId,
          username: p.username,
          color: p.color,
          position: p.position
        }))
      });

      // Start the game after countdown
      setTimeout(async () => {
        try {
          const updatedGame = await gameRoomService.startGame(roomCode);
          io().emit("gameStarted", {
            roomCode,
            gameState: updatedGame.state,
            players: updatedGame.players
          });
        } catch (error) {
          logger.error('Error starting game after countdown:', error);
          io().emit("gameError", {
            roomCode,
            error: "Failed to start game"
          });
        }
      }, 5000);
    }

    res.json({
      success: true,
      status: game.status,
      readyStates: game.state.players,
      allPlayersReady: allPlayersReady,
      canStart: canStart
    });
  } catch (error) {
    logger.error('Error setting player ready:', error);
    res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to set player ready' });
  }
};

export const getActiveRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { isPrivate, variant, maxPlayers } = req.query;

    const queryBuilder = AppDataSource.getRepository(Game)
      .createQueryBuilder('game')
      .where('game.status = :status', { status: 'waiting' });

    if (isPrivate !== undefined) {
      queryBuilder.andWhere('game.isPrivate = :isPrivate', { 
        isPrivate: isPrivate === 'true' 
      });
    }

    if (variant) {
      queryBuilder.andWhere('game.variant = :variant', { variant });
    }

    if (maxPlayers) {
      queryBuilder.andWhere('game.maxPlayers = :maxPlayers', { 
        maxPlayers: parseInt(maxPlayers as string) 
      });
    }

    const rooms = await queryBuilder
      .leftJoinAndSelect('game.players', 'players')
      .select([
        'game.id',
        'game.roomCode',
        'game.maxPlayers',
        'game.variant',
        'game.entryFee',
        'game.isPrivate',
        'game.timePerMove',
        'COUNT(players.id) as playerCount'
      ])
      .groupBy('game.id')
      .getRawMany();

    const formattedRooms = rooms.map(room => ({
      roomCode: room.game_roomCode,
      maxPlayers: room.game_maxPlayers,
      currentPlayers: parseInt(room.playerCount),
      variant: room.game_variant,
      entryFee: room.game_entryFee,
      isPrivate: room.game_isPrivate,
      timePerMove: room.game_timePerMove,
      canJoin: parseInt(room.playerCount) < room.game_maxPlayers,
      remainingPlayers: room.game_maxPlayers - parseInt(room.playerCount)
    }));

    res.json(formattedRooms);
  } catch (error) {
    logger.error('Error fetching active rooms:', error);
    res.status(500).json({ message: 'Failed to fetch active rooms' });
  }
};

export const cleanupInactiveRooms = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await gameRoomService.triggerCleanup();
    res.json({ message: 'Cleanup completed successfully' });
  } catch (error) {
    logger.error('Error triggering cleanup:', error);
    res.status(500).json({ message: 'Failed to trigger cleanup' });
  }
};