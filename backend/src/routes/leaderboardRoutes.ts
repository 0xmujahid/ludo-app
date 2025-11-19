import { Router } from 'express';
import * as leaderboardController from '../controllers/leaderboardController';
import { authenticate, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Get leaderboard entries
router.get('/', authenticate as any, leaderboardController.getLeaderboard);

// Update leaderboards (admin only)
router.post('/update', authenticate as any, isAdmin as any, leaderboardController.updateLeaderboards);

export default router;
