import { IsNull, Not } from 'typeorm';
import { User, UserRole } from '../entities/User';
import { Game } from '../entities/Game';
import { Tournament, TournamentFormat } from '../entities/Tournament';
import { Config } from '../entities/Config'; // Import the Config entity
import { logger } from '../utils/logger';
import { AppDataSource } from '../config/database';
import { GameStatus } from '../types/game';
import { GameType } from '../entities/GameType';

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    return await userRepository.find({ 
      select: ['id', 'username', 'phoneNumber', 'role', 'isVerified'] 
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
};

export const getUserDetails = async (userId: string): Promise<User> => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ 
    where: { id: userId }, 
    relations: ['wallet', 'games', 'tournaments'] 
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
};

export const updateUserRole = async (userId: string, newRole: UserRole): Promise<User> => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: userId } });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  user.role = newRole;
  return userRepository.save(user);
};

export const getGameStatistics = async () => {
  const gameRepository = AppDataSource.getRepository(Game);
  
  try {
    const [totalGames, completedGames, inProgressGames] = await Promise.all([
      gameRepository.count(),
      gameRepository.count({ where: { status: GameStatus.COMPLETED } }),
      gameRepository.count({ where: { status: GameStatus.IN_PROGRESS } })
    ]);

    return {
      totalGames,
      completedGames,
      inProgressGames
    };
  } catch (error) {
    logger.error('Error getting game statistics:', error);
    throw new Error('Failed to fetch game statistics');
  }
};

export const getTournamentStatistics = async () => {
  try {
    const tournamentRepository = AppDataSource.getRepository(Tournament);
    const [totalTournaments, activeTournaments, completedTournaments] = await Promise.all([
      tournamentRepository.count(),
      tournamentRepository.count({ 
        where: { endTime: IsNull() }
      }),
      tournamentRepository.count({ 
        where: { endTime: Not(IsNull()) }
      })
    ]);

    return {
      totalTournaments,
      activeTournaments,
      completedTournaments
    };
  } catch (error) {
    logger.error('Error getting tournament statistics:', error);
    throw new Error('Failed to fetch tournament statistics');
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: userId } });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  await userRepository.remove(user);
};

export const getAllTournaments = async (): Promise<Tournament[]> => {
  try {
    const tournamentRepository = AppDataSource.getRepository(Tournament);
    return await tournamentRepository.find({ 
      relations: ['participants'],
      order: {
        startTime: 'DESC'
      }
    });
  } catch (error) {
    logger.error('Error fetching tournaments:', error);
    throw new Error('Failed to fetch tournaments');
  }
};

export const getTournamentDetails = async (tournamentId: string): Promise<Tournament> => {
  const tournamentRepository = AppDataSource.getRepository(Tournament);
  const tournament = await tournamentRepository.findOne({ 
    where: { id: tournamentId }, 
    relations: ['participants'] 
  });
  
  if (!tournament) {
    throw new Error('Tournament not found');
  }
  
  return tournament;
};

export const createTournament = async (tournamentData: {
  name: string;
  startTime: Date;
  maxParticipants: number;
  entryFee: number;
  format: TournamentFormat;
}): Promise<Tournament> => {
  const tournamentRepository = AppDataSource.getRepository(Tournament);
  
  try {
    const tournament = tournamentRepository.create({
      ...tournamentData,
      prizePool: tournamentData.entryFee * tournamentData.maxParticipants * 0.9 // 10% platform fee
    });
    
    return await tournamentRepository.save(tournament);
  } catch (error) {
    logger.error('Error creating tournament:', error);
    throw new Error('Failed to create tournament');
  }
};

export const updateTournament = async (
  tournamentId: string, 
  updateData: Partial<Tournament>
): Promise<Tournament> => {
  const tournamentRepository = AppDataSource.getRepository(Tournament);
  
  try {
    const tournament = await tournamentRepository.findOne({ where: { id: tournamentId } });
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    Object.assign(tournament, updateData);
    return await tournamentRepository.save(tournament);
  } catch (error) {
    logger.error('Error updating tournament:', error);
    throw new Error('Failed to update tournament');
  }
};

export const deleteTournament = async (tournamentId: string): Promise<void> => {
  const tournamentRepository = AppDataSource.getRepository(Tournament);
  
  try {
    const tournament = await tournamentRepository.findOne({ where: { id: tournamentId } });
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    await tournamentRepository.remove(tournament);
  } catch (error) {
    logger.error('Error deleting tournament:', error);
    throw new Error('Failed to delete tournament');
  }
};

export const getAllConfigs = async (): Promise<Config[]> => {
    try {
        const configRepository = AppDataSource.getRepository(Config);
        return await configRepository.find();
    } catch (error) {
        logger.error('Error fetching configs:', error);
        throw new Error('Failed to fetch configs');
    }
};

