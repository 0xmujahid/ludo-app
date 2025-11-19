import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/common";
import { cryptoPaymentService } from "../services/cryptoPaymentService";
import { nowPaymentsService } from "../services/nowPaymentsService";
import { logger } from "../utils/logger";

class CryptoPaymentController {
  public async getSupportedCurrencies(_req: Request, res: Response): Promise<void> {
    try {
      const currencies = await cryptoPaymentService.getSupportedCurrencies();
      res.status(200).json({ success: true, data: currencies });
    } catch (error) {
      logger.error("Failed to fetch supported crypto currencies", {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ success: false, message: "Failed to fetch supported currencies" });
    }
  }

  public async getMinimumAmount(req: Request, res: Response): Promise<void> {
    try {
      const { currency } = req.params;
      if (!currency) {
        res.status(400).json({ success: false, message: "Currency parameter is required" });
        return;
      }

      const normalizedCurrency = currency.toUpperCase();

      if (normalizedCurrency === "USD") {
        const minDeposit = Number(process.env.CRYPTO_DEPOSIT_MIN_USD || 5);
        res.status(200).json({ success: true, data: { currency: normalizedCurrency, minAmount: minDeposit } });
        return;
      }

      const minAmount = await nowPaymentsService.getMinimumPaymentAmount(normalizedCurrency.toLowerCase());
      res.status(200).json({ success: true, data: { currency: normalizedCurrency, minAmount } });
    } catch (error) {
      logger.error("Failed to fetch minimum payment amount", {
        currency: req.params?.currency,
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ success: false, message: "Failed to fetch minimum payment amount" });
    }
  }

  public async getEstimatedPrice(req: Request, res: Response): Promise<void> {
    try {
      const { usdAmount, cryptoCurrency } = req.body ?? {};

      if (!usdAmount || !cryptoCurrency) {
        res.status(400).json({ success: false, message: "usdAmount and cryptoCurrency are required" });
        return;
      }

      const normalizedCurrency = String(cryptoCurrency);
      const normalizedUsdAmount = Number(usdAmount);

      if (!Number.isFinite(normalizedUsdAmount) || normalizedUsdAmount <= 0) {
        res.status(400).json({ success: false, message: "usdAmount must be a positive number" });
        return;
      }

      const estimation = await cryptoPaymentService.calculateTokens(
        normalizedCurrency,
        normalizedUsdAmount
      );

      res.status(200).json({
        success: true,
        data: {
          usdAmount: normalizedUsdAmount,
          cryptoCurrency: normalizedCurrency.toUpperCase(),
          cryptoAmount: estimation.cryptoAmount,
          gameTokens: estimation.tokens,
          conversionRate: estimation.rate,
        },
      });
    } catch (error) {
      logger.error("Failed to estimate crypto price", {
        body: req.body,
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ success: false, message: "Failed to estimate price" });
    }
  }

  public async createDeposit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { cryptoCurrency, usdAmount } = req.body ?? {};

      if (!cryptoCurrency || !usdAmount) {
        res.status(400).json({ success: false, message: "cryptoCurrency and usdAmount are required" });
        return;
      }

      const normalizedUsdAmount = Number(usdAmount);
      if (!Number.isFinite(normalizedUsdAmount) || normalizedUsdAmount <= 0) {
        res.status(400).json({ success: false, message: "usdAmount must be a positive number" });
        return;
      }

      const transaction = await cryptoPaymentService.createDeposit({
        userId,
        cryptoCurrency: String(cryptoCurrency),
        usdAmount: normalizedUsdAmount,
      });

      res.status(201).json({
        success: true,
        message: "Deposit created",
        data: {
          paymentId: transaction.paymentId,
          orderId: transaction.orderId,
          payAddress: transaction.payAddress,
          payAmount: transaction.payAmount,
          cryptoCurrency: transaction.cryptoCurrency,
          gameTokens: transaction.gameTokens,
          status: transaction.status,
          expiresAt: transaction.expiresAt,
          paymentExtraId: transaction.paymentExtraId,
        },
      });
    } catch (error) {
      logger.error("Failed to create crypto deposit", {
        userId: req.user?.id,
        body: req.body,
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ success: false, message: "Failed to create deposit" });
    }
  }

  public async getTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const transactions = await cryptoPaymentService.getUserTransactions(userId);
      const sanitized = transactions.map((tx) => ({
        id: tx.id,
        paymentId: tx.paymentId,
        orderId: tx.orderId,
        cryptoCurrency: tx.cryptoCurrency,
        cryptoAmount: tx.cryptoAmount,
        usdAmount: tx.usdAmount,
        gameTokens: tx.gameTokens,
        status: tx.status,
        paymentStatus: tx.paymentStatus,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
        confirmedAt: tx.confirmedAt,
      }));

      res.status(200).json({ success: true, data: sanitized });
    } catch (error) {
      logger.error("Failed to fetch user crypto transactions", {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ success: false, message: "Failed to fetch transactions" });
    }
  }

  public async getTransactionStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { paymentId } = req.params;
      if (!paymentId) {
        res.status(400).json({ success: false, message: "paymentId parameter is required" });
        return;
      }

      const transaction = await cryptoPaymentService.checkPaymentStatus(paymentId);

      if (transaction.userId !== userId) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: transaction.id,
          paymentId: transaction.paymentId,
          orderId: transaction.orderId,
          cryptoCurrency: transaction.cryptoCurrency,
          cryptoAmount: transaction.cryptoAmount,
          usdAmount: transaction.usdAmount,
          gameTokens: transaction.gameTokens,
          status: transaction.status,
          paymentStatus: transaction.paymentStatus,
          payAddress: transaction.payAddress,
          payAmount: transaction.payAmount,
          actuallyPaid: transaction.actuallyPaid,
          outcomeAmount: transaction.outcomeAmount,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
          confirmedAt: transaction.confirmedAt,
        },
      });
    } catch (error) {
      logger.error("Failed to get crypto transaction status", {
        userId: req.user?.id,
        params: req.params,
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ success: false, message: "Failed to fetch transaction status" });
    }
  }

  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signatureHeader = req.headers["x-nowpayments-sig"];
      if (!signatureHeader || typeof signatureHeader !== "string") {
        res.status(400).json({ success: false, message: "Missing NOWPayments signature" });
        return;
      }

      const payload = req.body;
      logger.info("Received NOWPayments webhook", { paymentId: payload?.payment_id, status: payload?.payment_status });

      await cryptoPaymentService.processWebhook(payload, signatureHeader);

      res.status(200).json({ success: true, message: "Webhook processed" });
    } catch (error) {
      logger.error("Failed to process NOWPayments webhook", {
        error: error instanceof Error ? error.message : error,
        body: req.body,
      });
      res.status(500).json({ success: false, message: "Failed to process webhook" });
    }
  }
}

export const cryptoPaymentController = new CryptoPaymentController();
