import { AppDataSource } from "../config/database";
import { Transaction } from "../entities/Transaction";
import {
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  PaymentDetails,
  PaymentGatewayResponse,
  PaymentMetadata,
} from "../types/payment";
import { Wallet } from "../entities/Wallet";
import { User } from "../entities/User";
import { PaymentAuditLog } from "../entities/PaymentAuditLog";
import { TransactionCategorizer } from "../utils/transactionCategorizer";

export type PaymentAuditAction = 'APPROVED' | 'REJECTED' | 'PENDING_REVIEW' | 'VERIFICATION_REQUESTED' | 'UTR_VERIFIED' | 'UTR_REJECTED';

export interface PaymentAuditLogData {
  transactionId: string;
  adminId: string;
  action: PaymentAuditAction;
  details?: any;
}

// Helper function to map transaction status to audit log action
const mapTransactionStatusToAuditAction = (status: TransactionStatus): PaymentAuditAction => {
  switch (status) {
    case TransactionStatus.COMPLETED:
      return 'APPROVED';
    case TransactionStatus.FAILED:
      return 'REJECTED';
    case TransactionStatus.PENDING:
      return 'PENDING_REVIEW';
    default:
      return 'PENDING_REVIEW';
  }
};

export const initiatePayment = async (details: PaymentDetails) => {
  const transactionRepo = AppDataSource.getRepository(Transaction);
  const walletRepo = AppDataSource.getRepository(Wallet);
  const userRepo = AppDataSource.getRepository(User);

  // Validate payment details
  if (details.amount <= 0) {
    throw new Error("Invalid amount: Amount must be greater than 0");
  }

  if (details.paymentMethod === PaymentMethod.MANUAL && !details.utrNumber) {
    // Only require UTR for deposits, not withdrawals  
    // Check description to identify withdrawals (withdrawals don't need UTR during initiation)
    const isWithdrawal = details.description?.toLowerCase().includes('withdrawal');
    if (!isWithdrawal) {
      throw new Error("UTR number is required for manual UPI payments");
    }
  }

  // Find or create wallet
  let wallet = await walletRepo.findOne({
    where: { user: { id: details.userId } },
    relations: ["user"],
  });
  const user = await userRepo.findOne({ where: { id: details.userId } });

  if (!user) {
    throw new Error("User not found");
  }

  if (!wallet) {
    wallet = walletRepo.create({
      user: user,
      balance: 0,
      currency: details.currency,
    });
    wallet = await walletRepo.save(wallet);
  }

  // Generate orderId with better uniqueness
  const orderId =
    details.orderId ||
    `ORD_${Date.now()}_${user.id.slice(-6)}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;

  // Create transaction record with enhanced metadata
  const transactionData = {
    wallet: wallet,
    amount: details.amount,
    transactionType: TransactionType.DEPOSIT,
    status: TransactionStatus.PENDING,
    paymentMethod: details.paymentMethod,
    description:
      details.description || `Wallet deposit via ${details.paymentMethod}`,
    metadata: {
      orderId,
      utrNumber: details.utrNumber,
      currency: details.currency || wallet.currency || "INR", // Use wallet currency or default to INR
      gatewayResponse: details.gatewayResponse,
      initiatedAt: new Date().toISOString(),
      lastError: null,
    },
    lastUpdated: new Date(),
    userId: user.id,
  };

  const transaction = transactionRepo.create(transactionData);

  try {
    await transactionRepo.save(transaction);
    return transaction;
  } catch (error) {
    throw new Error(
      `Failed to create transaction: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

export const updatePaymentStatus = async (
  transactionId: string,
  status: TransactionStatus,
  paymentId?: string,
  gatewayResponse?: {
    code: string;
    message: string;
    transactionId?: string;
    gatewayTransactionId?: string;
    paymentMode?: string;
    bankName?: string;
    timestamp?: string;
  }
) => {
  const transactionRepo = AppDataSource.getRepository(Transaction);

  // First get the transaction without locking
  const transaction = await transactionRepo.findOne({
    where: { id: transactionId },
    relations: ["wallet"],
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  if (!transaction.wallet) {
    throw new Error("Wallet not found for transaction");
  }

  // Prevent duplicate processing
  if (
    transaction.status === TransactionStatus.COMPLETED ||
    transaction.status === TransactionStatus.FAILED
  ) {
    throw new Error(
      `Transaction ${transactionId} has already been ${transaction.status.toLowerCase()}`
    );
  }

  try {
    // Start a transaction to ensure data consistency
    return await AppDataSource.manager.transaction(
      async (transactionalEntityManager) => {
        // First get wallet with lock
        const wallet = await transactionalEntityManager
          .createQueryBuilder(Wallet, "wallet")
          .where("wallet.id = :walletId", { walletId: transaction.wallet.id })
          .setLock("pessimistic_write")
          .getOne();

        if (!wallet) {
          throw new Error("Wallet not found during update");
        }

        // Update transaction status and updatedBy field
        transaction.status = status;
        transaction.lastUpdated = new Date();
        transaction.updatedAt = new Date();

        if (paymentId) {
          transaction.paymentId = paymentId;
        }

        // Set updatedBy if transaction is being processed by admin
        if (gatewayResponse?.code === "ADMIN_APPROVED" || gatewayResponse?.code === "ADMIN_REJECTED") {
          const adminId = gatewayResponse.transactionId || "ADMIN";
          transaction.updatedBy = adminId;
        }

        // If payment is completed, update wallet balance
        if (status === TransactionStatus.COMPLETED) {
          transaction.completedAt = new Date();

          // Update balance based on transaction type
          const currentBalance = Number(wallet.balance);
          const transactionAmount = Number(transaction.amount);

          if (transaction.transactionType === TransactionType.DEPOSIT) {
            wallet.balance = currentBalance + transactionAmount;
          } else if (transaction.transactionType === TransactionType.WITHDRAWAL) {
            if (currentBalance < transactionAmount) {
              throw new Error("Insufficient funds");
            }
            wallet.balance = currentBalance - transactionAmount;
          }

          wallet.updatedAt = new Date();
          await transactionalEntityManager.save(wallet);
        }

        // Save transaction updates
        await transactionalEntityManager.save(transaction);

        // Create audit log with proper handling of updatedBy
        await createPaymentAuditLog({
          transactionId: transaction.id,
          adminId: transaction.updatedBy || "SYSTEM",
          action: mapTransactionStatusToAuditAction(status),
          details: {
            previousStatus: transaction.status,
            newStatus: status,
            gatewayResponse,
          },
        });

        return transaction;
      }
    );
  } catch (error) {
    // Handle failure and create audit log
    transaction.status = TransactionStatus.FAILED;
    transaction.lastUpdated = new Date();
    const currentMetadata = transaction.metadata || {};
    transaction.metadata = {
      ...currentMetadata,
      orderId: (currentMetadata as PaymentMetadata)?.orderId || `ERR_${Date.now()}`,
      currency: (currentMetadata as PaymentMetadata)?.currency || "INR",
      initiatedAt:
        (currentMetadata as PaymentMetadata)?.initiatedAt ||
        new Date().toISOString(),
      lastError: error instanceof Error ? error.message : "Unknown error occurred",
    } as PaymentMetadata;

    await transactionRepo.save(transaction);
    throw error;
  }
};

export const getTransactionHistory = async (userId: string) => {
  const transactionRepo = AppDataSource.getRepository(Transaction);
  return transactionRepo.find({
    where: { user: { id: userId } },
    order: { createdAt: "DESC" },
    relations: ["user", "wallet"],
  });
};

export const getTransaction = async (transactionId: string) => {
  const transactionRepo = AppDataSource.getRepository(Transaction);
  return transactionRepo.findOne({
    where: { id: transactionId },
    relations: ["wallet", "user"],
  });
};

export const createPaymentAuditLog = async (
  data: PaymentAuditLogData
): Promise<PaymentAuditLog> => {
  const auditLogRepo = AppDataSource.getRepository(PaymentAuditLog);
  const log = auditLogRepo.create({
    transactionId: data.transactionId,
    adminUserId: data.adminId,
    action: data.action,
    remarks: JSON.stringify(data.details),
  });
  return auditLogRepo.save(log);
};