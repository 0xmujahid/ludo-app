import { Request, Response } from 'express';
import { manualPaymentConfigService } from '../services/manualPaymentConfigService';
import { paymentMethodService } from '../services/paymentMethodService';
import { PaymentMethod } from '../types/payment';
import { AuthenticatedRequest } from '../types/common';

/**
 * Get manual payment method configuration
 */
export const getManualPaymentConfig = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const config = await manualPaymentConfigService.getManualPaymentConfig();
    
    if (!config) {
      res.status(404).json({
        success: false,
        message: 'Manual payment configuration not found'
      });
      return;
    }

    res.json({
      success: true,
      config: {
        paymentMethod: config.paymentMethod,
        isEnabled: config.isEnabled,
        configuration: config.configuration,
        hasSchedule: config.hasSchedule,
        enabledFrom: config.enabledFrom,
        enabledUntil: config.enabledUntil,
        disabledReason: config.disabledReason,
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching manual payment config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch manual payment configuration'
    });
  }
};

/**
 * Check if manual payments are enabled
 */
export const checkManualPaymentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const isEnabled = await manualPaymentConfigService.isManualPaymentEnabled();
    const details = await manualPaymentConfigService.getManualPaymentDetails();
    const processingTime = await manualPaymentConfigService.getProcessingTime();
    const feePercentage = await manualPaymentConfigService.getFeePercentage();
    const supportedCurrencies = await manualPaymentConfigService.getSupportedCurrencies();
    const instructions = await manualPaymentConfigService.getPaymentInstructions();
    const supportedDocuments = await manualPaymentConfigService.getSupportedDocuments();

    res.json({
      success: true,
      manualPayments: {
        enabled: isEnabled,
        details: details,
        processingTimeHours: processingTime,
        feePercentage: feePercentage,
        supportedCurrencies: supportedCurrencies,
        instructions: instructions,
        supportedDocuments: supportedDocuments
      }
    });
  } catch (error) {
    console.error('Error checking manual payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check manual payment status'
    });
  }
};

/**
 * Validate payment amount for manual payments
 */
export const validateManualPaymentAmount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
      return;
    }

    const validation = await manualPaymentConfigService.validatePaymentAmount(amount);
    const { fee, totalAmount } = await manualPaymentConfigService.calculateFees(amount);

    res.json({
      success: true,
      validation: {
        valid: validation.valid,
        message: validation.message,
        amount: amount,
        fee: fee,
        totalAmount: totalAmount
      }
    });
  } catch (error) {
    console.error('Error validating payment amount:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate payment amount'
    });
  }
};

/**
 * Get all available payment methods for wallet loading
 */
export const getAvailablePaymentMethods = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const availableMethods = await paymentMethodService.getAvailablePaymentMethods();

    res.json({
      success: true,
      availablePaymentMethods: availableMethods,
      count: availableMethods.length
    });
  } catch (error) {
    console.error('Error fetching available payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available payment methods'
    });
  }
};

/**
 * Validate payment amount for any payment method
 */
export const validatePaymentAmount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { paymentMethod, amount } = req.body;

    if (!paymentMethod || !amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Valid payment method and amount are required'
      });
      return;
    }

    // Validate payment method enum
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      res.status(400).json({
        success: false,
        message: 'Invalid payment method'
      });
      return;
    }

    const validation = await paymentMethodService.validatePaymentAmount(paymentMethod, amount);

    res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('Error validating payment amount:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate payment amount'
    });
  }
};