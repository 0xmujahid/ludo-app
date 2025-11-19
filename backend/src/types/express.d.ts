import { User } from '../entities/User';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
      role?: string;
      authenticated?: boolean;
    }
  }
}

export {};
