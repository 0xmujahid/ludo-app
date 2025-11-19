import { TransactionStatus, TransactionType, PaymentMethod, PaymentMetadata, PaymentGatewayResponse } from './payment';

export { TransactionStatus, TransactionType, PaymentMethod };

export interface TransactionAuditLog {
  action: string;
  performedBy: string;
  timestamp: Date;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Re-export PaymentMetadata as TransactionMetadata for backward compatibility
export type TransactionMetadata = PaymentMetadata;
