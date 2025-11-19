import { 
  TransactionType, 
  TransactionDirection, 
  TransactionCategory 
} from '../types/payment';

/**
 * Utility class to categorize transactions automatically based on type and context
 */
export class TransactionCategorizer {
  
  /**
   * Determine transaction direction based on transaction type
   */
  static getDirection(transactionType: TransactionType): TransactionDirection {
    switch (transactionType) {
      // Credit transactions (money added to wallet)
      case TransactionType.DEPOSIT:
      case TransactionType.GAME_WINNING:
      case TransactionType.TOURNAMENT_WINNING:
      case TransactionType.REFUND:
      case TransactionType.BONUS:
      case TransactionType.CASHBACK:
        return TransactionDirection.CREDIT;

      // Debit transactions (money deducted from wallet)
      case TransactionType.WITHDRAWAL:
      case TransactionType.GAME_ENTRY:
      case TransactionType.TOURNAMENT_ENTRY:
      case TransactionType.DEDUCTED:
      case TransactionType.FEE:
      case TransactionType.PENALTY:
        return TransactionDirection.DEBIT;

      // Context-dependent transactions
      case TransactionType.ADJUSTMENT:
      case TransactionType.REVERSAL:
        // These need amount context to determine direction
        return TransactionDirection.CREDIT; // Default, should be set based on amount

      default:
        return TransactionDirection.CREDIT;
    }
  }

  /**
   * Determine transaction category based on type and context
   */
  static getCategory(
    transactionType: TransactionType,
    context?: {
      description?: string;
      metadata?: any;
      paymentMethod?: string;
      sourceType?: string;
      isManual?: boolean;
    }
  ): TransactionCategory {
    
    // Check context clues first
    if (context?.description) {
      const desc = context.description.toLowerCase();
      
      // Check for specific patterns in description
      if (desc.includes('referral') || desc.includes('refer')) {
        return TransactionCategory.REFERRAL_BONUS;
      }
      if (desc.includes('welcome') || desc.includes('signup')) {
        return TransactionCategory.WELCOME_BONUS;
      }
      if (desc.includes('cashback')) {
        return TransactionCategory.CASHBACK_CREDIT;
      }
      if (desc.includes('loyalty') || desc.includes('reward')) {
        return TransactionCategory.LOYALTY_REWARD;
      }
      if (desc.includes('promotional') || desc.includes('promo')) {
        return TransactionCategory.PROMOTIONAL_BONUS;
      }
      if (desc.includes('tds') || desc.includes('tax')) {
        return TransactionCategory.TDS_DEDUCTION;
      }
      if (desc.includes('gst')) {
        return TransactionCategory.GST_CHARGE;
      }
      if (desc.includes('processing fee')) {
        return TransactionCategory.PROCESSING_FEE;
      }
      if (desc.includes('platform') && desc.includes('fee')) {
        return TransactionCategory.PLATFORM_FEE;
      }
    }

    // Check source type for game/tournament context
    if (context?.sourceType === 'game') {
      if (transactionType === TransactionType.GAME_WINNING) {
        return TransactionCategory.GAME_PRIZE;
      }
      if (transactionType === TransactionType.GAME_ENTRY) {
        return TransactionCategory.GAME_ENTRY_FEE;
      }
    }

    if (context?.sourceType === 'tournament') {
      if (transactionType === TransactionType.TOURNAMENT_WINNING) {
        return TransactionCategory.TOURNAMENT_PRIZE;
      }
      if (transactionType === TransactionType.TOURNAMENT_ENTRY) {
        return TransactionCategory.TOURNAMENT_FEE;
      }
    }

    // Map based on transaction type
    switch (transactionType) {
      case TransactionType.DEPOSIT:
        // Check if it's manual or gateway deposit
        if (context?.paymentMethod === 'MANUAL' || context?.isManual) {
          return TransactionCategory.WALLET_LOAD;
        }
        return TransactionCategory.GATEWAY_DEPOSIT;

      case TransactionType.WITHDRAWAL:
        return TransactionCategory.WALLET_WITHDRAWAL;

      case TransactionType.GAME_ENTRY:
        return TransactionCategory.GAME_ENTRY_FEE;

      case TransactionType.GAME_WINNING:
        return TransactionCategory.GAME_PRIZE;

      case TransactionType.TOURNAMENT_ENTRY:
        return TransactionCategory.TOURNAMENT_FEE;

      case TransactionType.TOURNAMENT_WINNING:
        return TransactionCategory.TOURNAMENT_PRIZE;

      case TransactionType.REFUND:
        return TransactionCategory.REFUND_CREDIT;

      case TransactionType.BONUS:
        // Default to referral bonus if no specific context
        return TransactionCategory.REFERRAL_BONUS;

      case TransactionType.CASHBACK:
        return TransactionCategory.CASHBACK_CREDIT;

      case TransactionType.FEE:
        return TransactionCategory.PLATFORM_FEE;

      case TransactionType.PENALTY:
        return TransactionCategory.PENALTY_CHARGE;

      case TransactionType.ADJUSTMENT:
        return TransactionCategory.MANUAL_ADJUSTMENT;

      case TransactionType.REVERSAL:
        return TransactionCategory.REVERSAL_DEBIT;

      case TransactionType.DEDUCTED:
        return TransactionCategory.PLATFORM_FEE; // Default deduction type

      default:
        return TransactionCategory.MANUAL_ADJUSTMENT;
    }
  }

