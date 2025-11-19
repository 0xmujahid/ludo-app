import axios, { AxiosInstance } from "axios";
import { createHmac } from "crypto";
import { logger } from "../utils/logger";
import { nowPaymentsConfig } from "../config/nowPayments";

const enum NOWPaymentsEndpoints {
  CURRENCIES = "/currencies",
  MIN_AMOUNT = "/min-amount",
  ESTIMATE = "/estimate",
  PAYMENT = "/payment",
}

type Primitive = string | number | boolean | null | undefined;

export interface CreatePaymentParams {
  price_amount: number;
  price_currency: string;
  pay_currency: string;
  order_id: string;
  order_description: string;
  ipn_callback_url: string;
  success_url?: string;
  cancel_url?: string;
}

export interface PaymentResponse {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  ipn_callback_url: string;
  created_at: string;
  updated_at: string;
  purchase_id: string;
  amount_received: number;
  payin_extra_id: string | null;
  expiration_estimate_date: string;
}

export interface PaymentStatusResponse {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  outcome_amount: number;
  outcome_currency: string;
  created_at: string;
  updated_at: string;
}

export interface NowPaymentsCurrencyInfo {
  currency: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  details?: Record<string, unknown>;
}

export interface GetCurrenciesOptions {
  fixedRate?: boolean;
  includeFiat?: boolean;
}

class NOWPaymentsService {
  private readonly client: AxiosInstance;
  private readonly ipnSecret: string | undefined;
  private readonly finalStatuses = new Set(["finished", "failed", "refunded", "expired"]);

