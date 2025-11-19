import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/common';
import { UserRole } from '../entities/User';

export const authorizeAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === UserRole.ADMIN) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};