  /**
   * Auto-categorize transaction with both direction and category
   */
  static categorizeTransaction(
    transactionType: TransactionType,
    amount: number,
    context?: {
      description?: string;
      metadata?: any;
      paymentMethod?: string;
      sourceType?: string;
      isManual?: boolean;
    }
  ): {
    direction: TransactionDirection;
    category: TransactionCategory;
  } {
    let direction = this.getDirection(transactionType);
    
    // For adjustment and reversal, determine direction based on amount
    if (transactionType === TransactionType.ADJUSTMENT || transactionType === TransactionType.REVERSAL) {
      direction = amount >= 0 ? TransactionDirection.CREDIT : TransactionDirection.DEBIT;
    }

    const category = this.getCategory(transactionType, context);

    return { direction, category };
  }

  /**
   * Get human-readable labels for transaction categorization
   */
  static getCategoryLabel(category: TransactionCategory): string {
    const labels: Record<TransactionCategory, string> = {
      [TransactionCategory.WALLET_LOAD]: 'Wallet Load',
      [TransactionCategory.GATEWAY_DEPOSIT]: 'Gateway Deposit',
      [TransactionCategory.GAME_PRIZE]: 'Game Prize',
      [TransactionCategory.TOURNAMENT_PRIZE]: 'Tournament Prize',
      [TransactionCategory.REFERRAL_BONUS]: 'Referral Bonus',
      [TransactionCategory.WELCOME_BONUS]: 'Welcome Bonus',
      [TransactionCategory.CASHBACK_CREDIT]: 'Cashback Credit',
      [TransactionCategory.DEPOSIT_BONUS]: 'Deposit Bonus',
      [TransactionCategory.LOYALTY_REWARD]: 'Loyalty Reward',
      [TransactionCategory.PROMOTIONAL_BONUS]: 'Promotional Bonus',
      [TransactionCategory.REFUND_CREDIT]: 'Refund Credit',
      [TransactionCategory.WALLET_WITHDRAWAL]: 'Wallet Withdrawal',
      [TransactionCategory.GAME_ENTRY_FEE]: 'Game Entry Fee',
      [TransactionCategory.TOURNAMENT_FEE]: 'Tournament Fee',
      [TransactionCategory.PLATFORM_FEE]: 'Platform Fee',
      [TransactionCategory.TDS_DEDUCTION]: 'TDS Deduction',
      [TransactionCategory.GST_CHARGE]: 'GST Charge',
      [TransactionCategory.PROCESSING_FEE]: 'Processing Fee',
      [TransactionCategory.PENALTY_CHARGE]: 'Penalty Charge',
      [TransactionCategory.REVERSAL_DEBIT]: 'Reversal Debit',
      [TransactionCategory.MANUAL_ADJUSTMENT]: 'Manual Adjustment',
      [TransactionCategory.SYSTEM_CORRECTION]: 'System Correction',
    };
    
    return labels[category] || 'Other';
  }

  /**
   * Get direction label
   */
  static getDirectionLabel(direction: TransactionDirection): string {
    return direction === TransactionDirection.CREDIT ? 'Credit' : 'Debit';
  }
}