  constructor() {
    const { baseUrl, apiKey, ipnSecret, sandbox } = nowPaymentsConfig;
    this.ipnSecret = ipnSecret;

    if (!baseUrl) {
      logger.warn("NOWPayments base URL is not configured; requests may fail");
    }

    if (!apiKey) {
      logger.warn("NOWPayments API key is not configured; set NOWPAYMENTS_API_KEY or sandbox variant");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }

    if (sandbox) {
      headers["X-Nowpayments-Sandbox"] = "1";
    }

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers,
    });
  }

  public async getAvailableCurrencies(options?: GetCurrenciesOptions): Promise<NowPaymentsCurrencyInfo[]> {
    try {
      const params: Record<string, string> = {};

      if (typeof options?.fixedRate === "boolean") {
        params.fixed_rate = options.fixedRate ? "true" : "false";
      }

      if (typeof options?.includeFiat === "boolean") {
        params.include_fiat = options.includeFiat ? "true" : "false";
      }

      const response = await this.client.get(NOWPaymentsEndpoints.CURRENCIES, {
        params: Object.keys(params).length > 0 ? params : undefined,
      });

      const payload = response.data;
      const items: unknown[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.currencies)
        ? payload.currencies
        : [];

      const result: NowPaymentsCurrencyInfo[] = [];

      for (const entry of items) {
        const normalized = this.normalizeCurrency(entry);
        if (normalized) {
          result.push(normalized);
        }
      }

      if (result.length === 0) {
        logger.warn("NOWPayments /currencies returned an empty list", {
          payloadSample: Array.isArray(items) ? items.slice(0, 5) : items,
        });
      }

      return result;
    } catch (error) {
      logger.error("Failed to fetch NOWPayments currencies", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async getMinimumPaymentAmount(currency: string): Promise<number> {
    try {
      const response = await this.client.get<{ min_amount: number | string }>(
        NOWPaymentsEndpoints.MIN_AMOUNT,
        {
          params: {
            currency_from: "usd",
            currency_to: currency,
          },
        }
      );

      const rawAmount = response.data?.min_amount;
      const amount = typeof rawAmount === "string" ? parseFloat(rawAmount) : rawAmount;

      if (typeof amount !== "number" || Number.isNaN(amount)) {
        logger.warn("Invalid min_amount received from NOWPayments", {
          currency,
          rawAmount,
        });
        throw new Error("Invalid min amount received from NOWPayments");
      }

      return amount;
    } catch (error) {
      logger.error("Failed to fetch NOWPayments minimum payment amount", {
        currency,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async getEstimatedPrice(amount: number, currencyFrom: string, currencyTo: string): Promise<number> {
    try {
      const response = await this.client.get<{ estimated_amount: number | string }>(
        NOWPaymentsEndpoints.ESTIMATE,
        {
          params: {
            amount,
            currency_from: currencyFrom,
            currency_to: currencyTo,
          },
        }
      );

      const rawAmount = response.data?.estimated_amount;
      const estimated = typeof rawAmount === "string" ? parseFloat(rawAmount) : rawAmount;

      if (typeof estimated !== "number" || Number.isNaN(estimated)) {
        logger.warn("Invalid estimated_amount received from NOWPayments", {
          amount,
          currencyFrom,
          currencyTo,
          rawAmount,
        });
        throw new Error("Invalid estimated amount received from NOWPayments");
      }

      return estimated;
    } catch (error) {
      logger.error("Failed to fetch NOWPayments estimated price", {
        amount,
        currencyFrom,
        currencyTo,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    try {
      const response = await this.client.post<PaymentResponse>(NOWPaymentsEndpoints.PAYMENT, params);
      logger.info("NOWPayments payment created", {
        paymentId: response.data.payment_id,
        orderId: params.order_id,
      });
      return response.data;
    } catch (error) {
      logger.error("Failed to create NOWPayments payment", {
        params,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await this.client.get<PaymentStatusResponse>(`${NOWPaymentsEndpoints.PAYMENT}/${paymentId}`);
      return response.data;
    } catch (error) {
      logger.error("Failed to fetch NOWPayments payment status", {
        paymentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public verifyIPNSignature(payload: unknown, signature: string): boolean {
    if (!this.ipnSecret) {
      logger.warn("NOWPayments IPN secret is not configured; cannot verify signature");
      return false;
    }

    if (!signature) {
      logger.warn("Missing NOWPayments IPN signature header");
      return false;
    }

    try {
      const sortedPayload = this.sortObject(payload);
      const payloadString = JSON.stringify(sortedPayload);
      const expectedSignature = createHmac("sha512", this.ipnSecret).update(payloadString).digest("hex");
      const normalizedSignature = String(signature).toLowerCase();

      const isValid = expectedSignature === normalizedSignature;

      if (!isValid) {
        logger.warn("Invalid NOWPayments IPN signature", {
          expectedSignature,
          providedSignature: signature,
        });
      }

      return isValid;
    } catch (error) {
      logger.error("Failed to verify NOWPayments IPN signature", {
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  public sortObject<T>(value: T): T {
    if (Array.isArray(value)) {
      return value.map((item) => this.sortObject(item)) as unknown as T;
    }

    if (value instanceof Date) {
      return value.toISOString() as unknown as T;
    }

    if (Buffer.isBuffer(value)) {
      return value.toString("utf8") as unknown as T;
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, val]) => [key, this.sortObject(val)]);

      return Object.fromEntries(entries) as T;
    }

    return value;
  }

  public isFinalStatus(status: string): boolean {
    return this.finalStatuses.has(status.toLowerCase());
  }

  public isSuccessfulPayment(status: string): boolean {
    return status.toLowerCase() === "finished";
  }

  private normalizeCurrency(entry: unknown): NowPaymentsCurrencyInfo | null {
    if (typeof entry === "string") {
      return { currency: entry.toUpperCase() };
    }

    if (!entry || typeof entry !== "object") {
      return null;
    }

    const record = entry as Record<string, unknown>;
    const currencyValue = record.currency || record.code || record.symbol;

    if (!currencyValue) {
      return null;
    }

    const minAmountRaw = record.min_amount ?? record.minAmount;
    const maxAmountRaw = record.max_amount ?? record.maxAmount;

    const minAmount = this.parseNumber(minAmountRaw);
    const maxAmount = this.parseNumber(maxAmountRaw);

    const { currency, min_amount, max_amount, minAmount: _m1, maxAmount: _m2, ...rest } = record;

    const details = Object.keys(rest).length > 0 ? rest : undefined;

    return {
      currency: String(currencyValue).toUpperCase(),
      minAmount,
      maxAmount,
      details,
    };
  }

  private parseNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const numeric = typeof value === "number" ? value : parseFloat(String(value));
    return Number.isFinite(numeric) ? numeric : null;
  }
}

export const nowPaymentsService = new NOWPaymentsService();
