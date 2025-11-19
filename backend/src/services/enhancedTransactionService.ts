import { AppDataSource } from "../config/database";
import { Transaction } from "../entities/Transaction";
import { User } from "../entities/User";
import { Wallet } from "../entities/Wallet";
import { 
  TransactionType, 
  TransactionStatus, 
  PaymentMethod 
} from "../types/payment";
import {
  DepositTransactionData,
  WithdrawalTransactionData,
  GameTransactionData,
  RefundTransactionData,
  BonusTransactionData,
  FeeTransactionData,
  EnhancedPaymentMetadata
} from "../types/enhancedPayment";
import { TransactionCategorizer } from "../utils/transactionCategorizer";

export class EnhancedTransactionService {
  private transactionRepo = AppDataSource.getRepository(Transaction);
  private userRepo = AppDataSource.getRepository(User);
  private walletRepo = AppDataSource.getRepository(Wallet);

  /**
   * Create a deposit transaction with enhanced fields
   */
  async createDepositTransaction(
    userId: string,
    data: DepositTransactionData,
    description?: string
  ): Promise<Transaction> {
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      relations: ["wallet"]
    });
    
    if (!user || !user.wallet) {
      throw new Error("User or wallet not found");
    }

    const metadata: EnhancedPaymentMetadata = {
      orderId: `DEP_${Date.now()}_${userId.slice(-6)}`,
      currency: "INR",
      initiatedAt: new Date().toISOString(),
      depositDetails: {
        sourceBank: data.sourceBank,
        depositMethod: "ONLINE",
        bonusAmount: data.bonusAmount || 0,
        originalAmount: data.amount,
        processingFee: data.processingFee || 0
      },
      ipAddress: data.ipAddress,
      deviceInfo: data.deviceInfo
    };

    // Auto-categorize transaction
    const { direction, category } = TransactionCategorizer.categorizeTransaction(
      TransactionType.DEPOSIT,
      data.amount,
      {
        description: description || `Wallet deposit of ${data.amount}`,
        paymentMethod: data.paymentMethod,
        sourceType: "deposit",
        isManual: data.paymentMethod === 'MANUAL'
      }
    );

    const transaction = this.transactionRepo.create({
      userId,
      walletId: user.wallet.id,
      amount: data.amount,
      transactionType: TransactionType.DEPOSIT,
      direction,
      category,
      status: TransactionStatus.PENDING,
      description: description || `Wallet deposit of ${data.amount}`,
      paymentMethod: data.paymentMethod as PaymentMethod,
      referenceId: data.referenceId,
      sourceType: "deposit",
      fee: data.processingFee || 0,
      netAmount: data.amount - (data.processingFee || 0),
      ipAddress: data.ipAddress,
      deviceInfo: data.deviceInfo,
      metadata,
      lastUpdated: new Date(),
      wallet: user.wallet,
      user
    });

    return await this.transactionRepo.save(transaction);
  }

  /**
   * Create a withdrawal transaction with enhanced fields
   */
  async createWithdrawalTransaction(
    userId: string,
    data: WithdrawalTransactionData,
    description?: string
  ): Promise<Transaction> {
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      relations: ["wallet"]
    });
    
    if (!user || !user.wallet) {
      throw new Error("User or wallet not found");
    }

    const metadata: EnhancedPaymentMetadata = {
      orderId: `WDL_${Date.now()}_${userId.slice(-6)}`,
      currency: "INR",
      initiatedAt: new Date().toISOString(),
      withdrawalDetails: {
        beneficiaryName: data.beneficiaryName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        upiId: data.upiId,
        withdrawalMethod: data.withdrawalMethod,
        charges: data.charges || 0,
        netAmount: data.netAmount || data.amount
      },
      ipAddress: data.ipAddress,
      deviceInfo: data.deviceInfo
    };

    // Auto-categorize transaction
    const { direction, category } = TransactionCategorizer.categorizeTransaction(
      TransactionType.WITHDRAWAL,
      data.amount,
      {
        description: description || `Withdrawal request of ${data.amount}`,
        sourceType: "withdrawal"
      }
    );

    const transaction = this.transactionRepo.create({
      userId,
      walletId: user.wallet.id,
      amount: data.amount,
      transactionType: TransactionType.WITHDRAWAL,
      direction,
      category,
      status: TransactionStatus.PENDING,
      description: description || `Withdrawal request of ${data.amount}`,
      paymentMethod: data.withdrawalMethod === "BANK" ? PaymentMethod.BANK_TRANSFER : PaymentMethod.UPI,
      sourceType: "withdrawal",
      accountNumber: data.accountNumber,
      ifscCode: data.ifscCode,
      beneficiaryName: data.beneficiaryName,
      upiReference: data.upiId,
      fee: data.charges || 0,
      netAmount: data.netAmount || data.amount,
      ipAddress: data.ipAddress,
      deviceInfo: data.deviceInfo,
      metadata,
      lastUpdated: new Date(),
      wallet: user.wallet,
      user
    });

    return await this.transactionRepo.save(transaction);
  }

  /**
   * Create a game-related transaction (entry fee or winning)
   */
  async createGameTransaction(
    userId: string,
    data: GameTransactionData,
    transactionType: TransactionType.GAME_ENTRY | TransactionType.GAME_WINNING,
    description?: string
  ): Promise<Transaction> {
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      relations: ["wallet"]
    });
    
    if (!user || !user.wallet) {
      throw new Error("User or wallet not found");
    }

    const metadata: EnhancedPaymentMetadata = {
      orderId: `GAME_${Date.now()}_${userId.slice(-6)}`,
      currency: "INR",
      initiatedAt: new Date().toISOString(),
      gameId: data.gameId,
      gameDetails: {
        gameId: data.gameId,
        gameType: data.gameType,
        entryFee: data.entryFee,
        winningAmount: data.winningAmount,
        rank: data.rank,
        totalPlayers: data.totalPlayers,
        gameMode: data.gameMode
      }
    };

    // Auto-categorize transaction
    const { direction, category } = TransactionCategorizer.categorizeTransaction(
      transactionType,
      data.amount,
      {
        description: description || `Game ${transactionType.toLowerCase()} - ${data.gameType}`,
        sourceType: "game",
        metadata: { gameType: data.gameType }
      }
    );

    const transaction = this.transactionRepo.create({
      userId,
      walletId: user.wallet.id,
      amount: data.amount,
      transactionType,
      direction,
      category,
      status: TransactionStatus.COMPLETED,
      description: description || `Game ${transactionType.toLowerCase()} - ${data.gameType}`,
      paymentMethod: PaymentMethod.SYSTEM,
      sourceType: "game",
      sourceId: data.gameId,
      metadata,
      completedAt: new Date(),
      lastUpdated: new Date(),
      wallet: user.wallet,
      user
    });

    return await this.transactionRepo.save(transaction);
  }

  /**
   * Create a refund transaction
   */
  async createRefundTransaction(
    userId: string,
    data: RefundTransactionData,
    description?: string
  ): Promise<Transaction> {
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      relations: ["wallet"]
    });
    
    if (!user || !user.wallet) {
      throw new Error("User or wallet not found");
    }

    const metadata: EnhancedPaymentMetadata = {
      orderId: `REF_${Date.now()}_${userId.slice(-6)}`,
      currency: "INR",
      initiatedAt: new Date().toISOString(),
      refundDetails: {
        originalTransactionId: data.originalTransactionId,
        refundReason: data.refundReason,
        refundType: data.refundType,
        originalAmount: data.originalAmount,
        refundAmount: data.amount,
        refundMethod: data.refundMethod
      }
    };

    // Auto-categorize transaction
    const { direction, category } = TransactionCategorizer.categorizeTransaction(
      TransactionType.REFUND,
      data.amount,
      {
        description: description || `Refund for transaction ${data.originalTransactionId}`,
        sourceType: "refund"
      }
    );

    const transaction = this.transactionRepo.create({
      userId,
      walletId: user.wallet.id,
      amount: data.amount,
      transactionType: TransactionType.REFUND,
      direction,
      category,
      status: TransactionStatus.COMPLETED,
      description: description || `Refund for transaction ${data.originalTransactionId}`,
      paymentMethod: PaymentMethod.SYSTEM,
      sourceType: "refund",
      parentTransactionId: data.originalTransactionId,
      metadata,
      completedAt: new Date(),
      lastUpdated: new Date(),
      wallet: user.wallet,
      user
    });

    return await this.transactionRepo.save(transaction);
  }

  /**
   * Create a bonus transaction (referral, welcome, cashback, etc.)
   */
  async createBonusTransaction(
    userId: string,
    data: BonusTransactionData,
    description?: string
  ): Promise<Transaction> {
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      relations: ["wallet"]
    });
    
    if (!user || !user.wallet) {
      throw new Error("User or wallet not found");
    }

    const metadata: EnhancedPaymentMetadata = {
      orderId: `BON_${Date.now()}_${userId.slice(-6)}`,
      currency: "INR",
      initiatedAt: new Date().toISOString(),
      bonusDetails: {
        bonusType: data.bonusType,
        sourceTransactionId: data.sourceTransactionId,
        referralCode: data.referralCode,
        bonusPercentage: data.bonusPercentage,
        maxBonusAmount: data.maxBonusAmount,
        validityPeriod: data.validityPeriod
      }
    };

    // Auto-categorize transaction
    const { direction, category } = TransactionCategorizer.categorizeTransaction(
      TransactionType.BONUS,
      data.amount,
      {
        description: description || `${data.bonusType} bonus of ${data.amount}`,
        sourceType: "bonus"
      }
    );

    const transaction = this.transactionRepo.create({
      userId,
      walletId: user.wallet.id,
      amount: data.amount,
      transactionType: TransactionType.BONUS,
      direction,
      category,
      status: TransactionStatus.COMPLETED,
      description: description || `${data.bonusType} bonus of ${data.amount}`,
      paymentMethod: PaymentMethod.SYSTEM,
      sourceType: "bonus",
      sourceId: data.sourceTransactionId,
      metadata,
      completedAt: new Date(),
      lastUpdated: new Date(),
      wallet: user.wallet,
      user
    });

    return await this.transactionRepo.save(transaction);
  }

  /**
   * Create a fee/deduction transaction
   */
  async createFeeTransaction(
    userId: string,
    data: FeeTransactionData,
    description?: string
  ): Promise<Transaction> {
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      relations: ["wallet"]
    });
    
    if (!user || !user.wallet) {
      throw new Error("User or wallet not found");
    }

    const metadata: EnhancedPaymentMetadata = {
      orderId: `FEE_${Date.now()}_${userId.slice(-6)}`,
      currency: "INR",
      initiatedAt: new Date().toISOString(),
      feeDetails: {
        feeType: data.feeType,
        feePercentage: data.feePercentage,
        baseFee: data.baseFee,
        calculatedOn: data.calculatedOn,
        exemptionReason: data.exemptionReason
      }
    };

    // Auto-categorize transaction
    const { direction, category } = TransactionCategorizer.categorizeTransaction(
      TransactionType.FEE,
      data.amount,
      {
        description: description || `${data.feeType} fee of ${data.amount}`,
        sourceType: "fee"
      }
    );

    const transaction = this.transactionRepo.create({
      userId,
      walletId: user.wallet.id,
      amount: data.amount,
      transactionType: TransactionType.FEE,
      direction,
      category,
      status: TransactionStatus.COMPLETED,
      description: description || `${data.feeType} fee of ${data.amount}`,
      paymentMethod: PaymentMethod.SYSTEM,
      sourceType: "fee",
      fee: data.amount,
      metadata,
      completedAt: new Date(),
      lastUpdated: new Date(),
      wallet: user.wallet,
      user
    });

    return await this.transactionRepo.save(transaction);
  }

  /**
   * Get transaction history with enhanced filtering
   */
  async getUserTransactionHistory(
    userId: string,
    filters?: {
      transactionType?: TransactionType;
      status?: TransactionStatus;
      sourceType?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const query = this.transactionRepo.createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.wallet", "wallet")
      .leftJoinAndSelect("transaction.user", "user")
      .where("transaction.userId = :userId", { userId });

    if (filters?.transactionType) {
      query.andWhere("transaction.transactionType = :type", { type: filters.transactionType });
    }

    if (filters?.status) {
      query.andWhere("transaction.status = :status", { status: filters.status });
    }

    if (filters?.sourceType) {
      query.andWhere("transaction.sourceType = :sourceType", { sourceType: filters.sourceType });
    }

    if (filters?.dateFrom) {
      query.andWhere("transaction.createdAt >= :dateFrom", { dateFrom: filters.dateFrom });
    }

    if (filters?.dateTo) {
      query.andWhere("transaction.createdAt <= :dateTo", { dateTo: filters.dateTo });
    }

    query.orderBy("transaction.createdAt", "DESC");

    const total = await query.getCount();

    if (filters?.limit) {
      query.limit(filters.limit);
    }

    if (filters?.offset) {
      query.offset(filters.offset);
    }

    const transactions = await query.getMany();

    return { transactions, total };
  }
}