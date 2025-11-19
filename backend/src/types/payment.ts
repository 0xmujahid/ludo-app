// Standardized enums and types for all payment and transaction operations

// Transaction Types and Statuses
export enum TransactionType {
  DEPOSIT = "DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
  GAME_ENTRY = "GAME_ENTRY",
  GAME_WINNING = "GAME_WINNING",
  TOURNAMENT_ENTRY = "TOURNAMENT_ENTRY",
  TOURNAMENT_WINNING = "TOURNAMENT_WINNING",
  REFUND = "REFUND",
  ADJUSTMENT = "ADJUSTMENT",
  DEDUCTED = "DEDUCTED", // For any amount deducted from wallet
  BONUS = "BONUS", // For bonus amounts like referral bonus, welcome bonus
  CASHBACK = "CASHBACK", // For cashback amounts
  FEE = "FEE", // For platform fees, TDS, etc.
  PENALTY = "PENALTY", // For penalty deductions
  REVERSAL = "REVERSAL", // For transaction reversals
}

export enum TransactionStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
  EXPIRED = "EXPIRED",
}

export enum PaymentMethod {
  PAYTM = "PAYTM",
  UPI = "UPI",
  BANK_TRANSFER = "BANK_TRANSFER",
  WALLET = "WALLET",
  MANUAL = "MANUAL",
  SYSTEM = "SYSTEM", // For internal system transactions
  PHONEPE = "PHONEPE",
  RAZORPAY = "RAZORPAY",
  CRYPTO = "CRYPTO",
}

// Add WebhookRequest interface definition
export interface WebhookRequest {
  webhookProvider: string;
  body: any;
  headers: {
    [key: string]: string | string[] | undefined;
  };
  rawBody?: string;
}

// Wallet Load Types
export interface WalletLoadRequest {
  userId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  currency?: string;
  metadata?: {
    email?: string;
    phone?: string;
    utrNumber?: string;
    upiId?: string;
    bankName?: string;
    accountHolder?: string;
    transactionReference?: string;
    remarks?: string;
  };
}

export interface ManualPaymentDetails {
  utrNumber: string;
  upiId: string;
  bankName?: string;
  accountHolder?: string;
  transactionReference?: string;
  amount: number;
  timestamp: string;
}

// Common payment interfaces
export interface PaymentGatewayConfig {
  merchantId: string;
  merchantKey: string;
  environment: "test" | "production";
  website?: string;
  industryType?: string;
  channelId?: string;
  webhookSecret?: string;
  callbackUrl?: string;
  returnUrl?: string;
}


// Payment Details Interface
export interface PaymentDetails {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  description?: string;
  utrNumber?: string;
  orderId?: string; // Optional during initiation, required in response
  gatewayResponse?: PaymentGatewayResponse;
  metadata?: PaymentMetadata;
  email?: string;
  phone?: string;
}

// Payment Metadata Interface
export interface PaymentMetadata {
  orderId: string;
  currency?: string;
  initiatedAt?: string;
  utrNumber?: string;
  gameId?: string;
  tournamentId?: string;
  lastError?: string | null;
  email?: string;
  phone?: string;
  gatewayResponse?: Omit<PaymentGatewayResponse, "orderId"> & {
    verificationAttempts?: number;
    lastVerificationAttempt?: string;
  };
  manualPaymentDetails?: {
    utrNumber: string;
    upiId?: string;
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    ifscCode?: string;
    transactionReference?: string;
    verificationAttempts?: number;
    lastVerificationAttempt?: string;
    verifierNotes?: string;
    adminId?: string;
    remarks?: string;
    screenshots?: string[];
    verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
    verifiedBy?: string;
    verifiedAt?: string; // Changed from Date to string for consistency
  };
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  gameType?: string;
  cashbackUsed?: number;
  balanceUsed?: number;
  position?: number;
  // Fee information
  fee?: number;
  totalAmount?: number;
  feeApplied?: boolean;
  feePercentage?: number;
  // Crypto payment metadata
  cryptoCurrency?: string;
  cryptoAmount?: string | number;
  tokensAwarded?: number;
  balanceAfter?: number;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  orderId: string;
  status: TransactionStatus;
  message?: string;
  gatewayResponse?: PaymentGatewayResponse;
  metadata?: Record<string, any>;
}

// Payment Gateway Response Interface (Updated)
export interface PaymentGatewayResponse {
  code: string;
  message: string;
  orderId?: string;
  transactionId?: string;
  gatewayTransactionId?: string;
  status?: TransactionStatus;
  error?: string;
  timestamp: string; // Always required in ISO format
  paymentMode?: string;
  bankName?: string;
  params?: Record<string, any>; // For gateway-specific parameters
  url?: string; // For redirect URLs
  verificationAttempts?: number;
  lastVerificationAttempt?: string;
  verifiedAt?: string;
  verificationDetails?: {
    timestamp: string;
    status: string;
    adminId?: string;
    notes?: string;
  };
}

// Paytm specific interfaces
export interface PaytmCallbackData extends PaytmResponse {
  CHECKSUMHASH: string;
}
// Paytm specific interfaces
export interface PaytmConfig {
  merchantId: string;
  merchantKey: string;
  website: string;
  industryType: string;
  channelId: string;
  environment: "test" | "production";
  webhookSecret?: string;
}

