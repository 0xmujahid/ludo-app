export interface NowPaymentsConfig {
  sandbox: boolean;
  apiKey?: string;
  baseUrl: string;
  ipnSecret?: string;
  ipnCallbackUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
}

const DEFAULT_API_BASE_URL = "https://api.nowpayments.io/v1";
const DEFAULT_SANDBOX_API_BASE_URL = "https://api-sandbox.nowpayments.io/v1";

const sandboxEnv = process.env.NOWPAYMENTS_SANDBOX;
const sandbox = sandboxEnv ? sandboxEnv.toLowerCase() === "true" : true;

const sandboxApiBaseUrl = process.env.NOWPAYMENTS_SANDBOX_API_BASE_URL || DEFAULT_SANDBOX_API_BASE_URL;
const productionApiBaseUrl = process.env.NOWPAYMENTS_API_BASE_URL || DEFAULT_API_BASE_URL;

const sandboxApiKey = process.env.NOWPAYMENTS_SANDBOX_API_KEY;
const productionApiKey = process.env.NOWPAYMENTS_API_KEY;

const sandboxIpnSecret = process.env.NOWPAYMENTS_SANDBOX_IPN_SECRET;
const productionIpnSecret = process.env.NOWPAYMENTS_IPN_SECRET;

const backendUrl = process.env.BACKEND_URL;
const defaultIpnCallbackUrl = backendUrl ? `${backendUrl}/api/crypto/webhook` : undefined;
const ipnCallbackUrl = process.env.NOWPAYMENTS_IPN_CALLBACK_URL || defaultIpnCallbackUrl;

const resolvedSuccessUrl = process.env.NOWPAYMENTS_SUCCESS_URL || (process.env.APP_URL ? `${process.env.APP_URL}/payment/success` : undefined);
const resolvedCancelUrl = process.env.NOWPAYMENTS_CANCEL_URL || (process.env.APP_URL ? `${process.env.APP_URL}/payment/cancel` : undefined);

export const nowPaymentsConfig: NowPaymentsConfig = {
  sandbox,
  apiKey: sandbox ? sandboxApiKey || productionApiKey : productionApiKey || sandboxApiKey,
  baseUrl: sandbox ? sandboxApiBaseUrl : productionApiBaseUrl,
  ipnSecret: sandbox ? sandboxIpnSecret || productionIpnSecret : productionIpnSecret || sandboxIpnSecret,
  ipnCallbackUrl,
  successUrl: resolvedSuccessUrl,
  cancelUrl: resolvedCancelUrl,
};
