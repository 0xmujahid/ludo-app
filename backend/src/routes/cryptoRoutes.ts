import { Router } from "express";
import { cryptoPaymentController } from "../controllers/cryptoPaymentController";
import { authenticate as authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

// Public routes
router.get("/currencies", (req, res) => cryptoPaymentController.getSupportedCurrencies(req, res));
router.get("/minimum/:currency", (req, res) => cryptoPaymentController.getMinimumAmount(req, res));
router.post("/webhook", (req, res) => cryptoPaymentController.handleWebhook(req, res));

// Protected routes
router.post("/estimate", authenticateToken, (req, res) => cryptoPaymentController.getEstimatedPrice(req, res));
router.post("/deposit", authenticateToken, (req, res) => cryptoPaymentController.createDeposit(req, res));
router.get("/transactions", authenticateToken, (req, res) => cryptoPaymentController.getTransactions(req, res));
router.get("/transaction/:paymentId", authenticateToken, (req, res) => cryptoPaymentController.getTransactionStatus(req, res));

export default router;
