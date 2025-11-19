import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { authService } from "../services/authService";
import * as userService from "../services/userService";
import { AuthenticatedRequest } from "../types/common";
import { validatePhoneNumber, validateOTP } from "../utils/validationUtils";
import * as walletService from "../services/walletService";
import { sanitizeString } from "../utils/sanitizationUtils";
import { User, KYCStatus, UserRole } from "../entities/User";
import { KYC } from "../entities/KYC";
import { kycService } from "../services/kycService";

export class AuthController {
  private authService = authService;

  constructor() {
    // Bind methods to this instance
    this.register = this.register.bind(this);
    this.requestOTP = this.requestOTP.bind(this);
    this.verifyAndLogin = this.verifyAndLogin.bind(this);
    this.submitKYC = this.submitKYC.bind(this);
    this.getKYCStatus = this.getKYCStatus.bind(this);
    this.verifyKYCDocument = this.verifyKYCDocument.bind(this);
    this.verifyToken = this.verifyToken.bind(this);
  }

  public submitKYC = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const {
        aadharNumber,
        panNumber,
        aadharPhotoUrl,
        panPhotoUrl,
        selfiePhotoUrl,
      } = req.body;

      // Validate required fields
      if (
        !aadharNumber ||
        !panNumber ||
        !aadharPhotoUrl ||
        !panPhotoUrl ||
        !selfiePhotoUrl
      ) {
        res.status(400).json({ message: "All KYC fields are required" });
        return;
      }

      const kyc = await kycService.submitKYC(userId, {
        aadharNumber,
        panNumber,
        aadharPhotoUrl,
        panPhotoUrl,
        selfiePhotoUrl,
      });

      res.status(201).json({
        message: "KYC documents submitted successfully",
        kycId: kyc.id,
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to submit KYC documents",
        error: error.message,
      });
    }
  };

  public getKYCStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const status = await kycService.getKYCStatus(userId);
      res.status(200).json(status);
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to get KYC status",
        error: error.message,
      });
    }
  };

  public verifyKYCDocument = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Ensure user is admin
      if ((req as any).user.role !== UserRole.ADMIN) {
        res
          .status(403)
          .json({ message: "Unauthorized. Admin access required." });
        return;
      }

      const { kycId, isApproved, rejectionReason } = req.body;

      if (!kycId) {
        res.status(400).json({ message: "KYC ID is required" });
        return;
      }

      if (typeof isApproved !== "boolean") {
        res.status(400).json({ message: "isApproved must be a boolean value" });
        return;
      }

      if (!isApproved && !rejectionReason) {
        res
          .status(400)
          .json({ message: "Rejection reason is required when rejecting KYC" });
        return;
      }

      const result = await kycService.verifyKYC(
        kycId,
        (req as any).user.id,
        isApproved,
        rejectionReason
      );

      res.status(200).json({
        message: `KYC ${isApproved ? "approved" : "rejected"} successfully`,
        ...result,
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to verify KYC",
        error: error.message,
      });
    }
  };

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phoneNumber, username, avatarUrl, gender, referralCode, ...other } = req.body;

      if (!validatePhoneNumber(phoneNumber)) {
        res.status(400).json({
          message:
            "Invalid phone number format. Please provide a valid phone number.",
        });
        return;
      }

      // Create user with phone number and referral code
      const user = await userService.createUser({
        phoneNumber,
        username,
        avatarUrl,
        gender,
        referralCode, // Pass the referral code to createUser
        ...other,
      });

      // Create wallet for the user and get the wallet ID
      const wallet = await walletService.createWallet(user.id);

      // Update the user's walletId in the users table
      await userService.updateUser(user.id, { wallet: wallet });

      // Initiate phone verification
      await this.authService.initiatePhoneAuth(phoneNumber);

      res.status(201).json({
        message: "Registration successful. Please verify your phone number.",
        userId: user.id,
      });
    } catch (error: any) {
      if (error.message.includes("Invalid referral code")) {
        res.status(400).json({ message: error.message });
      } else if (error.message.includes("already exists")) {
        res.status(409).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Registration failed", error: error.message });
      }
    }
  };

  public requestOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phoneNumber } = req.body;

      const sanitizedPhoneNumber = sanitizeString(phoneNumber);
      console.log("Sanitized Phone Number:", sanitizedPhoneNumber); // Log the sanitized phone number
      if (!validatePhoneNumber(sanitizedPhoneNumber)) {
        res.status(400).json({
          message:
            "Invalid phone number format. Please provide a valid phone number.",
        });
        return; // Ensure we return after sending the response
      }

      const userExists = await userService.findUserByPhoneNumber(
        sanitizedPhoneNumber
      );
      if (!userExists) {
        res.status(204).json({
          message: "User does not exist. OTP cannot be sent.",
          status: false,
        });
        return; // Ensure we return after sending the response
      }

      await this.authService.initiatePhoneAuth(sanitizedPhoneNumber);
      res.status(200).json({ message: "OTP sent successfully", status: true });
      return; // Ensure we return after sending the response
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Failed to send OTP", error: error.message });
    }
  };

  public verifyAndLogin = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { phoneNumber, otp } = req.body;

      if (!validatePhoneNumber(phoneNumber) || !validateOTP(otp)) {
        res.status(400).json({ message: "Invalid OTP!" });
        return;
      }
      const { user, token } = await this.authService.verifyPhoneOTP(
        phoneNumber,
        otp
      );
      res.status(200).json({ user, token });
    } catch (error: any) {
      res
        .status(401)
        .json({ message: "Authentication failed", error: error.message });
    }
  };

  public verifyToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const user = await userService.getUserById(userId);

      // Logic to refresh the token if necessary
      const newToken = await this.authService.refreshToken(userId); // Assuming this method exists

      res.status(200).json({
        user,
        token: newToken,
        status: true,
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to verify token",
        error: error.message,
        status: false,
      });
    }
  };
}