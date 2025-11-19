// @ts-nocheck
import { Request, Response } from 'express';
import * as chatService from '../services/chatService';
import { AuthenticatedRequest } from '../types/common';

export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const { gameId, message } = req.body;
    const chatMessage = await chatService.sendMessage(gameId, userId, message);
    res.status(201).json(chatMessage);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getGameMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId } = req.params;
    const messages = chatService.getGameMessages(gameId);
    res.json(messages);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
