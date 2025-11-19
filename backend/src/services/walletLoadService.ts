import {
  PaymentDetails,
  PaymentGatewayResponse,
  PaymentMethod,
  TransactionStatus,
  PaymentMetadata,
  PaymentResponse,
  WalletLoadRequest,
  ManualPaymentDetails,
} from "../types/payment";
import { paymentGatewayService } from "./paymentGatewayService";
import * as walletService from "./walletService";
import * as paymentService from "./paymentService";
import { handleFirstDepositReferralBonus } from "./userService";
import { manualPaymentConfigService } from "./manualPaymentConfigService";

export async function initiateWalletLoad(
  request: WalletLoadRequest
): Promise<PaymentResponse> {
  try {
    // Validate request
    if (!request.userId || !request.amount || request.amount <= 0) {
      throw new Error("Invalid wallet load request");
    }

    let feeInfo = {};
    
    // If it's a manual payment, validate with configuration first
    if (request.paymentMethod === PaymentMethod.MANUAL) {
      // Check if manual payments are enabled
      const isEnabled = await manualPaymentConfigService.isManualPaymentEnabled();
      if (!isEnabled) {
        throw new Error("Manual payments are currently disabled");
      }

      // Validate payment amount
      const amountValidation = await manualPaymentConfigService.validatePaymentAmount(request.amount);
      if (!amountValidation.valid) {
        throw new Error(amountValidation.message || "Invalid payment amount");
      }

      // Calculate fees
      const { fee, totalAmount } = await manualPaymentConfigService.calculateFees(request.amount);
      const feePercentage = await manualPaymentConfigService.getFeePercentage();
      
      // Store fee information for inclusion in payment metadata
      feeInfo = {
        fee: fee,
        totalAmount: totalAmount,
        feeApplied: fee > 0,
        feePercentage: feePercentage
      };
    }

    // Create payment details
    const paymentDetails: PaymentDetails = {
      userId: request.userId,
      amount: request.amount,
      currency: request.currency || "INR",
      paymentMethod: request.paymentMethod,
      description: `Wallet load - ${request.amount} ${
        request.currency || "INR"
      }`,
      metadata: {
        ...request.metadata,
        orderId: `ORD_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        currency: request.currency || "INR",
        initiatedAt: new Date().toISOString(),
        email: request.metadata?.email,
        phone: request.metadata?.phone,
        utrNumber: request.metadata?.utrNumber,
        lastError: null,
        ...feeInfo,
      },
    };

    // Initialize transaction in pending state
    const transaction = await paymentService.initiatePayment(paymentDetails);

    // If it's a manual payment (UPI), handle differently
    if (request.paymentMethod === PaymentMethod.MANUAL) {
      // Enhanced validation for manual UPI payments
      if (!request.metadata?.utrNumber) {
        throw new Error("UTR number is required for manual UPI payments");
      }
      if (!request.metadata?.upiId) {
        throw new Error("UPI ID is required for manual payments");
      }

      // Validate UTR number format (basic validation)
      const utrRegex = /^[a-zA-Z0-9]{12,22}$/;
      if (!utrRegex.test(request.metadata.utrNumber)) {
        throw new Error("Invalid UTR number format");
      }

      // Create detailed manual payment metadata
      const manualPaymentDetails: ManualPaymentDetails = {
        utrNumber: request.metadata.utrNumber,
        upiId: request.metadata.upiId,
        bankName: request.metadata.bankName,
        accountHolder: request.metadata.accountHolder,
        transactionReference: request.metadata.transactionReference,
        amount: request.amount,
        timestamp: new Date().toISOString(),
      };

      // Store the manual payment details in transaction metadata
      const updatedMetadata = {
        ...transaction.metadata,
        orderId: transaction.metadata?.orderId,
        utrNumber: manualPaymentDetails.utrNumber,
        currency: transaction.metadata?.currency || "INR",
        status: TransactionStatus.PENDING,
        gatewayResponse: {
          code: "MANUAL_PAYMENT_INITIATED",
          message: "Manual payment details recorded",
          transactionId: transaction.id,
          timestamp: new Date().toISOString(),
        },
        lastError: null,
        manualPaymentDetails: manualPaymentDetails,
      };
      transaction.metadata = updatedMetadata as PaymentMetadata;

      // Save the updated transaction
      await paymentService.updatePaymentStatus(
        transaction.id,
        TransactionStatus.PENDING,
        undefined,
        {
          code: "MANUAL_PAYMENT_INITIATED",
          message:
            "Manual UPI payment submission received. Awaiting verification.",
          transactionId: transaction.id,
        }
      );

      return {
        success: true,
        transactionId: transaction.id,
        orderId: transaction.id,
        status: TransactionStatus.PENDING,
        message: "Manual UPI payment initiated. Awaiting verification.",
        metadata: {
          utrNumber: request.metadata.utrNumber,
          upiId: request.metadata.upiId,
          submittedAt: new Date().toISOString(),
        },
      };
    }

    // For automated payment gateways
    const gatewayResponse = await paymentGatewayService.initiatePayment(
      paymentDetails
    );

    // Update transaction with gateway response
    await paymentService.updatePaymentStatus(
      transaction.id,
      TransactionStatus.PENDING,
      gatewayResponse.transactionId,
      gatewayResponse
    );

    return {
      success: true,
      transactionId: transaction.id,
      orderId: gatewayResponse.orderId || transaction.id,
      status: TransactionStatus.PENDING,
      message: "Payment initiated successfully",
      gatewayResponse,
    };
  } catch (error) {
    console.error("Wallet load initiation failed:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to initiate wallet load"
    );
  }
}

export async function verifyManualWalletLoad(
  transactionId: string,
  verificationData: {
    utrNumber: string;
    verifierNotes?: string;
    adminId?: string;
  }
): Promise<PaymentResponse> {
  try {
    const transaction = await paymentService.getTransaction(transactionId);

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new Error("Transaction already completed");
    }

    if (transaction.status === TransactionStatus.FAILED) {
      throw new Error("Cannot verify failed transaction");
    }

    // Verify UTR number matches
    if (
      transaction.metadata?.manualPaymentDetails?.utrNumber !==
      verificationData.utrNumber
    ) {
      throw new Error("Invalid UTR number");
    }

    // Track verification attempt
    // Store verification attempt in gatewayResponse
    const previousAttempts =
      transaction.metadata?.gatewayResponse?.verificationAttempts || 0;
    if (previousAttempts >= 3) {
      throw new Error("Maximum verification attempts exceeded");
    }

    // Update transaction metadata with verification info
    const updatedMetadata = {
      ...transaction.metadata,
      verificationAttempts: previousAttempts + 1,
      lastVerificationAttempt: new Date().toISOString(),
      verifierNotes: verificationData.verifierNotes,
      adminId: verificationData.adminId,
      verifiedAt: new Date().toISOString(),
    };

    // Update transaction status
    const updatedTransaction = await paymentService.updatePaymentStatus(
      transactionId,
      TransactionStatus.COMPLETED,
      verificationData.utrNumber,
      {
        code: "MANUAL_PAYMENT_VERIFIED",
        message: "Manual UPI payment verified successfully",
        transactionId: verificationData.utrNumber,
        gatewayTransactionId: transaction.id,
        timestamp: new Date().toISOString(),
      }
    );

    // Update wallet balance
    await walletService.updateWalletBalance(
      transaction.wallet.user.id,
      transaction.amount,
      "credit",
      `Manual UPI payment verified - UTR: ${verificationData.utrNumber}`
    );

     // Handle first deposit referral bonus
    await handleFirstDepositReferralBonus(transaction.wallet.user.id);

    // Create audit log entry for the verification
    await paymentService.createPaymentAuditLog({
      transactionId,
      adminId: verificationData.adminId || "SYSTEM",
      action: "UTR_VERIFIED",
      details: {
        utrNumber: verificationData.utrNumber,
        notes: verificationData.verifierNotes,
        verifiedAt: new Date().toISOString(),
      },
    });

    if (!updatedTransaction) {
      throw new Error("Failed to update transaction status");
    }

    return {
      success: true,
      transactionId: updatedTransaction.id,
      orderId: updatedTransaction.id,
      status: TransactionStatus.COMPLETED,
      message: "Payment verified and wallet updated successfully",
      metadata: {
        verifiedAt: new Date().toISOString(),
        verificationAttempts: previousAttempts + 1,
      },
    };
  } catch (error) {
    console.error("Manual wallet load verification failed:", error);

    // Log failed verification attempt
    try {
      await paymentService.updatePaymentStatus(
        transactionId,
        TransactionStatus.PENDING,
        undefined,
        {
          code: "VERIFICATION_FAILED",
          message:
            error instanceof Error ? error.message : "Verification failed",
          timestamp: new Date().toISOString(),
        }
      );
    } catch (updateError) {
      console.error("Failed to update transaction status:", updateError);
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to verify manual wallet load"
    );
  }
}