export const getConfigDetails = async (configId: number): Promise<Config> => {
    const configRepository = AppDataSource.getRepository(Config);
    const config = await configRepository.findOne({ where: { id: configId } });
    
    if (!config) {
        throw new Error('Config not found');
    }
    
    return config;
};

export const createConfig = async (configData: {
    tds: number;
    fee: number;
    cashback: number;
    referralAmount: number;
    name: string;
    status: boolean;
    twoPlayer: number[];
    threePlayer: number[];
    fourPlayer: number[];
    whatsapp?: string;
    telegram?: string;
    email?: string;
}): Promise<Config> => {
    const configRepository = AppDataSource.getRepository(Config);
    
    // Validate player arrays
    if (configData.twoPlayer.length !== 2 || !configData.twoPlayer.every(val => val >= 0 && val <= 100)) {
        throw new Error('twoPlayer must be an array of 2 integers between 0 and 100');
    }
    if (configData.threePlayer.length !== 3 || !configData.threePlayer.every(val => val >= 0 && val <= 100)) {
        throw new Error('threePlayer must be an array of 3 integers between 0 and 100');
    }
    if (configData.fourPlayer.length !== 4 || !configData.fourPlayer.every(val => val >= 0 && val <= 100)) {
        throw new Error('fourPlayer must be an array of 4 integers between 0 and 100');
    }

    // Validate referralAmount
    if (configData.referralAmount < 0) {
        throw new Error('referralAmount must be a non-negative number');
    }

    // If this config is being set as active, deactivate all other configs
    if (configData.status) {
        await configRepository.update({ status: true }, { status: false });
    }
    
    const config = configRepository.create(configData);
    return await configRepository.save(config);
};

export const updateConfig = async (configId: number, updateData: Partial<Config>): Promise<Config> => {
    const configRepository = AppDataSource.getRepository(Config);
    
    const config = await configRepository.findOne({ where: { id: configId } });
    if (!config) {
        throw new Error('Config not found');
    }

    // Validate player arrays if they are being updated
    if (updateData.twoPlayer) {
        if (updateData.twoPlayer.length !== 2 || !updateData.twoPlayer.every(val => val >= 0 && val <= 100)) {
            throw new Error('twoPlayer must be an array of 2 integers between 0 and 100');
        }
    }
    if (updateData.threePlayer) {
        if (updateData.threePlayer.length !== 3 || !updateData.threePlayer.every(val => val >= 0 && val <= 100)) {
            throw new Error('threePlayer must be an array of 3 integers between 0 and 100');
        }
    }
    if (updateData.fourPlayer) {
        if (updateData.fourPlayer.length !== 4 || !updateData.fourPlayer.every(val => val >= 0 && val <= 100)) {
            throw new Error('fourPlayer must be an array of 4 integers between 0 and 100');
        }
    }
    
    // If this config is being set as active, deactivate all other configs
    if (updateData.status) {
        await configRepository.update({ status: true }, { status: false });
    }
    
    Object.assign(config, updateData);
    return await configRepository.save(config);
};

export const deleteConfig = async (configId: number): Promise<void> => {
    const configRepository = AppDataSource.getRepository(Config);
    
    const config = await configRepository.findOne({ where: { id: configId } });
    if (!config) {
        throw new Error('Config not found');
    }
    
    await configRepository.remove(config);
};

export const getActiveConfig = async (): Promise<Config> => {
    const configRepository = AppDataSource.getRepository(Config);
    const activeConfig = await configRepository.findOne({ where: { status: true } });
    
    if (!activeConfig) {
        throw new Error('No active configuration found');
    }
    
    return activeConfig;
};

export const getAllGameTypes = async () => {
  try {
    const gameTypeRepository = AppDataSource.getRepository(GameType);
    return await gameTypeRepository.find();
  } catch (error) {
    logger.error('Error getting all game types:', error);
    throw new Error('Failed to fetch game types');
  }
};

export const createGameType = async (data: Partial<GameType>) => {
  try {
    const gameTypeRepository = AppDataSource.getRepository(GameType);
    const gameType = gameTypeRepository.create(data);
    return await gameTypeRepository.save(gameType);
  } catch (error) {
    logger.error('Error creating game type:', error);
    throw new Error('Failed to create game type');
  }
};

export const updateGameType = async (id: string, data: Partial<GameType>) => {
  try {
    const gameTypeRepository = AppDataSource.getRepository(GameType);
    await gameTypeRepository.update(id, data);
    return await gameTypeRepository.findOne({ where: { id } });
  } catch (error) {
    logger.error('Error updating game type:', error);
    throw new Error('Failed to update game type');
  }
};

export const deleteGameType = async (id: string) => {
  try {
    const gameTypeRepository = AppDataSource.getRepository(GameType);
    await gameTypeRepository.delete(id);
  } catch (error) {
    logger.error('Error deleting game type:', error);
    throw new Error('Failed to delete game type');
  }
};
