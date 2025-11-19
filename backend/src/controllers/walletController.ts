// @ts-nocheck
import { Response } from "express";
import * as walletService from "../services/walletService";
import { AuthenticatedRequest } from "../types/common";
import { PaymentMethod } from "../types/payment";

export const getBalance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const wallet = await walletService.getBalance(userId);
    res.json({
      balance: wallet.balance,
      winningAmount: wallet.winningAmount,
      withdrawalUpi: wallet.withdrawalUpi,
      totalBalance: wallet.totalBalance,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(404).json({ message: errorMessage });
  }
};

export const addFunds = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { amount, paymentMethod, utrNumber } = req.body;

    if (!amount || !paymentMethod) {
      res
        .status(400)
        .json({ message: "Amount and payment method are required" });
      return;
    }

    if (paymentMethod === PaymentMethod.MANUAL && !utrNumber) {
      res
        .status(400)
        .json({ message: "UTR number is required for manual UPI payments" });
      return;
    }

    const transaction = await walletService.addFunds(
      userId,
      amount,
      paymentMethod,
      {
        utrNumber,
        orderId: `ORDER_${Date.now()}`,
      }
    );

    res.json({
      message:
        paymentMethod === PaymentMethod.MANUAL
          ? "Payment request submitted for approval"
          : "Payment initiated",
      transaction,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(400).json({ message: errorMessage });
  }
};

export const withdrawFunds = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ message: "Valid amount is required" });
      return;
    }

    if (!paymentMethod) {
      res.status(400).json({ message: "Payment method is required" });
      return;
    }

    const result = await walletService.withdrawFunds(userId, amount, paymentMethod);
    res.json({ 
      message: paymentMethod === PaymentMethod.MANUAL 
        ? "Withdrawal request submitted for admin approval" 
        : "Withdrawal processed successfully",
      transaction: result.transaction,
      balance: result.balance 
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(400).json({ message: errorMessage });
  }
};

export const transferWinnings = async (
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

    const newBalance = await walletService.transferWinningsToBalance(
      userId,
      amount
    );
    res.json({ balance: newBalance });
  } catch (error: unknown) {
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
    const transactions = await walletService.getTransactionHistory(userId);
    res.json({ transactions });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(500).json({ message: errorMessage });
  }
};

export const updateWithdrawalUpi = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { upiId } = req.body;

    if (!upiId) {
      res.status(400).json({ message: "UPI ID is required" });
      return;
    }

    await walletService.updateWithdrawalUpi(userId, upiId);
    res.json({ message: "UPI ID updated successfully" });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(500).json({ message: errorMessage });
  }
};

export const processManualPayment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { transactionId, approved } = req.body;

    if (!transactionId || typeof approved !== 'boolean') {
      res.status(400).json({ message: "Transaction ID and approval status are required" });
      return;
    }

    const result = await walletService.processManualPayment(transactionId, approved);
    res.json({ 
      message: approved ? "Payment approved successfully" : "Payment rejected",
      transaction: result 
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(400).json({ message: errorMessage });
  }
};