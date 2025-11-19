/**
 * Turn timeout utility functions
 * Provides formatting, warning calculations, and life management for turn timeouts
 */

/**
 * Format time remaining into readable format
 * @param {number} seconds - Seconds remaining
 * @returns {string} Formatted time string
 */
export const formatTimeRemaining = (seconds) => {
  if (seconds <= 0) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Check if timeout warning should be shown
 * @param {number} timeRemaining - Seconds remaining
 * @param {number} warningThreshold - Warning threshold in seconds (default: 10)
 * @returns {boolean} Whether to show warning
 */
export const shouldShowTimeoutWarning = (timeRemaining, warningThreshold = 10) => {
  return timeRemaining <= warningThreshold && timeRemaining > 0;
};

/**
 * Get timeout warning level
 * @param {number} timeRemaining - Seconds remaining
 * @returns {'critical'|'warning'|'normal'} Warning level
 */
export const getTimeoutWarningLevel = (timeRemaining) => {
  if (timeRemaining <= 5) return 'critical';
  if (timeRemaining <= 10) return 'warning';
  return 'normal';
};

/**
 * Calculate progress percentage for countdown
 * @param {number} timeRemaining - Seconds remaining
 * @param {number} totalTime - Total time allowed (default: 30)
 * @returns {number} Progress percentage (0-100)
 */
export const calculateTimeoutProgress = (timeRemaining, totalTime = 30) => {
  if (totalTime <= 0) return 0;
  return Math.max(0, Math.min(100, (timeRemaining / totalTime) * 100));
};

/**
 * Get color for timeout indicator based on time remaining
 * @param {number} timeRemaining - Seconds remaining
 * @returns {string} Color hex code
 */
export const getTimeoutColor = (timeRemaining) => {
  if (timeRemaining <= 5) return '#FF4444'; // Critical red
  if (timeRemaining <= 10) return '#FF8800'; // Warning orange
  return '#44FF44'; // Normal green
};

/**
 * Check if player has lives remaining
 * @param {Object} playerLives - Player lives object
 * @param {string} playerId - Player ID
 * @returns {boolean} Whether player has lives
 */
export const hasLivesRemaining = (playerLives, playerId) => {
  const lives = playerLives[playerId];
  return lives !== undefined && lives > 0;
};

/**
 * Get lives remaining for a player
 * @param {Object} playerLives - Player lives object
 * @param {string} playerId - Player ID
 * @param {number} defaultLives - Default lives if not found (default: 3)
 * @returns {number} Lives remaining
 */
export const getLivesRemaining = (playerLives, playerId, defaultLives = 3) => {
  return playerLives[playerId] !== undefined ? playerLives[playerId] : defaultLives;
};

/**
 * Check if timeout should trigger pulse animation
 * @param {number} timeRemaining - Seconds remaining
 * @returns {boolean} Whether to pulse
 */
export const shouldPulse = (timeRemaining) => {
  return timeRemaining <= 10 && timeRemaining > 0;
};

/**
 * Get pulse interval based on urgency
 * @param {number} timeRemaining - Seconds remaining
 * @returns {number} Pulse interval in milliseconds
 */
export const getPulseInterval = (timeRemaining) => {
  if (timeRemaining <= 5) return 300; // Fast pulse for critical
  if (timeRemaining <= 10) return 600; // Medium pulse for warning
  return 1000; // Slow pulse for normal
};