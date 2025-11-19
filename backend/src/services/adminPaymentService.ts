import { Between, In } from "typeorm";
import { AppDataSource } from "../config/database";
import { Transaction } from "../entities/Transaction";
import {
  TransactionStatus,
  PaymentMethod,
  PaymentStats,
  PaymentGatewayConfig,
} from "../types/payment";
import { User } from "../entities/User";
import { Wallet } from "../entities/Wallet";
import * as paymentService from "./paymentService";
import { PaymentMethodConfig } from "../entities/PaymentMethodConfig";
import { logger } from "../utils/logger";
import { PaymentAuditLog } from "../entities/PaymentAuditLog"; // Import the PaymentAuditLog entity
import { PaymentAuditAction } from "./paymentService"; //Import the new type


interface TransactionFilters {
  status?: TransactionStatus;
  paymentMethod?: PaymentMethod;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  userId?: string;
  searchTerm?: string;
}

export const getTransactionsForAdmin = async (
  page: number = 1,
  limit: number = 10,
  filters?: TransactionFilters,
  sortBy: string = "createdAt",
  sortOrder: "ASC" | "DESC" = "DESC"
) => {
  const transactionRepo = AppDataSource.getRepository(Transaction);
  const queryBuilder = transactionRepo
    .createQueryBuilder("transaction")
    .leftJoinAndSelect("transaction.user", "user")
    .leftJoinAndSelect("transaction.wallet", "wallet")
    .leftJoinAndSelect("transaction.auditLogs", "auditLogs");

  // Apply filters
  if (filters) {
    if (filters.status) {
      queryBuilder.andWhere("transaction.status = :status", {
        status: filters.status,
      });
    }

    if (filters.paymentMethod) {
      queryBuilder.andWhere("transaction.paymentMethod = :method", {
        method: filters.paymentMethod,
      });
    }

    if (filters.startDate) {
      queryBuilder.andWhere("transaction.createdAt >= :startDate", {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      queryBuilder.andWhere("transaction.createdAt <= :endDate", {
        endDate: filters.endDate,
      });
    }

    if (filters.minAmount) {
      queryBuilder.andWhere("transaction.amount >= :minAmount", {
        minAmount: filters.minAmount,
      });
    }

    if (filters.maxAmount) {
      queryBuilder.andWhere("transaction.amount <= :maxAmount", {
        maxAmount: filters.maxAmount,
      });
    }

    if (filters.userId) {
      queryBuilder.andWhere("transaction.userId = :userId", {
        userId: filters.userId,
      });
    }

    if (filters.searchTerm) {
      queryBuilder.andWhere(
        "(transaction.id LIKE :search OR user.email LIKE :search OR transaction.metadata->>'utrNumber' LIKE :search)",
        { search: `%${filters.searchTerm}%` }
      );
    }
  }

  // Add sorting
  if (sortBy === "amount") {
    queryBuilder.orderBy("transaction.amount", sortOrder);
  } else if (sortBy === "status") {
    queryBuilder.orderBy("transaction.status", sortOrder);
  } else if (sortBy === "paymentMethod") {
    queryBuilder.orderBy("transaction.paymentMethod", sortOrder);
  } else {
    queryBuilder.orderBy("transaction.createdAt", sortOrder);
  }

  // Add pagination
  const skip = (page - 1) * limit;
  queryBuilder.skip(skip).take(limit);

  const [transactions, total] = await queryBuilder.getManyAndCount();

  return {
    transactions,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getTransactionDetailsForAdmin = async (id: string) => {
  const transactionRepo = AppDataSource.getRepository(Transaction);
  const transaction = await transactionRepo.findOne({
    where: { id: id },
    relations: ["user", "wallet", "auditLogs"],
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  return transaction;
};

export const approveManualPayment = async (
  transactionId: string,
  adminUserId: string,
  remarks: string,
  notifyUser: boolean = true
): Promise<Transaction> => {
  const transaction = await getTransactionDetailsForAdmin(transactionId);

  if (transaction.status !== TransactionStatus.PENDING) {
    throw new Error(
      `Cannot approve transaction in ${transaction.status} status`
    );
  }

  if (transaction.paymentMethod !== PaymentMethod.MANUAL) {
    throw new Error("Can only approve manual payments");
  }

  const updatedTransaction = await paymentService.updatePaymentStatus(
    transaction.id,
    TransactionStatus.COMPLETED,
    transaction.metadata?.utrNumber,
    {
      code: "ADMIN_APPROVED",
      message: remarks || "Payment approved by admin",
      transactionId: transaction.id,
      timestamp: new Date().toISOString(),
    }
  );

  if (!updatedTransaction) {
    throw new Error("Failed to update transaction status");
  }

  await addPaymentAuditLog(transaction, adminUserId, "APPROVED", remarks);

  if (notifyUser) {
    // TODO: Implement user notification logic
    logger.info("User notification would be sent here");
  }

  return updatedTransaction;
};

export const rejectManualPayment = async (
  transactionId: string,
  adminUserId: string,
  reason: string,
  notifyUser: boolean = true
): Promise<Transaction> => {
  const transaction = await getTransactionDetailsForAdmin(transactionId);

  if (transaction.status !== TransactionStatus.PENDING) {
    throw new Error(
      `Cannot reject transaction in ${transaction.status} status`
    );
  }

  if (transaction.paymentMethod !== PaymentMethod.MANUAL) {
    throw new Error("Can only reject manual payments");
  }

  const updatedTransaction = await paymentService.updatePaymentStatus(
    transaction.id,
    TransactionStatus.FAILED,
    transaction.metadata?.utrNumber,
    {
      code: "ADMIN_REJECTED",
      message: reason || "Payment rejected by admin",
      transactionId: transaction.id,
      timestamp: new Date().toISOString(),
    }
  );

  if (!updatedTransaction) {
    throw new Error("Failed to update transaction status");
  }

  await addPaymentAuditLog(transaction, adminUserId, "REJECTED", reason);

  if (notifyUser) {
    // TODO: Implement user notification logic
    logger.info("User notification would be sent here");
  }

  return updatedTransaction;
};

export const getPaymentStats = async (
  startDate?: Date,
  endDate?: Date
): Promise<PaymentStats> => {
  const transactionRepo = AppDataSource.getRepository(Transaction);
  const queryBuilder = transactionRepo.createQueryBuilder("transaction");

  if (startDate) {
    queryBuilder.andWhere("transaction.createdAt >= :startDate", { startDate });
  }
  if (endDate) {
    queryBuilder.andWhere("transaction.createdAt <= :endDate", { endDate });
  }

  const stats = await queryBuilder
    .select([
      "COUNT(*) as totalTransactions",
      "SUM(transaction.amount) as totalAmount",
      "AVG(transaction.amount) as averageTransactionAmount",
      "COUNT(CASE WHEN transaction.status = :completed THEN 1 END) as successfulTransactions",
      "COUNT(CASE WHEN transaction.status = :failed THEN 1 END) as failedTransactions",
      "COUNT(CASE WHEN transaction.status = :pending THEN 1 END) as pendingTransactions",
    ])
    .setParameters({
      completed: TransactionStatus.COMPLETED,
      failed: TransactionStatus.FAILED,
      pending: TransactionStatus.PENDING,
    })
    .getRawOne();

  const transactionsByMethod = await queryBuilder
    .select("transaction.paymentMethod", "method")
    .addSelect("COUNT(*)", "count")
    .groupBy("transaction.paymentMethod")
    .getRawMany();

  const transactionsByStatus = await queryBuilder
    .select("transaction.status", "status")
    .addSelect("COUNT(*)", "count")
    .groupBy("transaction.status")
    .getRawMany();

  const dailyTransactions = await queryBuilder
    .select("DATE(transaction.createdAt)", "date")
    .addSelect("COUNT(*)", "count")
    .addSelect("SUM(transaction.amount)", "amount")
    .groupBy("DATE(transaction.createdAt)")
    .orderBy("date", "DESC")
    .limit(30)
    .getRawMany();

  return {
    ...stats,
    transactionsByMethod: transactionsByMethod.reduce(
      (acc, { method, count }) => {
        acc[method] = parseInt(count);
        return acc;
      },
      {} as Record<PaymentMethod, number>
    ),
    transactionsByStatus: transactionsByStatus.reduce(
      (acc, { status, count }) => {
        acc[status] = parseInt(count);
        return acc;
      },
      {} as Record<TransactionStatus, number>
    ),
    dailyTransactions: dailyTransactions.map(({ date, count, amount }) => ({
      date: new Date(date).toISOString().split("T")[0],
      count: parseInt(count),
      amount: parseFloat(amount) || 0,
    })),
  };
};

export const bulkApprovePayments = async (
  transactionIds: string[],
  adminUserId: string,
  remarks: string
): Promise<{
  successful: Array<{ transactionId: string; status: TransactionStatus }>;
  failed: Array<{ transactionId: string; error: string }>;
}> => {
  const results = {
    successful: [] as Array<{
      transactionId: string;
      status: TransactionStatus;
    }>,
    failed: [] as Array<{ transactionId: string; error: string }>,
  };

  // Process transactions in batches to avoid memory issues
  const batchSize = 50;
  for (let i = 0; i < transactionIds.length; i += batchSize) {
    const batch = transactionIds.slice(i, i + batchSize);

    // Get all transactions in current batch
    const transactionRepo = AppDataSource.getRepository(Transaction);
    const transactions = await transactionRepo.find({
      where: { id: In(batch) },
      relations: ["user", "wallet"],
    });

    // Process each transaction
    for (const transaction of transactions) {
      try {
        if (transaction.status !== TransactionStatus.PENDING) {
          throw new Error(
            `Transaction ${transaction.id} is not in PENDING status`
          );
        }

        const updatedTransaction = await approveManualPayment(
          transaction.id,
          adminUserId,
          remarks
        );

        results.successful.push({
          transactionId: transaction.id,
          status: updatedTransaction.status,
        });
      } catch (error) {
        results.failed.push({
          transactionId: transaction.id,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  }

  return results;
};

// Payment Method Configuration Management
export const getPaymentMethodConfigs = async (): Promise<
  PaymentMethodConfig[]
> => {
  const configRepo = AppDataSource.getRepository(PaymentMethodConfig);
  return await configRepo.find();
};

export const updatePaymentMethodStatus = async (
  paymentMethod: PaymentMethod,
  isEnabled: boolean,
  adminUserId: string,
  reason?: string
): Promise<PaymentMethodConfig> => {
  const configRepo = AppDataSource.getRepository(PaymentMethodConfig);
  const config = await configRepo.findOne({ where: { paymentMethod } });

  if (!config) {
    throw new Error("Payment method configuration not found");
  }

  config.isEnabled = isEnabled;
  config.updatedBy = adminUserId;
  config.disabledReason = isEnabled ? undefined : reason || undefined;
  config.updatedAt = new Date();

  return await configRepo.save(config);
};

export const updatePaymentMethodSchedule = async (
  paymentMethod: PaymentMethod,
  schedule: {
    enabledFrom?: Date;
    enabledUntil?: Date;
  },
  adminUserId: string
): Promise<PaymentMethodConfig> => {
  const configRepo = AppDataSource.getRepository(PaymentMethodConfig);
  const config = await configRepo.findOne({ where: { paymentMethod } });

  if (!config) {
    throw new Error("Payment method configuration not found");
  }

  config.enabledFrom = schedule.enabledFrom || null;
  config.enabledUntil = schedule.enabledUntil || null;
  config.hasSchedule = !!(schedule.enabledFrom || schedule.enabledUntil);
  config.updatedBy = adminUserId;
  config.updatedAt = new Date();

  return await configRepo.save(config);
};

interface PaymentAuditLogEntry {
  id: string;
  transactionId: string;
  adminUserId: string;
  action: "APPROVED" | "REJECTED" | "PENDING_REVIEW" | "VERIFICATION_REQUESTED" | "UTR_VERIFIED" | "UTR_REJECTED";
  remarks?: string;
  timestamp: Date;
}

const addPaymentAuditLog = async (
  transaction: Transaction,
  adminUserId: string,
  action: PaymentAuditAction,
  remarks?: string
): Promise<void> => {
  const auditLogRepo = AppDataSource.getRepository(PaymentAuditLog);
  const log = auditLogRepo.create({
    transactionId: transaction.id,
    adminUserId,
    action,
    remarks,
    timestamp: new Date(),
  });

  await auditLogRepo.save(log);
};

export const getPaymentGatewayConfig = async () => {
  try {
    const { PaymentGatewayService } = await import("./paymentGatewayService");
    const gatewayService = new PaymentGatewayService();
    return gatewayService.getConfig();
  } catch (error) {
    console.error("Error fetching payment gateway config:", error);
    throw new Error("Failed to fetch payment gateway configuration");
  }
};

export const updatePaymentGatewayConfig = async (
  config: PaymentGatewayConfig
) => {
  try {
    const { PaymentGatewayService } = await import("./paymentGatewayService");
    const gatewayService = new PaymentGatewayService();

    // Validate environment
    if (!["test", "production"].includes(config.environment)) {
      throw new Error("Invalid environment specified");
    }

    // Validate merchant credentials
    if (!config.merchantId.trim() || !config.merchantKey.trim()) {
      throw new Error("Invalid merchant credentials");
    }

    // Update configuration
    gatewayService.updateConfig(config);

    // Return sanitized config (excluding sensitive data)
    return gatewayService.getConfig();
  } catch (error) {
    console.error("Error updating payment gateway config:", error);
    throw error;
  }
};