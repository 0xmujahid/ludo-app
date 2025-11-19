import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticate } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();
const authController = new AuthController();

// Registration moved to auth routes
router.get('/profile', authenticate as RequestHandler, userController.getProfile as RequestHandler);
router.put('/profile', authenticate as RequestHandler, userController.updateProfile as RequestHandler);

// KYC routes
router.post('/kyc', authenticate as RequestHandler, authController.submitKYC.bind(authController) as RequestHandler);

export default router;
