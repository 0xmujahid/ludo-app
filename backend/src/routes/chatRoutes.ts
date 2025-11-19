import { Router, RequestHandler } from 'express';
import * as chatController from '../controllers/chatController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.post('/send', authenticate as RequestHandler, chatController.sendMessage as RequestHandler);
router.get('/:gameId', authenticate as RequestHandler, chatController.getGameMessages as RequestHandler);

export default router;
