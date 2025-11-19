import { Request, Response, NextFunction } from 'express';
import { isUUID } from 'class-validator';

export const validateTransactionId = (req: Request, res: Response, next: NextFunction): void => {
  const { transactionId } = req.params;
  
  if (!transactionId || !isUUID(transactionId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid transaction ID format'
    });
    return;
  }

  next();
};
