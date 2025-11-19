import PaytmChecksum from "paytmchecksum";
import {
  TransactionStatus,
  PaytmPaymentInit,
  PaytmCallbackData,
  PaymentGatewayResponse,
} from "../types/payment";

// Paytm configuration interface
interface PaytmConfig {
  MERCHANT_ID: string;
  MERCHANT_KEY: string;
  WEBSITE: string;
  INDUSTRY_TYPE: string;
  CHANNEL_ID: string;
  CALLBACK_URL: string;
  ENVIRONMENT: "test" | "production";
}

// Initialize Paytm configuration
const PAYTM_CONFIG: PaytmConfig = {
  MERCHANT_ID: process.env.PAYTM_MID || "",
  MERCHANT_KEY: process.env.PAYTM_MERCHANT_KEY || "",
  WEBSITE: process.env.PAYTM_WEBSITE || "",
  INDUSTRY_TYPE: process.env.PAYTM_INDUSTRY_TYPE || "",
  CHANNEL_ID: "WEB",
  CALLBACK_URL: `${process.env.API_BASE_URL}/payment/callback`,
  ENVIRONMENT: (process.env.PAYTM_ENVIRONMENT || "test") as
    | "test"
    | "production",
};

// Helper functions
const validatePaytmConfig = () => {
  const requiredFields = [
    "MERCHANT_ID",
    "MERCHANT_KEY",
    "WEBSITE",
    "INDUSTRY_TYPE",
  ];
  const missingFields = requiredFields.filter(
    (field) => !PAYTM_CONFIG[field as keyof PaytmConfig]
  );

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required Paytm configuration: ${missingFields.join(", ")}`
    );
  }
};

const getPaytmUrl = (endpoint: string): string => {
  const baseUrl =
    PAYTM_CONFIG.ENVIRONMENT === "production"
      ? "https://securegw.paytm.in"
      : "https://securegw-stage.paytm.in";
  return `${baseUrl}${endpoint}`;
};

// Main service functions
export const initiatePaytmPayment = async (
  init: PaytmPaymentInit
): Promise<PaytmPaymentInit> => {
  try {
    validatePaytmConfig();

    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(init.params),
      PAYTM_CONFIG.MERCHANT_KEY
    );

    return {
      action: getPaytmUrl("/order/process"),
      params: {
        ...init.params,
        CHECKSUMHASH: checksum,
        // UPI specific parameters
        UPI_ID: init.params.UPI_ID || "", // UPI ID from the request
        // Other parameters remain unchanged
      },
      environment: init.environment,
      gatewayResponse: {
        code: "SUCCESS",
        message: "Payment initiation successful",
        url: getPaytmUrl("/order/process"),
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      action: "",
      params: init.params,
      environment: init.environment,
      error: "INITIATION_FAILED",
      message:
        error instanceof Error ? error.message : "Failed to initiate payment",
    };
  }
};

export const verifyPayment = async (
  orderId: string,
  params: PaytmCallbackData
): Promise<PaymentGatewayResponse> => {
  try {
    const isValid = await PaytmChecksum.verifySignature(
      JSON.stringify(params),
      PAYTM_CONFIG.MERCHANT_KEY,
      params.CHECKSUMHASH
    );

    if (!isValid) {
      throw new Error("Invalid checksum");
    }

    let status: TransactionStatus;
    switch (params.STATUS) {
      case "TXN_SUCCESS":
        status = TransactionStatus.COMPLETED;
        break;
      case "PENDING":
        status = TransactionStatus.PENDING;
        break;
      default:
        status = TransactionStatus.FAILED;
    }

    return {
      code: params.RESPCODE,
      message: params.RESPMSG,
      transactionId: params.TXNID,
      gatewayTransactionId: params.BANKTXNID,
      paymentMode: params.PAYMENTMODE,
      bankName: params.BANKNAME,
      timestamp: params.TXNDATE || new Date().toISOString(),
      status,
    };
  } catch (error) {
    throw new Error(
      `Payment verification failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};
