import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { Wallet } from "../entities/Wallet";
import { Transaction } from "../entities/Transaction";
import {
  PaymentMethod,
  TransactionStatus,
  TransactionType,
} from "../types/payment";
import * as paymentService from "./paymentService";
import * as adminService from "./adminService";
import { TransactionCategorizer } from "../utils/transactionCategorizer";

interface WalletUpdate {
  balance: number;
  lastUpdated?: Date;
}

export const getBalance = async (
  userId: string
): Promise<{
  balance: number;
  winningAmount: number;
  cashbackAmount: number;
  withdrawalUpi: string;
  totalBalance: number;
}> => {
  try {
    const walletRepository = AppDataSource.getRepository(Wallet);
    const wallet = await walletRepository.findOne({
      where: { user: { id: userId } },
      relations: ["user"],
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // Calculate total balance including cashback
    const totalBalance = Number(wallet.balance || 0) + 
                        Number(wallet.winningAmount || 0) + 
                        Number(wallet.cashbackAmount || 0);

    return {
      balance: Number(wallet.balance || 0),
      winningAmount: Number(wallet.winningAmount || 0),
      cashbackAmount: Number(wallet.cashbackAmount || 0),
      withdrawalUpi: wallet.withdrawalUpi || '',
      totalBalance,
    };
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    throw new Error("Failed to get wallet balance");
  }
};

// Function to calculate cashback contribution for game entry
export const calculateCashbackContribution = async (
  entryFee: number,
  cashbackAmount: number
): Promise<{ cashbackUsed: number; balanceNeeded: number }> => {
  try {
    // Get active config
    const activeConfig = await adminService.getActiveConfig();

    // If cashback is not enabled, use full balance
    if (!activeConfig.cashback) {
      return { cashbackUsed: 0, balanceNeeded: entryFee };
    }

    const cashbackPercentage = activeConfig.cashback;
    const maxCashbackUsable = (entryFee * cashbackPercentage) / 100;

    // If user has enough cashback, use the calculated amount
    const cashbackUsed = Math.min(maxCashbackUsable, cashbackAmount);
    const balanceNeeded = entryFee - cashbackUsed;

    return { cashbackUsed, balanceNeeded };
  } catch (error) {
    console.error('Error calculating cashback contribution:', error);
    return { cashbackUsed: 0, balanceNeeded: entryFee };
  }
};

export const deductGameEntryFee = async (
  userId: string,
  entryFee: number,
  gameId: string,
  gameType: string
): Promise<{ success: boolean; remainingBalance: number; remainingCashback: number }> => {
  const walletRepository = AppDataSource.getRepository(Wallet);
  const transactionRepository = AppDataSource.getRepository(Transaction);

  try {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      const wallet = await transactionalEntityManager.findOne(Wallet, {
        where: { user: { id: userId } },
        relations: ["user"],
        lock: { mode: "pessimistic_write" },
      });

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const { cashbackUsed, balanceNeeded } = await calculateCashbackContribution(
        entryFee,
        Number(wallet.cashbackAmount || 0)
      );

      if (Number(wallet.balance) < balanceNeeded) {
        throw new Error("Insufficient balance");
      }

      // Deduct from both cashback and main balance
      wallet.cashbackAmount = Number(wallet.cashbackAmount || 0) - cashbackUsed;
      wallet.balance = Number(wallet.balance) - balanceNeeded;
      wallet.lastUpdated = new Date();
      wallet.updatedAt = new Date();

      await transactionalEntityManager.save(wallet);

      // Create transaction record for entry fee
      const transaction = transactionalEntityManager.create(Transaction, {
        amount: entryFee,
        transactionType: TransactionType.GAME_ENTRY,
        status: TransactionStatus.COMPLETED,
        description: `Game entry fee for ${gameType}`,
        walletId: wallet.id,
        userId: userId,
        metadata: {
          gameId,
          gameType,
          cashbackUsed,
          balanceUsed: balanceNeeded
        }
      });
      await transactionalEntityManager.save(transaction);

      return {
        success: true,
        remainingBalance: Number(wallet.balance),
        remainingCashback: Number(wallet.cashbackAmount),
      };
    });
  } catch (error) {
    console.error('Error deducting game entry fee:', error);
    throw new Error("Failed to deduct game entry fee");
  }
};

export const addFunds = async (
  userId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  paymentDetails?: any
) => {
  // Initiate payment transaction
  const transaction = await paymentService.initiatePayment({
    userId,
    amount,
    currency: "INR",
    paymentMethod,
    description: `Wallet deposit via ${paymentMethod}`,
    ...paymentDetails,
  });

  if (paymentMethod === PaymentMethod.MANUAL) {
    // For manual payments, transaction stays in PENDING state until admin approval
    return transaction;
  }

  // For automatic payments (like Paytm), we'll handle the completion in webhook
  return transaction;
};

