// @ts-nocheck
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/common";
import * as paytmService from "../services/paytmService";
import * as paymentService from "../services/paymentService";
import {
  PaymentMethod,
  TransactionStatus,
  WebhookRequest,
  WebhookEventType,
  PaytmResponse,
} from "../types/payment";
import * as walletService from "../services/walletService";
import * as webhookService from "../services/webhookService";

export const initiatePaytmPayment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { amount } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ message: "Valid amount is required" });
      return;
    }

    // First create a transaction record
    const transaction = await walletService.addFunds(
      userId,
      amount,
      PaymentMethod.PAYTM
    );

    // Initialize payment using payment gateway service
    const paymentData = await paytmService.initiatePaytmPayment({
      action: "INITIATE",
      params: {
        ORDER_ID: transaction.id,
        CUST_ID: userId,
        TXN_AMOUNT: amount.toString(),
        MID: process.env.PAYTM_MID || "",
        WEBSITE: process.env.PAYTM_WEBSITE || "",
        CHANNEL_ID: "WEB",
        INDUSTRY_TYPE_ID: process.env.PAYTM_INDUSTRY_TYPE || "",
        CALLBACK_URL: `${process.env.API_BASE_URL}/payment/callback`,
        EMAIL: req.user?.email || "",
        MOBILE_NO: req.user?.phoneNumber || "",
        CHECKSUMHASH: "",
      },
      environment:
        process.env.PAYTM_ENVIRONMENT === "production" ? "production" : "test",
    });

    if (paymentData.error) {
      throw new Error(paymentData.message || "Payment initiation failed");
    }

    // For test environment, simulate success response
    if (process.env.PAYTM_ENVIRONMENT === "test") {
      res.json({
        success: true,
        message: "Payment initiated successfully (Test Mode)",
        orderId: transaction.id,
        amount,
        currency: "INR",
        redirectUrl: "/payment/success?test=true",
      });
      return;
    }

    // For production, return payment gateway response
    res.json({
      success: true,
      message: "Payment initiated successfully",
      ...paymentData,
      amount,
      currency: "INR",
      formData: paymentData.gatewayResponse?.params,
      redirectUrl: paymentData.gatewayResponse?.url,
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(400).json({
      success: false,
      message: errorMessage,
    });
  }
};

export const handlePaytmCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Verify payment using payment gateway service
    const result = await paytmService.verifyPayment(
      req.body.ORDERID,
      req.body as unknown as PaytmResponse
    );

    if (!result.orderId) {
      throw new Error("Order ID is required");
    }

    // Update transaction status
    await paymentService.updatePaymentStatus(
      result.orderId,
      result.status || TransactionStatus.FAILED, // Default to FAILED if status is undefined
      result.transactionId || "",
      {
        code: result.code,
        message: result.message,
        gatewayTransactionId: result.gatewayTransactionId,
        paymentMode: result.paymentMode,
        bankName: result.bankName,
        timestamp: new Date().toISOString(),
      }
    );

    // If payment is completed, update wallet balance
    if (result.status === TransactionStatus.COMPLETED) {
      const transaction = await paymentService.getTransaction(result.orderId);
      if (transaction && transaction.wallet) {
        await walletService.updateWalletBalance(
          transaction.wallet.user.id,
          transaction.amount,
          "credit",
          `Paytm payment completed - TXN: ${result.transactionId}`
        );
      }
    }

    // Prepare redirect URL with comprehensive status
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const redirectParams = new URLSearchParams();
    if (result.orderId) redirectParams.set("orderId", result.orderId);
    if (result.status) redirectParams.set("status", result.status);
    redirectParams.set("txnId", result.transactionId || "");
    redirectParams.set("message", result.message || "");
    redirectParams.set("code", result.code || "");
    redirectParams.set("bankName", result.bankName || "");
    redirectParams.set("paymentMode", result.paymentMode || "");

    // Redirect based on payment status
    switch (result.status) {
      case TransactionStatus.COMPLETED:
        res.redirect(`${baseUrl}/payment/success?${redirectParams.toString()}`);
        break;
      case TransactionStatus.PENDING:
        res.redirect(`${baseUrl}/payment/pending?${redirectParams.toString()}`);
        break;
      case TransactionStatus.FAILED:
        res.redirect(`${baseUrl}/payment/failure?${redirectParams.toString()}`);
        break;
      default:
        res.redirect(`${baseUrl}/payment/error?${redirectParams.toString()}`);
    }
  } catch (error) {
    console.error("Payment callback error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    // Update transaction as failed
    if (req.body.ORDERID) {
      try {
        await paymentService.updatePaymentStatus(
          req.body.ORDERID,
          TransactionStatus.FAILED,
          req.body.TXNID || "",
          {
            code: "ERROR",
            message: errorMessage,
            timestamp: new Date().toISOString(),
          }
        );
      } catch (updateError) {
        console.error("Failed to update transaction status:", updateError);
      }
    }

    const redirectParams = new URLSearchParams({
      error: errorMessage,
      orderId: req.body.ORDERID || "unknown",
      status: TransactionStatus.FAILED,
    });
    res.redirect(
      `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/payment/error?${redirectParams.toString()}`
    );
  }
};

