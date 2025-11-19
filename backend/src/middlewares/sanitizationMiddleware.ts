import { Request, Response, NextFunction } from 'express';
import { sanitizeRequest } from '../utils/inputSanitizer';
import { logger } from '../utils/logger';

export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
  try {
    const sanitized = sanitizeRequest(req);
    req.body = sanitized.body;
    req.query = sanitized.query;
    req.params = sanitized.params;
    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    res.status(400).json({ message: 'Invalid input data' });
  }
};