export const withdrawFunds = async (
  userId: string,
  amount: number,
  paymentMethod: PaymentMethod
): Promise<{ transaction: any; balance: number }> => {
  const walletRepository = AppDataSource.getRepository(Wallet);
  const wallet = await walletRepository.findOne({
    where: { user: { id: userId } },
    relations: ["user"],
  });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  const winningAmount = Number(wallet.winningAmount);
  if (winningAmount < amount) {
    throw new Error("Insufficient winnings");
  }

  // Create withdrawal transaction
  const transaction = await paymentService.initiatePayment({
    userId,
    amount,
    currency: "INR",
    paymentMethod,
    description: `Wallet withdrawal via ${paymentMethod}`,
  });

  // For manual payments, don't deduct money immediately - wait for admin approval
  if (paymentMethod === PaymentMethod.MANUAL) {
    return {
      transaction,
      balance: Number(wallet.balance)
    };
  }

  // For automatic payments (like Paytm), process withdrawal immediately
  await AppDataSource.transaction(async (transactionalEntityManager) => {
    const lockedWallet = await transactionalEntityManager.findOne(Wallet, {
      where: { id: wallet.id },
      relations: ["user"],
      lock: { mode: "pessimistic_write" },
    });

    if (!lockedWallet) {
      throw new Error("Wallet not found during withdrawal");
    }

    lockedWallet.winningAmount = Number(lockedWallet.winningAmount) - amount;
    await transactionalEntityManager.save(lockedWallet);

    await paymentService.updatePaymentStatus(
      transaction.id,
      TransactionStatus.COMPLETED
    );
  });

  return {
    transaction,
    balance: Number(wallet.balance)
  };
};

export const getTransactionHistory = async (userId: string) => {
  return paymentService.getTransactionHistory(userId);
};

export const processManualPayment = async (
  transactionId: string,
  approved: boolean
) => {
  const status = approved
    ? TransactionStatus.COMPLETED
    : TransactionStatus.FAILED;
  return paymentService.updatePaymentStatus(transactionId, status);
};

export const updateWalletBalance = async (
  userId: string,
  amount: number,
  operation: "credit" | "debit",
  description: string
): Promise<number> => {
  const walletRepository = AppDataSource.getRepository(Wallet);

  try {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      const wallet = await transactionalEntityManager.findOne(Wallet, {
        where: { id: userId },
        relations: ["user"],
        lock: { mode: "pessimistic_write" },
      });

      if (!wallet) {
        throw new Error("Wallet not found during update");
      }

      const currentBalance = Number(wallet.balance || 0);

      if (operation === "debit" && currentBalance < amount) {
        throw new Error("Insufficient funds");
      }

      wallet.balance = operation === "credit"
        ? currentBalance + amount
        : currentBalance - amount;

      wallet.lastUpdated = new Date();
      wallet.updatedAt = new Date();

      const updatedWallet = await transactionalEntityManager.save(wallet);
      return Number(updatedWallet.balance);
    });
  } catch (error) {
    console.error('Error updating wallet balance:', error);
    throw new Error("Failed to update wallet balance");
  }
};

export const transferWinningsToBalance = async (
  userId: string,
  amount: number
) => {
  const walletRepository = AppDataSource.getRepository(Wallet);
  const wallet = await walletRepository.findOne({
    where: { user: { id: userId } },
    relations: ["user"],
  });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  if (wallet.winningAmount < amount) {
    throw new Error("Insufficient winnings to transfer");
  }

  wallet.balance += amount;
  wallet.winningAmount -= amount;

  await walletRepository.save(wallet);

  return Number(wallet.balance);
};

export const updateWithdrawalUpi = async (
  userId: string,
  upiId: string
): Promise<void> => {
  const walletRepository = AppDataSource.getRepository(Wallet);
  const wallet = await walletRepository.findOne({
    where: { user: { id: userId } },
    relations: ["user"],
  });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  wallet.withdrawalUpi = upiId;
  wallet.lastUpdated = new Date();
  wallet.updatedAt = new Date();

  await walletRepository.save(wallet);
};

export const createWallet = async (userId: string): Promise<Wallet> => {
  const walletRepository = AppDataSource.getRepository(Wallet);

  try {
    const newWallet = walletRepository.create({
      user: { id: userId },
      balance: 0,
      winningAmount: 0,
      cashbackAmount: 0,
      totalBalance: 0,
      currency: 'INR',
    });

    return await walletRepository.save(newWallet);
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw new Error("Failed to create wallet");
  }
};

// Admin function for updating withdrawal UPI (can overwrite existing UPI)
export const adminUpdateWithdrawalUpi = async (userId: string, withdrawalUpi: string) => {
  const walletRepository = AppDataSource.getRepository(Wallet);
  const wallet = await walletRepository.findOne({
    where: { user: { id: userId } },
    relations: ["user"],
  });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  wallet.withdrawalUpi = withdrawalUpi;
  await walletRepository.save(wallet);
  return wallet;
};

export const transferCashbackToBalance = async (
  userId: string,
  amount: number
): Promise<{ balance: number; cashbackAmount: number }> => {
  const walletRepository = AppDataSource.getRepository(Wallet);
  const wallet = await walletRepository.findOne({
    where: { user: { id: userId } },
    relations: ["user"],
  });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  if ((wallet.cashbackAmount || 0) < amount) {
    throw new Error("Insufficient cashback amount");
  }

  wallet.balance += amount;
  wallet.cashbackAmount = (wallet.cashbackAmount || 0) - amount;
  wallet.lastUpdated = new Date();
  wallet.updatedAt = new Date();

  await walletRepository.save(wallet);
  return {
    balance: wallet.balance,
    cashbackAmount: wallet.cashbackAmount,
  };
};