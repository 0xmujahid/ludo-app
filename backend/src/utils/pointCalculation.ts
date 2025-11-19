import { getPlayerPath } from "./playerPaths";

import { PlayerState, GameState } from '../types/game';

// Type definitions for point calculation are now imported from types/game.ts

/**
 * Calculate points based on steps moved in path (NEW SYSTEM)
 * Each token's points = number of steps it has moved from start
 */
export function calculateStepsFromPosition(position: number, pathArray: number[]): number {
  if (position === 0) return 0; // Token at home (start) has 0 steps
  const stepIndex = pathArray.indexOf(position);
  return stepIndex === -1 ? 0 : stepIndex; // Return step count (0-based index)
}

/**
 * Calculate total points for a player based on all token steps
 */
export function calculatePlayerStepsPoints(
  playerState: PlayerState,
  playerIndex: number,
  totalPlayers: number
): number {
  const playerPath = getPlayerPath(playerIndex, totalPlayers);
  
  let totalSteps = 0;
  playerState.pieces.forEach(position => {
    const steps = calculateStepsFromPosition(position, playerPath);
    totalSteps += steps;
  });
  
  return totalSteps;
}

/**
 * Update all players' points in game state using the new step-based system
 */
export function updateAllPlayersPointsCorrectly(gameState: GameState): void {
  const totalPlayers = Object.keys(gameState.players).length;
  
  for (const [playerId, player] of Object.entries(gameState.players)) {
    const playerIndex = player.position;
    const stepsPoints = calculatePlayerStepsPoints(player, playerIndex, totalPlayers);
    
    // Set the correct points (steps-based, not position-based)
    gameState.players[playerId].points = stepsPoints;
  }
}

/**
 * Calculate points for killed token based on its steps before being killed
 */
export function calculateKilledTokenSteps(
  killedPosition: number,
  killedPlayerIndex: number,
  totalPlayers: number
): number {
  const killedPlayerPath = getPlayerPath(killedPlayerIndex, totalPlayers);
  return calculateStepsFromPosition(killedPosition, killedPlayerPath);
}