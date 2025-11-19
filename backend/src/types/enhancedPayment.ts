// Enhanced Payment Metadata Interface with comprehensive transaction type support
export interface EnhancedPaymentMetadata {
  orderId: string;
  currency: string;
  initiatedAt: string;
  utrNumber?: string;
  gameId?: string;
  tournamentId?: string;
  lastError?: string | null;
  email?: string;
  phone?: string;
  gatewayResponse?: any;
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
    verifiedAt?: string;
  };
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  gameType?: string;
  cashbackUsed?: number;
  balanceUsed?: number;
  position?: number;
  
  // Enhanced fields for different transaction types
  withdrawalDetails?: {
    beneficiaryName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    upiId?: string;
    withdrawalMethod?: "BANK" | "UPI";
    processingTime?: string;
    charges?: number;
    netAmount?: number;
  };
  
  depositDetails?: {
    sourceBank?: string;
    depositMethod?: "ONLINE" | "MANUAL" | "UPI";
    bonusAmount?: number;
    originalAmount?: number;
    processingFee?: number;
  };
  
  gameDetails?: {
    gameId?: string;
    gameType?: string;
    entryFee?: number;
    winningAmount?: number;
    rank?: number;
    totalPlayers?: number;
    gameMode?: string;
  };
  
  tournamentDetails?: {
    tournamentId?: string;
    tournamentName?: string;
    entryFee?: number;
    prizePool?: number;
    winningAmount?: number;
    rank?: number;
    totalParticipants?: number;
  };
  
  refundDetails?: {
    originalTransactionId?: string;
    refundReason?: string;
    refundType?: "FULL" | "PARTIAL";
    originalAmount?: number;
    refundAmount?: number;
    refundMethod?: string;
  };
  
  bonusDetails?: {
    bonusType?: "REFERRAL" | "WELCOME" | "CASHBACK" | "PROMOTIONAL";
    sourceTransactionId?: string;
    referralCode?: string;
    bonusPercentage?: number;
    maxBonusAmount?: number;
    validityPeriod?: string;
  };
  
  feeDetails?: {
    feeType?: "PLATFORM" | "TDS" | "PROCESSING" | "GATEWAY";
    feePercentage?: number;
    baseFee?: number;
    calculatedOn?: number;
    exemptionReason?: string;
  };
  
  reversalDetails?: {
    originalTransactionId?: string;
    reversalReason?: string;
    reversalType?: "TECHNICAL" | "DISPUTE" | "CHARGEBACK" | "MANUAL";
    reversalAmount?: number;
    reversalInitiatedBy?: string;
  };
  
  // Audit and tracking fields
  ipAddress?: string;
  deviceInfo?: string;
  userAgent?: string;
  geoLocation?: {
    country?: string;
    state?: string;
    city?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  
  // Risk management fields  
  riskScore?: number;
  riskFactors?: string[];
  fraudCheckPassed?: boolean;
  velocityCheckPassed?: boolean;
  
  // Additional tracking
  campaignId?: string;
  affiliateId?: string;
  promotionCode?: string;
  customerServiceNotes?: string;
}

// Transaction creation helper interfaces for different types
export interface DepositTransactionData {
  amount: number;
  paymentMethod: string;
  referenceId?: string;
  sourceBank?: string;
  processingFee?: number;
  bonusAmount?: number;
  ipAddress?: string;
  deviceInfo?: string;
}

export interface WithdrawalTransactionData {
  amount: number;
  beneficiaryName: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  withdrawalMethod: "BANK" | "UPI";
  charges?: number;
  netAmount?: number;
  ipAddress?: string;
  deviceInfo?: string;
}

export interface GameTransactionData {
  amount: number;
  gameId: string;
  gameType: string;
  entryFee?: number;
  winningAmount?: number;
  rank?: number;
  totalPlayers?: number;
  gameMode?: string;
}

export interface RefundTransactionData {
  amount: number;
  originalTransactionId: string;
  refundReason: string;
  refundType: "FULL" | "PARTIAL";
  originalAmount: number;
  refundMethod?: string;
}

export interface BonusTransactionData {
  amount: number;
  bonusType: "REFERRAL" | "WELCOME" | "CASHBACK" | "PROMOTIONAL";
  sourceTransactionId?: string;
  referralCode?: string;
  bonusPercentage?: number;
  maxBonusAmount?: number;
  validityPeriod?: string;
}

export interface FeeTransactionData {
  amount: number;
  feeType: "PLATFORM" | "TDS" | "PROCESSING" | "GATEWAY";
  feePercentage?: number;
  baseFee?: number;
  calculatedOn?: number;
  exemptionReason?: string;
}