import { PaymentMethodConfig } from '../entities/PaymentMethodConfig';
import { AppDataSource } from '../config/database';
import { PaymentMethod } from '../types/payment';

export interface PaymentValidationResult {
  valid: boolean;
  message: string;
  details?: {
    minAmount: number;
    maxAmount: number;
    fee: number;
    totalAmount: number;
    processingTime: string;
  };
}

export interface PaymentMethodDetails {
  paymentMethod: PaymentMethod;
  displayName: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  feePercentage: number;
  processingTime: string;
  requiresVerification: boolean;
  supportedCurrencies: string[];
  paymentDetails?: any;
  frontendConfig?: any;
  isEnabled: boolean;
}

/**
 * Service for managing payment method configurations and validations
 */
export class PaymentMethodService {
  private configRepo = AppDataSource.getRepository(PaymentMethodConfig);

  /**
   * Get all available payment methods for wallet loading
   */
  async getAvailablePaymentMethods(): Promise<PaymentMethodDetails[]> {
    const configs = await this.configRepo.find({
      where: { isEnabled: true },
      order: { paymentMethod: 'ASC' }
    });

    return configs.map(config => this.mapConfigToDetails(config));
  }

  /**
   * Get all payment methods (enabled and disabled)
   */
  async getAllPaymentMethods(): Promise<PaymentMethodDetails[]> {
    const configs = await this.configRepo.find({
      order: { paymentMethod: 'ASC' }
    });

    return configs.map(config => this.mapConfigToDetails(config));
  }

  /**
   * Get specific payment method configuration
   */
  async getPaymentMethodConfig(paymentMethod: PaymentMethod): Promise<PaymentMethodDetails | null> {
    const config = await this.configRepo.findOne({
      where: { paymentMethod }
    });

    if (!config) {
      return null;
    }

    return this.mapConfigToDetails(config);
  }

  /**
   * Validate payment amount for any payment method
   */
  async validatePaymentAmount(paymentMethod: PaymentMethod, amount: number): Promise<PaymentValidationResult> {
    const config = await this.getPaymentMethodConfig(paymentMethod);

    if (!config) {
      return {
        valid: false,
        message: `Payment method ${paymentMethod} not found`
      };
    }

    if (!config.isEnabled) {
      return {
        valid: false,
        message: `Payment method ${config.displayName} is currently disabled`
      };
    }

    // Validate amount range
    if (amount < config.minAmount) {
      return {
        valid: false,
        message: `Minimum amount for ${config.displayName} is ₹${config.minAmount}`
      };
    }

    if (amount > config.maxAmount) {
      return {
        valid: false,
        message: `Maximum amount for ${config.displayName} is ₹${config.maxAmount}`
      };
    }

    // Calculate fees
    const fee = Math.round((amount * config.feePercentage) / 100);
    const totalAmount = amount + fee;

    return {
      valid: true,
      message: `Payment amount valid for ${config.displayName}`,
      details: {
        minAmount: config.minAmount,
        maxAmount: config.maxAmount,
        fee,
        totalAmount,
        processingTime: config.processingTime
      }
    };
  }

  /**
   * Check if payment method is available for wallet loading
   */
  async isPaymentMethodAvailable(paymentMethod: PaymentMethod): Promise<boolean> {
    const config = await this.configRepo.findOne({
      where: { paymentMethod, isEnabled: true }
    });

    return !!config;
  }

  /**
   * Get payment instructions for a specific method
   */
  async getPaymentInstructions(paymentMethod: PaymentMethod): Promise<string[] | null> {
    const config = await this.getPaymentMethodConfig(paymentMethod);
    
    if (!config || !config.paymentDetails) {
      return null;
    }

    return config.paymentDetails.instructions || null;
  }

  /**
   * Calculate fees for payment method
   */
  async calculateFees(paymentMethod: PaymentMethod, amount: number): Promise<{ fee: number; totalAmount: number } | null> {
    const config = await this.getPaymentMethodConfig(paymentMethod);
    
    if (!config) {
      return null;
    }

    const fee = Math.round((amount * config.feePercentage) / 100);
    const totalAmount = amount + fee;

    return { fee, totalAmount };
  }

  /**
   * Map database config to service details interface
   */
  private mapConfigToDetails(config: PaymentMethodConfig): PaymentMethodDetails {
    return {
      paymentMethod: config.paymentMethod,
      displayName: config.configuration?.displayName || config.paymentMethod,
      description: config.configuration?.description || '',
      minAmount: config.configuration?.minAmount || 1,
      maxAmount: config.configuration?.maxAmount || 100000,
      feePercentage: config.configuration?.feePercentage || 0,
      processingTime: config.configuration?.processingTimeHours 
        ? `${config.configuration.processingTimeHours} hours`
        : config.configuration?.processingTimeMinutes 
        ? `${config.configuration.processingTimeMinutes} minutes`
        : 'Instant',
      requiresVerification: config.configuration?.requiresVerification || false,
      supportedCurrencies: config.configuration?.supportedCurrencies || ['INR'],
      paymentDetails: config.configuration?.paymentDetails || null,
      frontendConfig: config.configuration?.frontendConfig || null,
      isEnabled: config.isEnabled
    };
  }
}

export const paymentMethodService = new PaymentMethodService();