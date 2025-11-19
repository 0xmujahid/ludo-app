import { sanitizeString } from "./sanitizationUtils";
import { UserData } from "../types/common";

export const validatePasswordComplexity = (password?: string) => {
  const errors: string[] = [];
  if (!password) {
    return { isValid: false, errors: ["Password is required"] };
  }

  // Password length between 8 and 128 characters
  if (password.length < 8 || password.length > 128) {
    errors.push("Password must be between 8 and 128 characters long");
  }

  // Must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Must contain at least one number
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Must contain at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validatePhoneNumber = (phoneNumber: string): boolean => {
  // Supports international format: +1234567890 or local format: 1234567890
  const phoneRegex = /^\+?\d{10,15}$/;
  return phoneRegex.test(phoneNumber);
};

export const validateOTP = (otp: string): boolean => {
  // OTP should be exactly 4 digits
  const otpRegex = /^\d{4}$/;
  return otpRegex.test(otp);
};

export const validateRegistrationInput = (
  userData: Partial<UserData>
): string[] => {
  const errors: string[] = [];

  // Sanitize input
  const sanitizedUsername = userData.username
    ? sanitizeString(userData.username)
    : "";
  const sanitizedPhoneNumber = userData.phoneNumber
    ? sanitizeString(userData.phoneNumber)
    : "";

  // Username validation
  if (!sanitizedUsername || sanitizedUsername.length < 3) {
    errors.push("Username must be at least 3 characters long");
  }
  if (sanitizedUsername.length > 30) {
    errors.push("Username must not exceed 30 characters");
  }

  // Phone number validation
  if (!sanitizedPhoneNumber || !validatePhoneNumber(sanitizedPhoneNumber)) {
    errors.push(
      "Invalid phone number format. Please use international format (e.g., +1234567890)"
    );
  }

  return errors;
};

export const validateLoginInput = (phoneNumber: string): string[] => {
  const errors: string[] = [];

  const sanitizedPhoneNumber = sanitizeString(phoneNumber);

  if (!sanitizedPhoneNumber || !validatePhoneNumber(sanitizedPhoneNumber)) {
    errors.push(
      "Invalid phone number format. Please use international format (e.g., +1234567890)"
    );
  }

  return errors;
};

export const isValidEmail = (email: string): boolean => {
  // Enhanced email regex pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Additional validation functions
export const validatePasswordUpdate = (
  currentPassword: string,
  newPassword: string
): string[] => {
  const errors: string[] = [];

  if (!currentPassword) {
    errors.push("Current password is required");
  }

  const newPasswordValidation = validatePasswordComplexity(newPassword);
  if (!newPasswordValidation.isValid) {
    errors.push(...newPasswordValidation.errors);
  }

  if (currentPassword === newPassword) {
    errors.push("New password must be different from current password");
  }

  return errors;
};

export const validateGameInput = (input: any): string[] => {
  const errors: string[] = [];

  if (!input.gameId || typeof input.gameId !== "string") {
    errors.push("Invalid game ID");
  }

  if (input.move && typeof input.move !== "object") {
    errors.push("Invalid move format");
  }

  return errors;
};

export const validateTournamentInput = (input: any): string[] => {
  const errors: string[] = [];

  if (!input.name || typeof input.name !== "string") {
    errors.push("Tournament name is required");
  }

  if (!input.startTime || isNaN(new Date(input.startTime).getTime())) {
    errors.push("Invalid tournament start time");
  }

  if (
    !input.maxParticipants ||
    typeof input.maxParticipants !== "number" ||
    input.maxParticipants < 2
  ) {
    errors.push("Invalid maximum participants number");
  }

  if (
    !input.entryFee ||
    typeof input.entryFee !== "number" ||
    input.entryFee < 0
  ) {
    errors.push("Invalid entry fee");
  }

  return errors;
};
