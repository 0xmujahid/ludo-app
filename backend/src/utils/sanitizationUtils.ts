import { escapeRegExp } from 'lodash';

export const sanitizeString = (input: string): string => {
  if (!input) return '';
  
  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Escape special characters
  sanitized = escapeRegExp(sanitized);
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
};

export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  
  // Convert to lowercase and trim
  let sanitized = email.toLowerCase().trim();
  
  // Remove any characters that aren't valid in an email
  sanitized = sanitized.replace(/[^\w\-\.@]/g, '');
  
  return sanitized;
};

export const validatePasswordComplexity = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeObject = <T extends object>(obj: T): T => {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
};

export const validateAndSanitizeGameInput = (input: any): { isValid: boolean; sanitized: any; errors: string[] } => {
  const errors: string[] = [];
  const sanitized: any = {};
  
  if (typeof input !== 'object' || input === null) {
    errors.push('Invalid input format');
    return { isValid: false, sanitized: {}, errors };
  }
  
  // Validate and sanitize specific game-related fields
  if ('gameId' in input) {
    sanitized.gameId = sanitizeString(input.gameId);
    if (!sanitized.gameId) {
      errors.push('Invalid game ID');
    }
  }
  
  if ('move' in input) {
    if (typeof input.move === 'object') {
      sanitized.move = sanitizeObject(input.move);
    } else {
      errors.push('Invalid move format');
    }
  }
  
  if ('message' in input) {
    sanitized.message = sanitizeString(input.message);
    if (sanitized.message.length > 500) {
      errors.push('Message too long (max 500 characters)');
    }
  }
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
};
