import { AppDataSource } from "../config/database";
import {
  CryptoTransaction,
  CryptoTransactionStatus,
  CryptoTransactionType,
} from "../entities/CryptoTransaction";
import { ConversionRate } from "../entities/ConversionRate";
import { User } from "../entities/User";
import { Wallet } from "../entities/Wallet";
import { Transaction } from "../entities/Transaction";
import { nowPaymentsService } from "./nowPaymentsService";
import { logger } from "../utils/logger";
import {
  PaymentMethod,
  TransactionCategory,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from "../types/payment";
import { nowPaymentsConfig } from "../config/nowPayments";

const DEFAULT_CONVERSION_RATES: Record<string, number> = {
  USD: 10,
  USDT: 10,
  SOL: 20,
  ETH: 500,
  BTC: 10000,
};

interface CreateDepositParams {
  userId: string;
  cryptoCurrency: string;
  usdAmount: number;
}

interface CalculateTokensResult {
  tokens: number;
  rate: number;
  cryptoAmount: number;
}

class CryptoPaymentService {
  private cryptoTransactionRepository = AppDataSource.getRepository(CryptoTransaction);
  private conversionRateRepository = AppDataSource.getRepository(ConversionRate);
  private userRepository = AppDataSource.getRepository(User);
  private walletRepository = AppDataSource.getRepository(Wallet);
  private transactionRepository = AppDataSource.getRepository(Transaction);

  public async getConversionRate(cryptoCurrency: string): Promise<number> {
    const normalized = cryptoCurrency.toUpperCase();
    const rateEntity = await this.conversionRateRepository.findOne({
      where: {
        cryptoCurrency: normalized,
        isActive: true,
      },
    });

    if (rateEntity) {
      const rateValue = typeof rateEntity.tokensPerUnit === "string"
        ? parseFloat(rateEntity.tokensPerUnit)
        : rateEntity.tokensPerUnit;

      if (Number.isFinite(rateValue)) {
        return rateValue;
      }

      logger.error("Invalid conversion rate value", {
        cryptoCurrency: normalized,
        rate: rateEntity.tokensPerUnit,
      });
    }

    const envRate = this.getConversionRateFromEnv(normalized);
    if (envRate !== null) {
      logger.warn("Using fallback conversion rate from environment/defaults", {
        cryptoCurrency: normalized,
        rate: envRate,
      });
      return envRate;
    }

    logger.error("Conversion rate not found", { cryptoCurrency: normalized });
    throw new Error(`Conversion rate not found for ${normalized}`);
  }

  private getConversionRateFromEnv(currency: string): number | null {
    const envKey = `CRYPTO_CONVERSION_RATE_${currency}`;
    const envValue = process.env[envKey];

    if (envValue) {
      const parsed = parseFloat(envValue);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
      logger.warn("Environment conversion rate is invalid", {
        currency,
        envKey,
        envValue,
      });
    }

    const defaultValue = DEFAULT_CONVERSION_RATES[currency];
    return typeof defaultValue === "number" ? defaultValue : null;
  }

  public async calculateTokens(cryptoCurrency: string, usdAmount: number): Promise<CalculateTokensResult> {
    const normalizedCurrency = cryptoCurrency.toUpperCase();
    const rate = await this.getConversionRate(normalizedCurrency);

    if (normalizedCurrency === "USD") {
      const tokens = Math.floor(usdAmount * rate);

      if (tokens <= 0) {
        logger.error("Calculated token amount is not positive", {
          cryptoCurrency: normalizedCurrency,
          usdAmount,
          rate,
        });
        throw new Error("Calculated token amount is invalid. Please try again later.");
      }

      return {
        tokens,
        rate,
        cryptoAmount: usdAmount,
      };
    }

    const estimatedCryptoAmount = await nowPaymentsService.getEstimatedPrice(
      usdAmount,
      "usd",
      normalizedCurrency.toLowerCase()
    );

    if (!Number.isFinite(estimatedCryptoAmount) || estimatedCryptoAmount <= 0) {
      logger.error("Invalid estimated crypto amount", {
        cryptoCurrency: normalizedCurrency,
        usdAmount,
        estimatedCryptoAmount,
      });
      throw new Error("Unable to calculate crypto amount. Please try again later.");
    }

    const tokens = Math.floor(estimatedCryptoAmount * rate);

    if (tokens <= 0) {
      logger.error("Calculated token amount is not positive", {
        cryptoCurrency: normalizedCurrency,
        usdAmount,
        estimatedCryptoAmount,
        rate,
      });
      throw new Error("Calculated token amount is invalid. Please try again later.");
    }

    return {
      tokens,
      rate,
      cryptoAmount: estimatedCryptoAmount,
    };
  }

  public async createDeposit(params: CreateDepositParams): Promise<CryptoTransaction> {
    const { userId, cryptoCurrency, usdAmount } = params;
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      logger.error("User not found when creating crypto deposit", { userId });
      throw new Error("User not found");
    }

    const minDeposit = this.parseEnvNumber(process.env.CRYPTO_DEPOSIT_MIN_USD, 5);
    const maxDeposit = this.parseEnvNumber(process.env.CRYPTO_DEPOSIT_MAX_USD, 5000);

    if (usdAmount < minDeposit) {
      throw new Error(`Minimum deposit amount is ${minDeposit} USD`);
    }

    if (usdAmount > maxDeposit) {
      throw new Error(`Maximum deposit amount is ${maxDeposit} USD`);
    }

    const normalizedCurrency = cryptoCurrency.toUpperCase();
    const { tokens, rate, cryptoAmount } = await this.calculateTokens(normalizedCurrency, usdAmount);
    const orderId = this.generateOrderId(userId);

    const ipnCallbackUrl = nowPaymentsConfig.ipnCallbackUrl;
    if (!ipnCallbackUrl) {
      logger.error("NOWPayments IPN callback URL is not configured");
      throw new Error("NOWPayments IPN callback URL is not configured");
    }

    const paymentResponse = await nowPaymentsService.createPayment({
      price_amount: usdAmount,
      price_currency: "usd",
      pay_currency: normalizedCurrency.toLowerCase(),
      order_id: orderId,
      order_description: `Ludo Game Token Purchase - ${tokens} tokens`,
      ipn_callback_url: ipnCallbackUrl,
      success_url: nowPaymentsConfig.successUrl,
      cancel_url: nowPaymentsConfig.cancelUrl,
    });

    const status = this.mapGatewayStatus(paymentResponse.payment_status);

    const cryptoTransaction = this.cryptoTransactionRepository.create({
      userId,
      user,
      type: CryptoTransactionType.DEPOSIT,
      cryptoCurrency: normalizedCurrency,
      cryptoAmount: this.toDecimalString(cryptoAmount, 8),
      usdAmount: this.toDecimalString(usdAmount, 2),
      gameTokens: tokens,
      conversionRate: this.toDecimalString(rate, 2),
      status,
      paymentStatus: paymentResponse.payment_status,
      paymentId: paymentResponse.payment_id,
      orderId,
      payAddress: paymentResponse.pay_address,
      payAmount: this.toDecimalString(paymentResponse.pay_amount, 8),
      actuallyPaid: this.toNullableDecimal(paymentResponse.amount_received, 8),
      transactionHash: undefined,
      confirmations: 0,
      networkFee: undefined,
      outcomeAmount: this.toNullableDecimal(paymentResponse.amount_received, 8),
      paymentExtraId: paymentResponse.payin_extra_id ?? undefined,
      webhookData: null,
      errorMessage: undefined,
      expiresAt: paymentResponse.expiration_estimate_date
        ? new Date(paymentResponse.expiration_estimate_date)
        : undefined,
    });

    const savedTransaction = await this.cryptoTransactionRepository.save(cryptoTransaction);

    logger.info("Created crypto deposit", {
      userId,
      paymentId: savedTransaction.paymentId,
      orderId: savedTransaction.orderId,
      status: savedTransaction.status,
    });

    return savedTransaction;
  }

  public async processWebhook(payload: any, signature: string): Promise<void> {
    const isValidSignature = nowPaymentsService.verifyIPNSignature(payload, signature);

    if (!isValidSignature) {
      throw new Error("Invalid NOWPayments IPN signature");
    }

    const paymentId = payload?.payment_id;
    const paymentStatus = payload?.payment_status;

    if (!paymentId) {
      logger.error("Webhook payload missing payment_id", { payload });
      throw new Error("Webhook payload missing payment_id");
    }

    const cryptoTransaction = await this.cryptoTransactionRepository.findOne({
      where: { paymentId },
    });

    if (!cryptoTransaction) {
      logger.error("Crypto transaction not found for webhook", { paymentId });
      throw new Error("Transaction not found");
    }

    cryptoTransaction.paymentStatus = paymentStatus;
    cryptoTransaction.actuallyPaid = this.toNullableDecimal(payload?.actually_paid, 8);
    cryptoTransaction.outcomeAmount = this.toNullableDecimal(payload?.outcome_amount, 8);
    cryptoTransaction.payAmount = this.toNullableDecimal(payload?.pay_amount, 8);
    cryptoTransaction.transactionHash = payload?.txid || cryptoTransaction.transactionHash;
    cryptoTransaction.confirmations = this.toInteger(payload?.confirmations, cryptoTransaction.confirmations);
    cryptoTransaction.networkFee = this.toNullableDecimal(payload?.network_fee, 8);
    cryptoTransaction.paymentExtraId = payload?.payin_extra_id || cryptoTransaction.paymentExtraId;
    cryptoTransaction.webhookData = payload;
    cryptoTransaction.status = this.mapGatewayStatus(paymentStatus);
    cryptoTransaction.updatedAt = new Date();

    const updatedTransaction = await this.cryptoTransactionRepository.save(cryptoTransaction);

    if (nowPaymentsService.isSuccessfulPayment(paymentStatus)) {
      await this.creditUserWallet(updatedTransaction);
    }

    logger.info("Processed NOWPayments webhook", {
      paymentId,
      status: paymentStatus,
      transactionStatus: updatedTransaction.status,
    });
  }

  private async creditUserWallet(cryptoTx: CryptoTransaction): Promise<void> {
    if (cryptoTx.confirmedAt) {
      logger.info("Crypto transaction already credited", {
        paymentId: cryptoTx.paymentId,
        transactionId: cryptoTx.id,
      });
      return;
    }

    await AppDataSource.transaction(async (manager) => {
      const cryptoTxRepo = manager.getRepository(CryptoTransaction);
      const walletRepo = manager.getRepository(Wallet);
      const transactionRepo = manager.getRepository(Transaction);
      const userRepo = manager.getRepository(User);

      const freshCryptoTx = await cryptoTxRepo.findOne({
        where: { id: cryptoTx.id },
      });

      if (!freshCryptoTx) {
        throw new Error("Crypto transaction not found during crediting");
      }

      if (freshCryptoTx.confirmedAt) {
        logger.info("Crypto transaction already credited (fresh check)", {
          paymentId: freshCryptoTx.paymentId,
          transactionId: freshCryptoTx.id,
        });
        return;
      }

      const user = await userRepo.findOne({ where: { id: freshCryptoTx.userId } });

      if (!user) {
        throw new Error("User not found during wallet credit");
      }

      let wallet = await walletRepo.findOne({ where: { userId: freshCryptoTx.userId } });

      if (!wallet) {
        wallet = walletRepo.create({
          userId: freshCryptoTx.userId,
          balance: 0,
          winningAmount: 0,
          cashbackAmount: 0,
          totalBalance: 0,
          currency: "INR",
        });
        wallet.user = user;
      }

      const balance = this.toNumber(wallet.balance);
      const winningAmount = this.toNumber(wallet.winningAmount);
      const cashbackAmount = this.toNumber(wallet.cashbackAmount);
      const newBalance = balance + freshCryptoTx.gameTokens;

      wallet.balance = newBalance;
      wallet.totalBalance = newBalance + winningAmount + cashbackAmount;
      wallet.lastUpdated = new Date();

      await walletRepo.save(wallet);

      const transaction = transactionRepo.create({
        amount: freshCryptoTx.gameTokens,
        transactionType: TransactionType.DEPOSIT,
        direction: TransactionDirection.CREDIT,
        category: TransactionCategory.GATEWAY_DEPOSIT,
        status: TransactionStatus.COMPLETED,
        description: `Crypto deposit - ${freshCryptoTx.cryptoAmount} ${freshCryptoTx.cryptoCurrency}`,
        paymentMethod: PaymentMethod.CRYPTO,
        paymentId: freshCryptoTx.paymentId ?? undefined,
        referenceId: freshCryptoTx.paymentId ?? freshCryptoTx.orderId,
        metadata: {
          orderId: freshCryptoTx.orderId,
          currency: freshCryptoTx.cryptoCurrency,
          cryptoCurrency: freshCryptoTx.cryptoCurrency,
          cryptoAmount: freshCryptoTx.cryptoAmount,
          tokensAwarded: freshCryptoTx.gameTokens,
          balanceAfter: this.toNumber(wallet.totalBalance),
        },
        walletId: wallet.id,
        userId: freshCryptoTx.userId,
        wallet,
        user,
        processedAt: new Date(),
        completedAt: new Date(),
      });

      await transactionRepo.save(transaction);

      freshCryptoTx.status = CryptoTransactionStatus.FINISHED;
      freshCryptoTx.confirmedAt = new Date();
      await cryptoTxRepo.save(freshCryptoTx);

      logger.info("Credited user wallet for crypto transaction", {
        paymentId: freshCryptoTx.paymentId,
        userId: freshCryptoTx.userId,
        tokens: freshCryptoTx.gameTokens,
      });
    });
  }

  public async getUserTransactions(userId: string): Promise<CryptoTransaction[]> {
    return this.cryptoTransactionRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  public async getTransactionByPaymentId(paymentId: string): Promise<CryptoTransaction | null> {
    const transaction = await this.cryptoTransactionRepository.findOne({
      where: { paymentId },
      relations: ["user"],
    });
    return transaction ?? null;
  }

  public async checkPaymentStatus(paymentId: string): Promise<CryptoTransaction> {
    const transaction = await this.cryptoTransactionRepository.findOne({
      where: { paymentId },
    });

    if (!transaction) {
      throw new Error("Crypto transaction not found");
    }

    if (nowPaymentsService.isFinalStatus(transaction.paymentStatus ?? "")) {
      return transaction;
    }

    const gatewayStatus = await nowPaymentsService.getPaymentStatus(paymentId);

    transaction.paymentStatus = gatewayStatus.payment_status;
    transaction.actuallyPaid = this.toNullableDecimal(gatewayStatus.actually_paid, 8);
    transaction.outcomeAmount = this.toNullableDecimal(gatewayStatus.outcome_amount, 8);
    transaction.payAmount = this.toNullableDecimal(gatewayStatus.pay_amount, 8);
    transaction.status = this.mapGatewayStatus(gatewayStatus.payment_status);
    transaction.updatedAt = new Date();

    const updatedTransaction = await this.cryptoTransactionRepository.save(transaction);

    if (nowPaymentsService.isSuccessfulPayment(gatewayStatus.payment_status)) {
      await this.creditUserWallet(updatedTransaction);
    }

    logger.info("Checked NOWPayments status", {
      paymentId,
      status: gatewayStatus.payment_status,
      transactionStatus: updatedTransaction.status,
    });

    return updatedTransaction;
  }

  public async getSupportedCurrencies(): Promise<Array<{ currency: string; rate: number | null; minAmount?: number | null; maxAmount?: number | null; details?: Record<string, unknown> }>> {
    const [remoteCurrencies, rates] = await Promise.all([
      nowPaymentsService.getAvailableCurrencies({ fixedRate: true }),
      this.conversionRateRepository.find({ where: { isActive: true } }),
    ]);

    const rateMap = new Map<string, number>();

    for (const rate of rates) {
      const key = rate.cryptoCurrency.toUpperCase();
      const value = typeof rate.tokensPerUnit === "string" ? parseFloat(rate.tokensPerUnit) : rate.tokensPerUnit;
      if (Number.isFinite(value)) {
        rateMap.set(key, value);
      }
    }

    for (const [key, value] of Object.entries(DEFAULT_CONVERSION_RATES)) {
      if (!rateMap.has(key)) {
        rateMap.set(key, value);
      }
    }

    // Allow environment overrides even when DB is missing an entry.
    for (const key of Object.keys(DEFAULT_CONVERSION_RATES)) {
      const envRate = this.getConversionRateFromEnv(key);
      if (envRate !== null) {
        rateMap.set(key, envRate);
      }
    }

    const response = remoteCurrencies.map((currencyInfo) => {
      const currencyCode = currencyInfo.currency.toUpperCase();
      return {
        currency: currencyCode,
        rate: rateMap.get(currencyCode) ?? null,
        minAmount: currencyInfo.minAmount ?? null,
        maxAmount: currencyInfo.maxAmount ?? null,
        details: currencyInfo.details,
      };
    });

    for (const [currency, value] of rateMap.entries()) {
      const exists = response.some((item) => item.currency === currency);
      if (!exists) {
        response.push({
          currency,
          rate: value,
          minAmount: null,
          maxAmount: null,
          details: undefined,
        });
      }
    }

    return response.sort((a, b) => a.currency.localeCompare(b.currency));
  }

  private mapGatewayStatus(status: string): CryptoTransactionStatus {
    const normalized = status?.toLowerCase();

    switch (normalized) {
      case "waiting":
        return CryptoTransactionStatus.WAITING;
      case "confirming":
        return CryptoTransactionStatus.CONFIRMING;
      case "confirmed":
        return CryptoTransactionStatus.CONFIRMED;
      case "sending":
        return CryptoTransactionStatus.SENDING;
      case "finished":
        return CryptoTransactionStatus.FINISHED;
      case "failed":
        return CryptoTransactionStatus.FAILED;
      case "refunded":
        return CryptoTransactionStatus.REFUNDED;
      case "expired":
        return CryptoTransactionStatus.EXPIRED;
      default:
        return CryptoTransactionStatus.PENDING;
    }
  }

  private generateOrderId(userId: string): string {
    return `LUDO-${userId.substring(0, 8).toUpperCase()}-${Date.now()}`;
  }

  private parseEnvNumber(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }

    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private toDecimalString(value: number | string, precision: number): string {
    const numericValue = typeof value === "string" ? parseFloat(value) : value;
    if (!Number.isFinite(numericValue)) {
      throw new Error("Invalid numeric value");
    }
    return numericValue.toFixed(precision);
  }

  private toNullableDecimal(value: number | string | null | undefined, precision: number): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    const numericValue = typeof value === "string" ? parseFloat(value) : value;
    if (!Number.isFinite(numericValue)) {
      return undefined;
    }
    return numericValue.toFixed(precision);
  }

  private toInteger(value: number | string | null | undefined, fallback = 0): number {
    if (value === null || value === undefined) {
      return fallback;
    }
    const numericValue = typeof value === "string" ? parseInt(value, 10) : value;
    return Number.isFinite(numericValue) ? numericValue : fallback;
  }

  private toNumber(value: number | string | undefined): number {
    if (value === undefined) {
      return 0;
    }
    if (typeof value === "number") {
      return value;
    }
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}

export const cryptoPaymentService = new CryptoPaymentService();
