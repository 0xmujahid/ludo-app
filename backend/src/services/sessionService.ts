import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface Session {
  userId: string;
  sessionId: string;
  expiresAt: number;
  deviceInfo?: string;
}

const SESSION_EXPIRY = 24 * 60 * 60; // 24 hours in seconds
const inMemorySessions = new Map<string, Session>();

export const createSession = async (userId: string, deviceInfo?: string): Promise<string> => {
  try {
    const sessionId = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_EXPIRY;
    
    const session: Session = {
      userId,
      sessionId,
      expiresAt,
      deviceInfo
    };

    inMemorySessions.set(sessionId, session);
    logger.info(`Session created for user ${userId}`);
    
    return sessionId;
  } catch (error) {
    logger.error('Error creating session:', error);
    throw new Error('Failed to create session');
  }
};

export const validateSession = async (sessionId: string): Promise<Session | null> => {
  try {
    const session = inMemorySessions.get(sessionId);
    if (!session) {
      logger.debug(`Session ${sessionId} not found`);
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > session.expiresAt) {
      logger.debug(`Session ${sessionId} expired`);
      await invalidateSession(sessionId);
      return null;
    }

    return session;
  } catch (error) {
    logger.error('Error validating session:', error);
    return null;
  }
};

export const invalidateSession = async (sessionId: string): Promise<void> => {
  try {
    inMemorySessions.delete(sessionId);
    logger.debug(`Session ${sessionId} invalidated`);
  } catch (error) {
    logger.error('Error invalidating session:', error);
    throw new Error('Failed to invalidate session');
  }
};

export const invalidateAllUserSessions = async (userId: string): Promise<void> => {
  try {
    for (const [sessionId, session] of inMemorySessions.entries()) {
      if (session.userId === userId) {
        inMemorySessions.delete(sessionId);
        logger.debug(`Session ${sessionId} invalidated for user ${userId}`);
      }
    }
  } catch (error) {
    logger.error('Error invalidating user sessions:', error);
    throw new Error('Failed to invalidate user sessions');
  }
};
