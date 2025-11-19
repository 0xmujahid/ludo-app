import { Request, Response } from 'express';
import * as leaderboardService from '../services/leaderboardService';
import { LeaderboardType } from '../services/leaderboardService';

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type = LeaderboardType.OVERALL, limit = 100 } = req.query;
    
    // Validate type
    if (!Object.values(LeaderboardType).includes(type as LeaderboardType)) {
      res.status(400).json({ message: 'Invalid leaderboard type' });
      return;
    }

    // Validate limit
    const parsedLimit = parseInt(limit as string);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
      res.status(400).json({ message: 'Invalid limit. Must be between 1 and 1000' });
      return;
    }

    const leaderboard = await leaderboardService.getLeaderboard(
      type as LeaderboardType,
      parsedLimit
    );
    res.json(leaderboard);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
};

export const updateLeaderboards = async (req: Request, res: Response): Promise<void> => {
  try {
    await leaderboardService.updateLeaderboards();
    res.json({ message: 'Leaderboards updated successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
};