export const handleWebhook = async (
  req: Request & WebhookRequest,
  res: Response
): Promise<void> => {
  try {
    const { provider } = req.params;

    // Validate provider parameter
    if (!provider) {
      res.status(400).json({ message: "Missing provider in the URL" });
      return;
    }

    const signature = req.headers["x-webhook-signature"];
    const webhookSecret =
      process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];

    // Validate webhook signature if available
    if (signature && webhookSecret) {
      const isValid = webhookService.validateWebhookSignature(
        req.body,
        signature as string,
        webhookSecret
      );

      if (!isValid) {
        res.status(401).json({ message: "Invalid webhook signature" });
        return;
      }
    } else if (!signature && provider.toLowerCase() !== "paytm") {
      res.status(400).json({ message: "Webhook signature is missing" });
      return;
    }

    // Process the webhook payload
    const result = await webhookService.handlePaymentWebhook({
      eventType: WebhookEventType.PAYMENT,
      orderId: req.body.orderId || req.body.ORDERID,
      transactionId: req.body.transactionId || req.body.TXNID,
      status: req.body.status || req.body.STATUS,
      paymentMethod: provider as PaymentMethod,
      gatewayResponse: {
        code: req.body.code || req.body.RESPCODE,
        message: req.body.message || req.body.RESPMSG,
        transactionId: req.body.transactionId || req.body.TXNID,
        gatewayTransactionId:
          req.body.gatewayTransactionId || req.body.BANKTXNID,
        timestamp: req.body.timestamp || req.body.TXNDATE,
      },
    });

    // Return the processed result
    res.json(result);
  } catch (error) {
    console.error("Webhook handling error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process webhook";
    res.status(500).json({ message: errorMessage });
  }
};

export const getTransactionStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { transactionId } = req.params;
    const transaction = await paymentService.getTransaction(transactionId);

    if (!transaction) {
      res.status(404).json({ message: "Transaction not found" });
      return;
    }

    res.json({
      success: true,
      transaction: {
        transactionId: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        createdAt: transaction.createdAt,
        completedAt: transaction.completedAt,
        paymentMethod: transaction.paymentMethod,
        metadata: transaction.metadata,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(400).json({ message: errorMessage });
  }
};

export const getTransactionHistory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const transactions = await paymentService.getTransactionHistory(userId);
    res.json({
      success: true,
      transactions: transactions.map((tx) => ({
        transactionId: tx.id,
        amount: tx.amount,
        status: tx.status,
        paymentMethod: tx.paymentMethod,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
        metadata: tx.metadata,
        lastUpdated: tx.lastUpdated,
      })),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(400).json({ message: errorMessage });
  }
};

export const getTransactionHistoryFilter = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { status } = req.params;
    const transactions = await paymentService.getTransactionHistory(userId);
    res.json({
      success: true,
      transactions: transactions
        .filter((filterStatus) => filterStatus.status === status)
        .map((tx) => ({
          transactionId: tx.id,
          amount: tx.amount,
          status: tx.status,
          paymentMethod: tx.paymentMethod,
          createdAt: tx.createdAt,
          completedAt: tx.completedAt,
          metadata: tx.metadata,
          lastUpdated: tx.lastUpdated,
        })),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(400).json({ message: errorMessage });
  }
};
