// @ts-nocheck
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/common";
import * as adminPaymentService from "../services/adminPaymentService";
import { TransactionStatus, PaymentMethod } from "../types/payment";

export const getTransactions = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as "ASC" | "DESC") || "DESC";

    const filters = {
      status: req.query.status as TransactionStatus,
      paymentMethod: req.query.paymentMethod as PaymentMethod,
      startDate: req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined,
      endDate: req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined,
      minAmount: req.query.minAmount
        ? parseFloat(req.query.minAmount as string)
        : undefined,
      maxAmount: req.query.maxAmount
        ? parseFloat(req.query.maxAmount as string)
        : undefined,
      userId: req.query.userId as string,
      searchTerm: req.query.search as string,
    };

    const result = await adminPaymentService.getTransactionsForAdmin(
      page,
      limit,
      filters,
      sortBy,
      sortOrder,
    );

    res.json({
      success: true,
      ...result,
      filters: {
        ...filters,
        page,
        limit,
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch transactions";
    res.status(500).json({ success: false, message: errorMessage });
  }
};

export const getTransactionDetails = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { transactionId } = req.params;
    const transaction =
      await adminPaymentService.getTransactionDetailsForAdmin(transactionId);

    if (!transaction) {
      res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
      return;
    }

    res.json({
      success: true,
      transaction,
      auditLogs: transaction.auditLogs || [],
    });
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch transaction details";
    res.status(404).json({ success: false, message: errorMessage });
  }
};

export const approvePayment = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { transactionId } = req.params;
    const { remarks = "true", notifyUser = true } = req.body;
    const adminUserId = req.user?.id;

    if (!adminUserId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!remarks) {
      res
        .status(400)
        .json({ success: false, message: "Approval remarks are required" });
      return;
    }

    const transaction = await adminPaymentService.approveManualPayment(
      transactionId,
      adminUserId,
      remarks,
      notifyUser,
    );

    res.json({
      success: true,
      message: "Payment approved successfully",
      transaction,
      notificationSent: notifyUser,
    });
  } catch (error) {
    console.error("Error approving payment:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to approve payment";
    res.status(400).json({ success: false, message: errorMessage });
  }
};

export const rejectPayment = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { transactionId } = req.params;
    const { reason, notifyUser = true } = req.body;
    const adminUserId = req.user?.id;

    if (!adminUserId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!reason) {
      res
        .status(400)
        .json({ success: false, message: "Rejection reason is required" });
      return;
    }

    const transaction = await adminPaymentService.rejectManualPayment(
      transactionId,
      adminUserId,
      reason,
      notifyUser,
    );

    res.json({
      success: true,
      message: "Payment rejected successfully",
      transaction,
      notificationSent: notifyUser,
    });
  } catch (error) {
    console.error("Error rejecting payment:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to reject payment";
    res.status(400).json({ success: false, message: errorMessage });
  }
};

export const getPaymentStats = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await adminPaymentService.getPaymentStats(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
    );

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch payment statistics";
    res.status(500).json({ success: false, message: errorMessage });
  }
};

export const getPaymentGatewayConfig = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const config = await adminPaymentService.getPaymentGatewayConfig();
    res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("Error fetching payment gateway config:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch payment gateway configuration";
    res.status(500).json({ success: false, message: errorMessage });
  }
};

export const updatePaymentGatewayConfig = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { environment, merchantId, merchantKey, webhookSecret } = req.body;

    if (!environment || !merchantId || !merchantKey) {
      res.status(400).json({
        success: false,
        message: "Required configuration fields are missing",
      });
      return;
    }

    const config = await adminPaymentService.updatePaymentGatewayConfig({
      environment,
      merchantId,
      merchantKey,
      webhookSecret,
    });

    res.json({
      success: true,
      message: "Payment gateway configuration updated successfully",
      config,
    });
  } catch (error) {
    console.error("Error updating payment gateway config:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update payment gateway configuration";
    res.status(400).json({ success: false, message: errorMessage });
  }
};

