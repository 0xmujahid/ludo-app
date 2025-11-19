import { Router, RequestHandler } from 'express';
import * as adminPaymentController from '../controllers/adminPaymentController';
import { authenticate } from '../middlewares/authMiddleware';
import { isAdmin } from '../middlewares/roleMiddleware';
import { validateTransactionId } from '../middlewares/validationMiddleware';

const router = Router();

// Apply authentication and admin role check to all routes
router.use(authenticate as RequestHandler, isAdmin as RequestHandler);

// Transaction listing and analytics
router.get('/transactions', adminPaymentController.getTransactions as RequestHandler);

router.get('/stats', adminPaymentController.getPaymentStats as RequestHandler);

// Transaction details and management
router.get(
  '/transactions/:transactionId',
  validateTransactionId as RequestHandler,
  adminPaymentController.getTransactionDetails as RequestHandler
);

// Manual payment approval/rejection
router.post(
  '/transactions/:transactionId/approve',
  validateTransactionId as RequestHandler,
  adminPaymentController.approvePayment as RequestHandler
);

router.post(
  '/transactions/:transactionId/reject',
  validateTransactionId as RequestHandler,
  adminPaymentController.rejectPayment as RequestHandler
);

// Bulk operations
router.post(
  '/transactions/bulk/approve',
  adminPaymentController.bulkApprovePayments as RequestHandler
);

// Payment gateway configuration management
router.get(
  '/gateway/config',
  adminPaymentController.getPaymentGatewayConfig as RequestHandler
);

router.put(
  '/gateway/config',
  adminPaymentController.updatePaymentGatewayConfig as RequestHandler
);

// Payment method configuration
router.get(
  '/payment-methods',
  adminPaymentController.getPaymentMethodConfigs as RequestHandler
);

router.put(
  '/payment-methods/:method/status',
  adminPaymentController.updatePaymentMethodStatus as RequestHandler
);

router.put(
  '/payment-methods/:method/schedule',
  adminPaymentController.updatePaymentMethodSchedule as RequestHandler
);

// Health check for admin payment system
router.get('/health', ((_, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}) as RequestHandler);

export default router;
