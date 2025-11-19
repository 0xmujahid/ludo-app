import { Router } from "express";
import * as walletController from "../controllers/walletController";
import { authenticate, isAdmin } from "../middlewares/authMiddleware";
import { RequestHandler } from "express";

const router = Router();

// User endpoints
router.get(
  "/balance",
  authenticate as RequestHandler,
  walletController.getBalance
);
router.post("/add", authenticate as RequestHandler, walletController.addFunds);
router.post(
  "/withdraw",
  authenticate as RequestHandler,
  walletController.withdrawFunds
);
router.get(
  "/transactions",
  authenticate as RequestHandler,
  walletController.getTransactionHistory
);
router.post(
  "/transfer-winnings",
  authenticate as RequestHandler,
  walletController.transferWinnings
);

// New user endpoint for updating withdrawal UPI
router.post(
  "/update-withdrawal-upi",
  authenticate as RequestHandler,
  walletController.updateWithdrawalUpi
);

// Admin endpoints
router.post(
  "/manual-payment/process",
  authenticate as RequestHandler,
  isAdmin as RequestHandler,
  walletController.processManualPayment
);

export default router;
