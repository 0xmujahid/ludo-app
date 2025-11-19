import { logger } from './logger';

/**
 * Validates if a string is in UUID format
 * @param str String to validate
 * @returns boolean indicating if the string is a valid UUID
 */
export const isValidUUID = (str: string): boolean => {
  if (!str) return false;
  
  // Validate format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Safely handle a game identifier that might be a room code or UUID
 * @param gameIdOrRoomCode The identifier to validate
 * @param onUUID Callback for when identifier is a UUID
 * @param onRoomCode Callback for when identifier is a room code
 * @returns The result of the appropriate callback
 */
export const handleGameIdentifier = async <T>(
  gameIdOrRoomCode: string,
  onUUID: (id: string) => Promise<T>,
  onRoomCode: (code: string) => Promise<T>
): Promise<T> => {
  const isUUID = isValidUUID(gameIdOrRoomCode);
  
  if (isUUID) {
    return await onUUID(gameIdOrRoomCode);
  } else {
    logger.info(`Non-UUID format identifier "${gameIdOrRoomCode}", treating as room code`);
    return await onRoomCode(gameIdOrRoomCode);
  }
};

/**
 * Logs details about a game identifier resolution
 * @param context The context where the identifier is being used
 * @param identifier The identifier being resolved
 * @param isUUID Whether the identifier is a UUID
 */
export const logIdentifierResolution = (
  context: string,
  identifier: string,
  isUUID: boolean
): void => {
  logger.info(`[${context}] Resolving identifier "${identifier}" as ${isUUID ? 'UUID' : 'room code'}`);
};