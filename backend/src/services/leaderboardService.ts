import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Leaderboards } from '../entities/Leaderboards';
import { UserStats } from '../entities/UserStats';
import { GameVariant } from '../types/game';

export enum LeaderboardType {
  OVERALL = 'overall',
  QUICK_GAMES = 'quick_games',
  CLASSIC_GAMES = 'classic_games',
  TOURNAMENTS = 'tournaments',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  score: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  variant?: GameVariant;
}

export const getLeaderboard = async (
  type: LeaderboardType = LeaderboardType.OVERALL,
  limit: number = 100
): Promise<LeaderboardEntry[]> => {
  const userStatsRepository = AppDataSource.getRepository(UserStats);
  const userRepository = AppDataSource.getRepository(User);
  const leaderboardRepository = AppDataSource.getRepository(Leaderboards);

  // Get current period for time-based leaderboards
  const now = new Date();
  const periodStart = type === LeaderboardType.WEEKLY 
    ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    : type === LeaderboardType.MONTHLY
    ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    : null;

  let query = userStatsRepository.createQueryBuilder('stats')
    .leftJoinAndSelect('stats.user', 'user');

  // Apply filters based on leaderboard type
  switch (type) {
    case LeaderboardType.QUICK_GAMES:
      query = query.orderBy('stats.quickGamesWon', 'DESC')
        .addOrderBy('stats.quickGamesPlayed', 'DESC');
      break;
    case LeaderboardType.CLASSIC_GAMES:
      query = query.orderBy('stats.classicGamesWon', 'DESC')
        .addOrderBy('stats.classicGamesPlayed', 'DESC');
      break;
    case LeaderboardType.TOURNAMENTS:
      query = query.orderBy('stats.rankingPoints', 'DESC');
      break;
    case LeaderboardType.WEEKLY:
    case LeaderboardType.MONTHLY:
      if (periodStart) {
        query = query.where('stats.updatedAt >= :periodStart', { periodStart });
      }
      query = query.orderBy('stats.rankingPoints', 'DESC');
      break;
    default:
      query = query.orderBy('stats.gamesWon', 'DESC')
        .addOrderBy('stats.gamesPlayed', 'DESC');
  }

  const results = await query.take(limit).getMany();

  // Transform results into leaderboard entries
  return results.map((stats, index) => ({
    rank: index + 1,
    userId: stats.userId,
    username: stats.user.username,
    avatarUrl: stats.user.avatarUrl,
    score: type === LeaderboardType.TOURNAMENTS ? stats.rankingPoints :
           type === LeaderboardType.QUICK_GAMES ? stats.quickGamesWon :
           type === LeaderboardType.CLASSIC_GAMES ? stats.classicGamesWon :
           stats.gamesWon,
    gamesPlayed: type === LeaderboardType.QUICK_GAMES ? stats.quickGamesPlayed :
                 type === LeaderboardType.CLASSIC_GAMES ? stats.classicGamesPlayed :
                 stats.gamesPlayed,
    gamesWon: type === LeaderboardType.QUICK_GAMES ? stats.quickGamesWon :
              type === LeaderboardType.CLASSIC_GAMES ? stats.classicGamesWon :
              stats.gamesWon,
    winRate: stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed) * 100 : 0,
    variant: type === LeaderboardType.QUICK_GAMES ? GameVariant.QUICK :
             type === LeaderboardType.CLASSIC_GAMES ? GameVariant.CLASSIC :
             undefined
  }));
};

export const updateLeaderboards = async (): Promise<void> => {
  const leaderboardRepository = AppDataSource.getRepository(Leaderboards);
  const userRepository = AppDataSource.getRepository(User);
  const now = new Date();
  
  // Clear old entries
  await leaderboardRepository.clear();

  // Update different types of leaderboards
  const types = [
    LeaderboardType.OVERALL,
    LeaderboardType.QUICK_GAMES,
    LeaderboardType.CLASSIC_GAMES,
    LeaderboardType.TOURNAMENTS,
    LeaderboardType.WEEKLY,
    LeaderboardType.MONTHLY
  ];

  for (const type of types) {
    const entries = await getLeaderboard(type, 100);
    
    for (const entry of entries) {
      const user = await userRepository.findOne({ where: { id: entry.userId } });
      if (user) {
        const leaderboardEntry = leaderboardRepository.create({
          type,
          user,
          ranking: entry.rank,
          periodStart: now,
          periodEnd: now
        });
        
        await leaderboardRepository.save(leaderboardEntry);
      }
    }
  }
};

export const getUserRank = async (
  userId: string,
  type: LeaderboardType = LeaderboardType.OVERALL
): Promise<{ rank: number; totalPlayers: number } | null> => {
  const userStatsRepository = AppDataSource.getRepository(UserStats);
  
  let query = userStatsRepository.createQueryBuilder('stats')
    .leftJoinAndSelect('stats.user', 'user');

  // Apply the same ordering as getLeaderboard
  switch (type) {
    case LeaderboardType.QUICK_GAMES:
      query = query.orderBy('stats.quickGamesWon', 'DESC')
        .addOrderBy('stats.quickGamesPlayed', 'DESC');
      break;
    case LeaderboardType.CLASSIC_GAMES:
      query = query.orderBy('stats.classicGamesWon', 'DESC')
        .addOrderBy('stats.classicGamesPlayed', 'DESC');
      break;
    case LeaderboardType.TOURNAMENTS:
      query = query.orderBy('stats.rankingPoints', 'DESC');
      break;
    default:
      query = query.orderBy('stats.gamesWon', 'DESC')
        .addOrderBy('stats.gamesPlayed', 'DESC');
  }

  const allResults = await query.getMany();
  const userIndex = allResults.findIndex(stats => stats.userId === userId);
  
  if (userIndex === -1) {
    return null;
  }

  return {
    rank: userIndex + 1,
    totalPlayers: allResults.length
  };
};