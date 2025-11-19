import {
  PaymentDetails,
  PaymentGatewayConfig,
  PaymentGatewayResponse,
  PaytmConfig,
  PaytmPaymentParams,
  PaytmResponse,
  TransactionStatus,
  PaymentMethod,
} from "../types/payment";

export class PaymentGatewayService {
  private config: PaymentGatewayConfig;
  private PaytmChecksum: any;

  constructor() {
    this.config = {
      merchantId: process.env.PAYTM_MERCHANT_ID || "",
      merchantKey: process.env.PAYTM_MERCHANT_KEY || "",
      environment:
        process.env.NODE_ENV === "production" ? "production" : "test",
    };

    try {
      this.PaytmChecksum = require("paytmchecksum");
    } catch (error) {
      console.warn("Paytm checksum module not loaded:", error);
    }
  }

  getConfig(): PaymentGatewayConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<PaymentGatewayConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  private getPaytmConfig(): PaytmConfig {
    return {
      merchantId: this.config.merchantId,
      merchantKey: this.config.merchantKey,
      website: this.config.environment === "test" ? "WEBSTAGING" : "DEFAULT",
      industryType: "Retail",
      channelId: "WEB",
      environment: this.config.environment,
    };
  }

  private getPaytmUrl(): string {
    const baseUrl =
      this.config.environment === "test"
        ? "https://securegw-stage.paytm.in"
        : "https://securegw.paytm.in";
    return `${baseUrl}/theia/api/v1/initiateTransaction`;
  }

  private mapPaytmStatus(paytmStatus: string): TransactionStatus {
    const statusMap: { [key: string]: TransactionStatus } = {
      TXN_SUCCESS: TransactionStatus.COMPLETED,
      PENDING: TransactionStatus.PENDING,
      TXN_FAILURE: TransactionStatus.FAILED,
      CANCELLED: TransactionStatus.CANCELLED,
    };
    return statusMap[paytmStatus] || TransactionStatus.FAILED;
  }

  private validateConfig(): void {
    if (!this.config.merchantId || !this.config.merchantKey) {
      throw new Error("Payment gateway configuration is incomplete");
    }
  }

  async initiatePayment(
    details: PaymentDetails,
  ): Promise<PaymentGatewayResponse> {
    try {
      this.validateConfig();
      const metadata = details.metadata;

      // For test environment, return mock response
      if (this.config.environment === "test") {
        return {
          code: "PAYMENT_INITIATED",
          message: "Payment initiated successfully (Test Mode)",
          orderId: details.orderId,
          transactionId: `TXN_${Date.now()}`,
          status: TransactionStatus.PENDING,
          timestamp: new Date().toISOString(),
        };
      }

      // Prepare Paytm parameters
      const paytmConfig = this.getPaytmConfig();
      const params: PaytmPaymentParams = {
        MID: paytmConfig.merchantId,
        ORDER_ID: details.orderId || "",
        CUST_ID: details.userId,
        INDUSTRY_TYPE_ID: paytmConfig.industryType,
        CHANNEL_ID: paytmConfig.channelId,
        TXN_AMOUNT: details.amount.toString(),
        WEBSITE: paytmConfig.website,
        CALLBACK_URL: `${process.env.API_BASE_URL}/api/payments/paytm/callback`,
        EMAIL: metadata?.email,
        MOBILE_NO: metadata?.phone,
        CHECKSUMHASH: "",
      };

      if (!this.PaytmChecksum) {
        throw new Error("Paytm checksum module not initialized");
      }

      // Generate checksum
      const checksum = await this.PaytmChecksum.generateSignature(
        JSON.stringify(params),
        this.config.merchantKey,
      );
      params.CHECKSUMHASH = checksum;

      return {
        code: "PAYMENT_INITIATED",
        message: "Payment initiated successfully",
        orderId: details.orderId,
        transactionId: `TXN_${Date.now()}`,
        status: TransactionStatus.PENDING,
        timestamp: new Date().toISOString(),
        params,
        url: this.getPaytmUrl(),
      };
    } catch (error) {
      console.error("Payment gateway error:", error);
      return {
        code: "ERROR",
        message:
          error instanceof Error ? error.message : "Payment initiation failed",
        error: "GATEWAY_ERROR",
        timestamp: new Date().toISOString(),
      };
    }
  }

  async verifyPayment(
    orderId: string,
    gatewayResponse: PaytmResponse,
  ): Promise<PaymentGatewayResponse> {
    try {
      this.validateConfig();

      if (this.config.environment === "test") {
        return {
          code: "PAYMENT_VERIFIED",
          message: "Payment verified successfully (Test Mode)",
          orderId,
          transactionId: gatewayResponse.TXNID,
          gatewayTransactionId: gatewayResponse.BANKTXNID,
          status: TransactionStatus.COMPLETED,
          timestamp: new Date().toISOString(),
        };
      }

      if (!this.PaytmChecksum) {
        throw new Error("Paytm checksum module not initialized");
      }

      // Verify checksum
      const isValidChecksum = await this.PaytmChecksum.verifySignature(
        JSON.stringify(gatewayResponse),
        this.config.merchantKey,
        gatewayResponse.CHECKSUMHASH,
      );

      if (!isValidChecksum) {
        throw new Error("Invalid checksum");
      }

      // Map Paytm status to our transaction status
      const status = this.mapPaytmStatus(gatewayResponse.STATUS);

      return {
        code:
          status === TransactionStatus.COMPLETED
            ? "PAYMENT_VERIFIED"
            : "PAYMENT_FAILED",
        message: gatewayResponse.RESPMSG || "Payment verification completed",
        orderId,
        transactionId: gatewayResponse.TXNID,
        gatewayTransactionId: gatewayResponse.BANKTXNID,
        status,
        timestamp: new Date().toISOString(),
        paymentMode: gatewayResponse.PAYMENTMODE,
        bankName: gatewayResponse.BANKNAME,
      };
    } catch (error) {
      console.error("Payment verification error:", error);
      return {
        code: "ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Payment verification failed",
        error: "VERIFICATION_ERROR",
        orderId,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const paymentGatewayService = new PaymentGatewayService();
