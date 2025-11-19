import * as crypto from "crypto";
import { sign } from "../utils/jwtUtils";
import * as userService from "./userService";
import { EntityId } from "../types/common";
import { User } from "../entities/User";
import { UserRole, AuthResponse } from "../types/auth";
import twilio from "twilio";

export interface UserUpdateData {
  otpSecret?: string | undefined;
  otpExpiresAt?: Date | undefined;
  isVerified?: boolean;
  phoneNumber?: string;
}

export interface IAuthService {
  initiatePhoneAuth(phoneNumber: string): Promise<void>;
  verifyPhoneOTP(phoneNumber: string, otp: string): Promise<AuthResponse>;
  generateToken(userId: EntityId, role: UserRole): string;
  refreshToken(userId: EntityId): Promise<string>; // Add this line
}

export class AuthService implements IAuthService {
  private generateOTP(): string {
    // Generate 4-digit OTP
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private generateOTPExpiry(): Date {
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 10); // OTP valid for 10 minutes
    return expiryDate;
  }

  public async initiatePhoneAuth(phoneNumber: string): Promise<void> {
    const user = await userService.getUserByPhone(phoneNumber);
    const otp = this.generateOTP();
    const otpExpiresAt = this.generateOTPExpiry();
    const otpSecret = crypto.createHash("sha256").update(otp).digest("hex");

    if (user) {
      // Update existing user's OTP details
      await userService.updateUser(user.id, {
        otpSecret,
        otpExpiresAt,
      });
    }

    // Twilio credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // For Sending OTP un-comment the code

    // const client = twilio(accountSid, authToken);

    // const response = await client.verify.v2
    //   .services("VA92ba7311961d9e9e51ec596eef73dcb8")
    //   .verifications.create({
    //     channel: "sms",
    //     customCode: otp,
    //     to: `+${phoneNumber}`,
    //   });
    // console.log(response);

    console.log(`OTP for ${phoneNumber}: ${otp}`);
  }

  public async verifyPhoneOTP(
    phoneNumber: string,
    otp: string,
  ): Promise<AuthResponse> {
    const user = await userService.getUserByPhone(phoneNumber);
    if (!user) {
      throw new Error("User not found");
    }

    // Explicitly check for undefined as these are optional fields
    if (user.otpSecret === undefined || user.otpExpiresAt === undefined) {
      throw new Error("No OTP requested");
    }

    const currentDate = new Date();
    const expiryDate = new Date(user.otpExpiresAt);
    if (currentDate > expiryDate) {
      throw new Error("OTP expired");
    }

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
    if (hashedOTP !== user.otpSecret) {
      throw new Error("Invalid OTP");
    }

    // Update user with undefined values to clear OTP data
    const updatedUser = await userService.updateUser(user.id, {
      otpSecret: undefined,
      otpExpiresAt: undefined,
      isVerified: true,
    });

    return {
      user: updatedUser,
      token: this.generateToken(updatedUser.id, updatedUser.role),
    };
  }

  public generateToken(userId: EntityId, role: UserRole): string {
    return sign({ userId, role });
  }

  public async refreshToken(userId: EntityId): Promise<string> {
    const user = await userService.getUserById(userId);
    return this.generateToken(user.id, user.role); // Generate a new token
  }
}

// Export a singleton instance
export const authService = new AuthService();
