// Integration utilities to help with the new path system

import {
  getPlayerPath,
  getPlayerStartingPosition,
  logPlayerPaths,
  getValidMovesForPlayer,
  isPieceAtHome,
  hasPlayerWon,
} from './playerPaths';

// Initialize game with new path system
export function initializeGameWithPaths(players, totalPlayers) {
  // console.log('🎮 Initializing game with new path system');
  // console.log(`👥 Total players: ${totalPlayers}`);

  // // Log all player paths for debugging
  // logPlayerPaths();

  // Validate player setup
  players.forEach((player, index) => {
    const startingPos = getPlayerStartingPosition(index, totalPlayers);
    const playerPath = getPlayerPath(index, totalPlayers);
  });
}

// Validate a move using the new path system
export function validateMoveWithPaths(
  piece,
  diceValue,
  playerIndex,
  totalPlayers,
) {
  const {isValidMove, calculateNextPosition} = require('./playerPaths');

  const isValid = isValidMove(piece.pos, diceValue, playerIndex, totalPlayers);

  if (isValid) {
    const nextPos = calculateNextPosition(
      piece.pos,
      diceValue,
      playerIndex,
      totalPlayers,
    );
    return {
      valid: true,
      nextPosition: nextPos,
      message: `Can move from ${piece.pos} to ${nextPos}`,
    };
  } else {
    return {
      valid: false,
      nextPosition: piece.pos,
      message: `Cannot move piece from position ${piece.pos} with dice value ${diceValue}`,
    };
  }
}

// Get all possible moves for a player
export function getPlayerMoves(
  playerPieces,
  diceValue,
  playerIndex,
  totalPlayers,
) {
  const validMoves = getValidMovesForPlayer(
    playerPieces,
    diceValue,
    playerIndex,
    totalPlayers,
  );

  return validMoves;
}

// Check if game is won
export function checkGameWin(players, plottedPieces) {
  for (const player of players) {
    const playerPieces = plottedPieces.filter(
      p => p.playerId === player.userId,
    );
    if (hasPlayerWon(playerPieces, player.position)) {
      console.log(
        `🏆 Player ${player.position + 1} (${player.username}) has won!`,
      );
      return {
        hasWinner: true,
        winner: player,
        winnerIndex: player.position,
      };
    }
  }

  return {hasWinner: false};
}

// Debug function to trace a piece's journey
export function tracePieceJourney(piecePos, playerIndex, totalPlayers) {
  const playerPath = getPlayerPath(playerIndex, totalPlayers);
  const currentIndex = playerPath.indexOf(piecePos);

  if (currentIndex === -1) {
    console.log(
      `❓ Piece at position ${piecePos} not found in Player ${
        playerIndex + 1
      }'s path`,
    );
    return;
  }

  const remaining = playerPath.length - 1 - currentIndex;
  const isInHomePath = currentIndex >= 52; // Assuming 52 main board cells

  // console.log(`📍 Piece Journey for Player ${playerIndex + 1}:`);
  // console.log(`   Current position: ${piecePos} (index ${currentIndex})`);
  // console.log(`   Steps to victory: ${remaining}`);
  // console.log(`   In home path: ${isInHomePath ? 'Yes' : 'No'}`);

  if (remaining <= 10) {
    console.log(
      `   Next positions: ${playerPath
        .slice(currentIndex + 1, currentIndex + 6)
        .join(' → ')}`,
    );
  }
}