export const bulkApprovePayments = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { transactionIds, remarks, notifyUsers = true } = req.body;
    const adminUserId = req.user?.id;

    if (!adminUserId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      res
        .status(400)
        .json({ success: false, message: "No transaction IDs provided" });
      return;
    }

    if (!remarks) {
      res
        .status(400)
        .json({ success: false, message: "Approval remarks are required" });
      return;
    }

    const results = await adminPaymentService.bulkApprovePayments(
      transactionIds,
      adminUserId,
      remarks,
    );

    res.json({
      success: true,
      message: "Bulk approval processed successfully",
      results,
    });
  } catch (error) {
    console.error("Error in bulk approval:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to process bulk approval";
    res.status(400).json({ success: false, message: errorMessage });
  }
};

// Payment Method Configuration Management
export const getPaymentMethodConfigs = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const configs = await adminPaymentService.getPaymentMethodConfigs();

    res.json({
      success: true,
      configs,
    });
  } catch (error) {
    console.error("Error fetching payment method configs:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch payment method configurations";
    res.status(500).json({ success: false, message: errorMessage });
  }
};

export const updatePaymentMethodStatus = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { paymentMethod, isEnabled, reason } = req.body;
    const adminUserId = req.user?.id;

    if (!adminUserId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!paymentMethod) {
      res
        .status(400)
        .json({ success: false, message: "Payment method is required" });
      return;
    }

    if (typeof isEnabled !== "boolean") {
      res
        .status(400)
        .json({ success: false, message: "isEnabled must be a boolean value" });
      return;
    }

    if (!isEnabled && !reason) {
      res
        .status(400)
        .json({
          success: false,
          message: "Reason is required when disabling a payment method",
        });
      return;
    }

    const config = await adminPaymentService.updatePaymentMethodStatus(
      paymentMethod,
      isEnabled,
      adminUserId,
      reason,
    );

    res.json({
      success: true,
      message: `Payment method ${paymentMethod} has been ${isEnabled ? "enabled" : "disabled"}`,
      config,
    });
  } catch (error) {
    console.error("Error updating payment method status:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update payment method status";
    res.status(400).json({ success: false, message: errorMessage });
  }
};

export const updatePaymentMethodSchedule = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { paymentMethod, enabledFrom, enabledUntil } = req.body;
    const adminUserId = req.user?.id;

    if (!adminUserId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!paymentMethod) {
      res
        .status(400)
        .json({ success: false, message: "Payment method is required" });
      return;
    }

    // Validate dates if provided
    let parsedEnabledFrom: Date | undefined;
    let parsedEnabledUntil: Date | undefined;

    if (enabledFrom) {
      parsedEnabledFrom = new Date(enabledFrom);
      if (isNaN(parsedEnabledFrom.getTime())) {
        res
          .status(400)
          .json({ success: false, message: "Invalid enabledFrom date format" });
        return;
      }
    }

    if (enabledUntil) {
      parsedEnabledUntil = new Date(enabledUntil);
      if (isNaN(parsedEnabledUntil.getTime())) {
        res
          .status(400)
          .json({
            success: false,
            message: "Invalid enabledUntil date format",
          });
        return;
      }
    }

    // Check if end date is after start date
    if (
      parsedEnabledFrom &&
      parsedEnabledUntil &&
      parsedEnabledFrom >= parsedEnabledUntil
    ) {
      res
        .status(400)
        .json({ success: false, message: "End date must be after start date" });
      return;
    }

    const config = await adminPaymentService.updatePaymentMethodSchedule(
      paymentMethod,
      {
        enabledFrom: parsedEnabledFrom,
        enabledUntil: parsedEnabledUntil,
      },
      adminUserId,
    );

    res.json({
      success: true,
      message: "Payment method schedule updated successfully",
      config,
    });
  } catch (error) {
    console.error("Error updating payment method schedule:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update payment method schedule";
    res.status(400).json({ success: false, message: errorMessage });
  }
};
