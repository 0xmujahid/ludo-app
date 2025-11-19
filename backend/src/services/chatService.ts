import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Game } from '../entities/Game';
import { logger } from '../utils/logger';
import { getDataSource } from '../config/database';

export interface ChatMessage {
  gameId: string;
  userId: string;
  message: string;
  timestamp: Date;
}

// Use in-memory storage for messages
const chatMessages: ChatMessage[] = [];

// Add repository and connection management
let userRepository: Repository<User>;
let gameRepository: Repository<Game>;
let dataSource: DataSource | null = null;
let initialized = false;

async function ensureInitialized() {
  try {
    if (!initialized || !dataSource?.isInitialized) {
      logger.debug("Initializing chat service database connection");
      dataSource = await getDataSource();

      if (!dataSource.isInitialized) {
        await dataSource.initialize();
      }

      userRepository = dataSource.getRepository(User);
      gameRepository = dataSource.getRepository(Game);
      initialized = true;

      logger.debug("Chat service database connection initialized", {
        isInitialized: dataSource.isInitialized,
        hasUserRepo: !!userRepository,
        hasGameRepo: !!gameRepository
      });
    }
  } catch (error) {
    logger.error("Failed to initialize chat service database:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

export const sendMessage = async (gameId: string, userId: string, message: string): Promise<ChatMessage> => {
  try {
    logger.debug("Sending chat message", { gameId, userId });
    await ensureInitialized();

    // Special handling for system messages
    if (userId === 'system') {
      const game = await gameRepository.findOne({ 
        where: { id: gameId },
        relations: ['players']
      });

      if (!game) {
        logger.error("Game not found for system message", { gameId });
        throw new Error('Game not found');
      }

      const chatMessage: ChatMessage = {
        gameId,
        userId: 'system',
        message,
        timestamp: new Date(),
      };

      chatMessages.push(chatMessage);
      logger.debug("System message stored successfully", { 
        gameId,
        messageCount: chatMessages.length 
      });

      return chatMessage;
    }

    // Regular user message handling
    const user = await userRepository.findOne({ where: { id: userId } });
    const game = await gameRepository.findOne({ 
      where: { id: gameId },
      relations: ['players']
    });

    if (!user || !game) {
      logger.error("User or game not found for chat message", { userId, gameId });
      throw new Error('User or game not found');
    }

    const isPlayerInGame = game.players.some(player => player.userId === userId);
    if (!isPlayerInGame) {
      logger.error("User not in game", { userId, gameId });
      throw new Error('User is not a player in this game');
    }

    const chatMessage: ChatMessage = {
      gameId,
      userId,
      message,
      timestamp: new Date(),
    };

    chatMessages.push(chatMessage);
    logger.debug("Chat message stored successfully", { 
      gameId,
      userId,
      messageCount: chatMessages.length 
    });

    return chatMessage;
  } catch (error) {
    logger.error("Error sending chat message:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      gameId,
      userId
    });
    throw error;
  }
};

export const getGameMessages = async (gameId: string): Promise<ChatMessage[]> => {
  try {
    await ensureInitialized();
    return chatMessages.filter(message => message.gameId === gameId);
  } catch (error) {
    logger.error("Error retrieving game messages:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      gameId
    });
    throw error;
  }
};