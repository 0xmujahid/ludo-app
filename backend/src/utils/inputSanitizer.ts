import { escapeRegExp } from 'lodash';
import { Request } from 'express';

export interface SanitizedRequest {
  params: { [key: string]: string };
  body: any;
  query: { [key: string]: string };
}

export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Escape special characters
  sanitized = escapeRegExp(sanitized);
  
  // Remove any SQL injection attempts
  sanitized = sanitized.replace(/[\;\'\"\-\-]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
};

export const sanitizeObject = (obj: any): any => {
  if (!obj) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
};

export const sanitizeRequest = (req: Request): SanitizedRequest => {
  return {
    params: sanitizeObject(req.params),
    body: sanitizeObject(req.body),
    query: sanitizeObject(req.query),
  };
};

export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  
  // Convert to lowercase and trim
  let sanitized = email.toLowerCase().trim();
  
  // Remove any characters that aren't valid in an email
  sanitized = sanitized.replace(/[^\w\-\.@]/g, '');
  
  return sanitized;
};

export const sanitizeUsername = (username: string): string => {
  if (!username) return '';
  
  // Remove special characters and limit length
  let sanitized = username.replace(/[^\w\-]/g, '');
  sanitized = sanitized.substring(0, 30);
  
  return sanitized;
};

export const sanitizeGameInput = (input: any): any => {
  const sanitized = sanitizeObject(input);
  
  // Additional game-specific sanitization
  if (sanitized.gameId) {
    sanitized.gameId = sanitized.gameId.toString().replace(/[^\w\-]/g, '');
  }
  
  if (sanitized.move) {
    sanitized.move = parseInt(sanitized.move.toString(), 10) || 0;
  }
  
  return sanitized;
};
