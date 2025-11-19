import { Router } from 'express';
import * as gameRoomController from '../controllers/gameRoomController';
import { authenticate } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = Router();

// Room creation and management routes
router.post('/create', authenticate as RequestHandler, gameRoomController.createRoom as RequestHandler);
router.post('/:roomCode/join', authenticate as RequestHandler, gameRoomController.joinRoom as RequestHandler);
router.get('/active', authenticate as RequestHandler, gameRoomController.getActiveRooms as RequestHandler);
router.post('/cleanup', authenticate as RequestHandler, gameRoomController.cleanupInactiveRooms as RequestHandler);

export default router;