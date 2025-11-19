import { User } from '../entities/User';

// Authentication related enums
export enum UserRole {
  PLAYER = 'player',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export enum KYCStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  NOT_SUBMITTED = 'not_submitted'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

// Re-export for backward compatibility
export { UserRole as Role };
export { KYCStatus as VerificationStatus };

// Authentication related interfaces
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface LoginCredentials {
  phoneNumber: string;
  otp: string;
}

// User related interfaces
export interface UserProfile {
  id: string;
  username: string;
  phoneNumber: string;
  email?: string;
  gender?: Gender;
  avatarUrl?: string;
  isVerified: boolean;
  role: UserRole;
  kycStatus: KYCStatus;
  gamesWon: number;
  totalGamesPlayed: number;
  eloRating: number;
  region?: string;
  createdAt: Date;
}

// KYC related interfaces
export interface KYCSubmission {
  userId: string;
  documentType: string;
  documentNumber: string;
  documentImage: string;
  status: KYCStatus;
  submittedAt: Date;
  verifiedAt?: Date;
}

export interface KYCVerificationMetadata {
  verifiedAt?: Date;
  verifiedBy?: string;
  comments?: string;
}
