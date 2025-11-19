import { TransactionStatus } from "../types/payment";
import * as paymentService from "./paymentService";
import {
  WebhookEventType,
  WebhookPayload,
  PaymentWebhookPayload,
  GameStateWebhookPayload,
  TournamentWebhookPayload,
} from "../types/payment";
import axios from "axios";
import * as crypto from "crypto";

interface WebhookEndpoint {
  url: string;
  secret: string;
  events: WebhookEventType[];
  retryCount: number;
  lastAttempt?: Date;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds
const webhookEndpoints: WebhookEndpoint[] = [];

export const registerWebhookEndpoint = (endpoint: WebhookEndpoint) => {
  webhookEndpoints.push(endpoint);
};

export const handlePaymentWebhook = async (payload: PaymentWebhookPayload) => {
  try {
    // Validate required fields
    if (!payload.orderId) {
      throw new Error("Missing required field: orderId");
    }

    // Normalize status to handle different gateway formats
    const normalizedStatus = normalizePaymentStatus(payload.status);

    // Get existing transaction before update
    const existingTransaction = await paymentService.getTransaction(
      payload.orderId,
    );
    if (!existingTransaction) {
      throw new Error(`Transaction not found: ${payload.orderId}`);
    }

    // Prevent duplicate webhook processing
    if (existingTransaction.status === TransactionStatus.COMPLETED) {
      return {
        success: true,
        transaction: existingTransaction,
        message: "Transaction already completed",
        code: "ALREADY_PROCESSED",
      };
    }

    // Update transaction status and process wallet update
    const updatedTransaction = await paymentService.updatePaymentStatus(
      payload.orderId,
      normalizedStatus,
      payload.transactionId,
      {
        ...payload.gatewayResponse,
        code: payload.gatewayResponse?.code || normalizedStatus,
        message:
          payload.gatewayResponse?.message ||
          `Payment status updated to ${normalizedStatus}`,
        timestamp: new Date().toISOString(),
      },
    );

    // Log webhook processing
    console.log("Webhook processed:", {
      orderId: payload.orderId,
      oldStatus: existingTransaction.status,
      newStatus: normalizedStatus,
      transactionId: payload.transactionId,
    });

    return {
      success: true,
      transaction: updatedTransaction,
      message: `Payment status updated to ${normalizedStatus}`,
      code: "PROCESSED",
    };
  } catch (error) {
    console.error("Webhook processing error:", error);
    throw new Error(
      `Failed to process payment webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const handleGameStateWebhook = async (
  gameId: string,
  eventData: any,
) => {
  const payload: GameStateWebhookPayload = {
    eventType: WebhookEventType.GAME_STATE,
    gameId,
    data: eventData,
    status: "game_update",
  };

  await deliverWebhooksWithRetry(payload);
};

export const handleTournamentWebhook = async (
  tournamentId: string,
  eventData: any,
) => {
  const payload: TournamentWebhookPayload = {
    eventType: WebhookEventType.TOURNAMENT_UPDATE,
    tournamentId,
    data: eventData,
    status: "tournament_update",
  };

  await deliverWebhooksWithRetry(payload);
};

const deliverWebhooksWithRetry = async (payload: WebhookPayload) => {
  const relevantEndpoints = webhookEndpoints.filter((endpoint) =>
    endpoint.events.includes(payload.eventType),
  );

  for (const endpoint of relevantEndpoints) {
    let retryCount = 0;
    let success = false;

    while (!success && retryCount < MAX_RETRIES) {
      try {
        const signature = generateSignature(payload, endpoint.secret);
        await axios.post(endpoint.url, payload, {
          headers: {
            "X-Webhook-Signature": signature,
            "Content-Type": "application/json",
          },
          timeout: 5000,
        });
        success = true;
      } catch (error) {
        retryCount++;
        console.error(
          `Webhook delivery failed (attempt ${retryCount}):`,
          error,
        );

        if (retryCount < MAX_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY_MS * retryCount),
          );
        }
      }
    }

    endpoint.lastAttempt = new Date();
    endpoint.retryCount = retryCount;
  }
};

const generateSignature = (payload: any, secret: string): string => {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest("hex");
};

export const validateWebhookSignature = (
  payload: any,
  signature: string,
  secret: string,
): boolean => {
  try {
    // Convert payload to string if it's an object
    const payloadString =
      typeof payload === "string" ? payload : JSON.stringify(payload);

    // Create HMAC using the secret
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payloadString);
    const calculatedSignature = hmac.digest("hex");

    // Constant-time string comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(signature),
    );
  } catch (error) {
    console.error("Webhook signature validation error:", error);
    return false;
  }
};

const normalizePaymentStatus = (status: string): TransactionStatus => {
  const statusMap: Record<string, TransactionStatus> = {
    success: TransactionStatus.COMPLETED,
    completed: TransactionStatus.COMPLETED,
    captured: TransactionStatus.COMPLETED,
    authorized: TransactionStatus.COMPLETED,
    failed: TransactionStatus.FAILED,
    failure: TransactionStatus.FAILED,
    error: TransactionStatus.FAILED,
    declined: TransactionStatus.FAILED,
    pending: TransactionStatus.PENDING,
    processing: TransactionStatus.PENDING,
    initiated: TransactionStatus.PENDING,
  };

  return statusMap[status.toLowerCase()] || TransactionStatus.FAILED;
};