export interface PaytmPaymentInit {
  action: string;
  params: PaytmPaymentParams;
  environment: "test" | "production";
  error?: string;
  message?: string;
  gatewayResponse?: PaymentGatewayResponse;
}

export interface PaytmPaymentParams {
  MID: string;
  ORDER_ID: string;
  CUST_ID: string;
  INDUSTRY_TYPE_ID: string;
  CHANNEL_ID: string;
  TXN_AMOUNT: string;
  WEBSITE: string;
  CALLBACK_URL: string;
  EMAIL?: string;
  MOBILE_NO?: string;
  CHECKSUMHASH: string;
  UPI_ID?: string; // Added UPI_ID for UPI payments
}

// Add PaytmResponse interface
export interface PaytmResponse {
  MID: string;
  ORDERID: string;
  TXNAMOUNT: string;
  CURRENCY: string;
  TXNID?: string;
  BANKTXNID?: string;
  STATUS: string;
  RESPCODE: string;
  RESPMSG: string;
  TXNDATE?: string;
  GATEWAYNAME?: string;
  BANKNAME?: string;
  PAYMENTMODE?: string;
  CHECKSUMHASH: string;
}


// Webhook related types
export enum WebhookEventType {
  PAYMENT = 'payment',
  GAME_STATE = 'game_state',
  TOURNAMENT_UPDATE = 'tournament_update',
  PLAYER_ACTION = 'player_action'
}

// Base webhook payload
export interface BaseWebhookPayload {
  eventType: WebhookEventType;
  status: string;
}

// Payment specific webhook payload
export interface PaymentWebhookPayload extends BaseWebhookPayload {
  eventType: WebhookEventType.PAYMENT;
  orderId: string;
  transactionId?: string;
  paymentMethod: PaymentMethod;
  gatewayResponse?: PaymentGatewayResponse;
}

// Game state specific webhook payload
export interface GameStateWebhookPayload extends BaseWebhookPayload {
  eventType: WebhookEventType.GAME_STATE;
  gameId: string;
  data: any;
}

// Tournament specific webhook payload
export interface TournamentWebhookPayload extends BaseWebhookPayload {
  eventType: WebhookEventType.TOURNAMENT_UPDATE;
  tournamentId: string;
  data: any;
}

// Combined webhook payload type
export type WebhookPayload = PaymentWebhookPayload | GameStateWebhookPayload | TournamentWebhookPayload;


// Payment statistics types
export interface PaymentStats {
  totalTransactions: number;
  totalAmount: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  averageTransactionAmount: number;
  transactionsByMethod: Record<PaymentMethod, number>;
  transactionsByStatus: Record<TransactionStatus, number>;
  dailyTransactions: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
}
// Transaction Direction - whether money is coming in or going out
export enum TransactionDirection {
  CREDIT = "CREDIT", // Money added to wallet (deposit, winning, bonus, refund, etc.)
  DEBIT = "DEBIT",   // Money deducted from wallet (withdrawal, entry fee, penalty, etc.)
}

// Transaction Category - specific categorization for transaction purpose
export enum TransactionCategory {
  // Money addition categories
  WALLET_LOAD = "WALLET_LOAD",           // Manual deposit/wallet loading
  GATEWAY_DEPOSIT = "GATEWAY_DEPOSIT",   // Payment gateway deposits
  GAME_PRIZE = "GAME_PRIZE",             // Game winning amount
  TOURNAMENT_PRIZE = "TOURNAMENT_PRIZE", // Tournament winning amount
  REFERRAL_BONUS = "REFERRAL_BONUS",     // Referral bonuses
  WELCOME_BONUS = "WELCOME_BONUS",       // Welcome/signup bonus
  CASHBACK_CREDIT = "CASHBACK_CREDIT",   // Cashback amount
  DEPOSIT_BONUS = "DEPOSIT_BONUS",       // Deposit bonus amount
  LOYALTY_REWARD = "LOYALTY_REWARD",     // Loyalty program rewards
  PROMOTIONAL_BONUS = "PROMOTIONAL_BONUS", // Promotional credits
  REFUND_CREDIT = "REFUND_CREDIT",       // Refund amounts
  
  // Money deduction categories  
  WALLET_WITHDRAWAL = "WALLET_WITHDRAWAL", // Withdrawal from wallet
  GAME_ENTRY_FEE = "GAME_ENTRY_FEE",      // Game entry fees
  TOURNAMENT_FEE = "TOURNAMENT_FEE",       // Tournament entry fees
  PLATFORM_FEE = "PLATFORM_FEE",          // Platform commission
  TDS_DEDUCTION = "TDS_DEDUCTION",         // Tax deduction at source
  GST_CHARGE = "GST_CHARGE",               // GST charges
  PROCESSING_FEE = "PROCESSING_FEE",       // Processing fees
  PENALTY_CHARGE = "PENALTY_CHARGE",       // Penalty deductions
  REVERSAL_DEBIT = "REVERSAL_DEBIT",       // Transaction reversals
  
  // Administrative categories
  MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT", // Manual wallet adjustments by admin
  SYSTEM_CORRECTION = "SYSTEM_CORRECTION", // System error corrections
}
