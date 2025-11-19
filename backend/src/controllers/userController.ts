// @ts-nocheck
import { Request, Response } from 'express';
import * as userService from '../services/userService';
import { sign } from '../utils/jwtUtils';
import { AuthenticatedRequest } from '../types/common';
import { sanitizeString, sanitizeObject } from '../utils/sanitizationUtils';
import { validateRegistrationInput } from '../utils/validationUtils';
import { logger } from '../utils/logger';
import { UserRole } from '../entities/User';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Sanitize input
    const sanitizedInput = {
      username: sanitizeString(req.body.username),
      phoneNumber: sanitizeString(req.body.phoneNumber)
    };

    const validationErrors = validateRegistrationInput(sanitizedInput);
    if (validationErrors.length > 0) {
      res.status(400).json({ message: 'Validation failed', errors: validationErrors });
      return;
    }

    const user = await userService.createUser(sanitizedInput);
    const token = sign({ userId: user.id, role: user.role });
    
    res.status(201).json({ user, token });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    logger.error('Registration error:', { error: errorMessage });
    res.status(400).json({ message: errorMessage });
  }
};


export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const user = await userService.getUserById(userId);
    res.json(user);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    logger.error('Get profile error:', { error: errorMessage, userId: req.user?.id });
    res.status(404).json({ message: errorMessage });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Sanitize input
    const sanitizedUpdates = sanitizeObject(req.body);
    
    // Remove fields that shouldn't be updated directly
    delete sanitizedUpdates.role; // Role updates should be handled by admin only
    delete sanitizedUpdates.phoneNumber; // Phone updates should be handled separately with verification
    
    const updatedUser = await userService.updateUser(userId, sanitizedUpdates);
    res.json(updatedUser);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    logger.error('Update profile error:', { error: errorMessage, userId: req.user?.id });
    res.status(400).json({ message: errorMessage });
  }
};