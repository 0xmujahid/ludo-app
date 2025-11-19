import { AppDataSource } from '../config/database';
import { PaymentMethodConfig } from '../entities/PaymentMethodConfig';
import { PaymentMethod } from '../types/payment';
import { logger } from '../utils/logger';

interface ManualPaymentConfig {
  displayName: string;
  description: string;
  requiresVerification: boolean;
  autoApprove: boolean;
  instructions: string;
  supportedCurrencies: string[];
  processingTimeHours: number;
  minAmount: number;
  maxAmount: number;
  feePercentage: number;
  supportDocuments: string[];
}

/**
 * Service for managing manual payment method configuration
 */
export class ManualPaymentConfigService {
  private configRepo = AppDataSource.getRepository(PaymentMethodConfig);

  /**
   * Get manual payment method configuration
   */
  async getManualPaymentConfig(): Promise<PaymentMethodConfig | null> {
    try {
      return await this.configRepo.findOne({
        where: { paymentMethod: PaymentMethod.MANUAL }
      });
    } catch (error) {
      logger.error('Error fetching manual payment config:', error);
      throw new Error('Failed to fetch manual payment configuration');
    }
  }

  /**
   * Check if manual payments are enabled
   */
  async isManualPaymentEnabled(): Promise<boolean> {
    try {
      const config = await this.getManualPaymentConfig();
      
      if (!config || !config.isEnabled) {
        return false;
      }

      // Check schedule if enabled
      if (config.hasSchedule) {
        const now = new Date();
        const enabledFrom = config.enabledFrom;
        const enabledUntil = config.enabledUntil;

        if (enabledFrom && now < enabledFrom) {
          return false;
        }

        if (enabledUntil && now > enabledUntil) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error checking manual payment status:', error);
      return false;
    }
  }

  /**
   * Get manual payment configuration details
   */
  async getManualPaymentDetails(): Promise<ManualPaymentConfig | null> {
    try {
      const config = await this.getManualPaymentConfig();
      if (!config) {
        return null;
      }

      return config.configuration as ManualPaymentConfig;
    } catch (error) {
      logger.error('Error fetching manual payment details:', error);
      return null;
    }
  }

  /**
   * Validate manual payment amount against configuration
   */
  async validatePaymentAmount(amount: number): Promise<{ valid: boolean; message?: string }> {
    try {
      const isEnabled = await this.isManualPaymentEnabled();
      if (!isEnabled) {
        return {
          valid: false,
          message: 'Manual payments are currently disabled'
        };
      }

      const config = await this.getManualPaymentDetails();
      if (!config) {
        return {
          valid: false,
          message: 'Manual payment configuration not found'
        };
      }

      if (amount < config.minAmount) {
        return {
          valid: false,
          message: `Minimum amount is ₹${config.minAmount}`
        };
      }

      if (amount > config.maxAmount) {
        return {
          valid: false,
          message: `Maximum amount is ₹${config.maxAmount}`
        };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Error validating payment amount:', error);
      return {
        valid: false,
        message: 'Failed to validate payment amount'
      };
    }
  }

  /**
   * Get processing time for manual payments
   */
  async getProcessingTime(): Promise<number> {
    try {
      const config = await this.getManualPaymentDetails();
      return config?.processingTimeHours || 24;
    } catch (error) {
      logger.error('Error fetching processing time:', error);
      return 24; // Default to 24 hours
    }
  }

  /**
   * Get fee percentage for manual payments
   */
  async getFeePercentage(): Promise<number> {
    try {
      const config = await this.getManualPaymentDetails();
      return config?.feePercentage || 0;
    } catch (error) {
      logger.error('Error fetching fee percentage:', error);
      return 0; // Default to no fee
    }
  }

  /**
   * Calculate processing fees
   */
  async calculateFees(amount: number): Promise<{ fee: number; totalAmount: number }> {
    try {
      const feePercentage = await this.getFeePercentage();
      const fee = Math.round((amount * feePercentage) / 100);
      const totalAmount = amount + fee;

      return { fee, totalAmount };
    } catch (error) {
      logger.error('Error calculating fees:', error);
      return { fee: 0, totalAmount: amount };
    }
  }

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies(): Promise<string[]> {
    try {
      const config = await this.getManualPaymentDetails();
      return config?.supportedCurrencies || ['INR'];
    } catch (error) {
      logger.error('Error fetching supported currencies:', error);
      return ['INR'];
    }
  }

  /**
   * Get user instructions for manual payment
   */
  async getPaymentInstructions(): Promise<string> {
    try {
      const config = await this.getManualPaymentDetails();
      return config?.instructions || 'Upload payment proof and wait for admin verification';
    } catch (error) {
      logger.error('Error fetching payment instructions:', error);
      return 'Upload payment proof and wait for admin verification';
    }
  }

  /**
   * Get supported document types for manual payment proof
   */
  async getSupportedDocuments(): Promise<string[]> {
    try {
      const config = await this.getManualPaymentDetails();
      return config?.supportDocuments || ['screenshot', 'receipt', 'bank_statement'];
    } catch (error) {
      logger.error('Error fetching supported documents:', error);
      return ['screenshot', 'receipt', 'bank_statement'];
    }
  }
}

// Export singleton instance
export const manualPaymentConfigService = new ManualPaymentConfigService();