// Player-wise path data for Ludo game based on the exact paths specified
// Each player has their own starting position and complete path to home

// Starting positions for each player on the main board
export const PLAYER_STARTING_POSITIONS = {
  0: 67, // Player 1 (Red) starts from cell 67
  1: 4, // Player 2 (Green) starts from cell 4 (if more than 2 players)
  2: 24, // Player 3 (Yellow) starts from cell 24
  3: 51, // Player 4 (Blue) starts from cell 51
};

// For 2-player games, use different position for player 2
export const TWO_PLAYER_STARTING_POSITIONS = {
  0: 67, // Player 1 (Red) starts from cell 67
  1: 24, // Player 2 (Green) starts from cell 24 (if only 2 players)
};

// Home paths for each player (6 cells each)
export const HOME_PATHS = {
  0: [68, 65, 62, 59, 56, 73], // Player 1 (Red) home path
  1: [5, 8, 11, 14, 17, 73], // Player 2 (Green) home path
  2: [23, 26, 29, 32, 35, 73], // Player 3 (Yellow) home path
  3: [50, 47, 44, 41, 38, 73], // Player 4 (Blue) home path
};

// Last cell before entering home path
export const HOME_ENTRY_CELLS = {
  0: 56, // Player 1's last cell before home
  1: 17, // Player 2's last cell before home (if more than 2 players)
  2: 35, // Player 3's last cell before home
  3: 38, // Player 4's last cell before home
};

// Last cell before entering home path (2-player game)
export const TWO_PLAYER_HOME_ENTRY_CELLS = {
  0: 56, // Player 1's last cell before home
  1: 35, // Player 2's last cell before home (if only 2 players)
};

// Complete detailed paths for each player based on the specified sequences
export const DETAILED_PLAYER_PATHS = {
  // Player 1 (Red) - starts from cell 67, ends at 60
  0: [
    // Starting position
    67,
    // Main path as specified: 67→64→61→58→55→18→...→56
    64, 61, 58, 55, 18, 15, 12, 9, 6, 3, 2, 1, 4, 7, 10, 13, 16, 34, 31, 28, 25,
    22, 19, 20, 21, 24, 27, 30, 33, 36, 37, 40, 43, 46, 49, 52, 53, 54, 51, 48,
    45, 42, 39, 57, 60, 63, 66, 69, 72, 71,

    // Home path
    68, 65, 62, 59, 56, 73,
  ],

  // Player 2 (Green) - if more than 2 players - starts from cell 4, ends at 24
  1: [
    // Starting position
    4,
    // Main path as specified: 4→7→10→13→16→34→...→17
    7, 10, 13, 16, 34, 31, 28, 25, 22, 19, 20, 21, 24, 27, 30, 33, 36, 37, 40,
    43, 46, 49, 52, 53, 54, 51, 48, 45, 42, 39, 57, 60, 63, 66, 69, 72, 71, 70,
    67, 64, 61, 58, 55, 18, 15, 12, 9, 6, 3, 2,
    // Home path
    5, 8, 11, 14, 17, 73,
  ],

  // Player 3 (Yellow) - starts from cell 24, ends at 72
  2: [
    // Starting position
    24,
    // Main path as specified: 24→27→30→33→36→37→...→35
    27, 30, 33, 36, 37, 40, 43, 46, 49, 52, 53, 54, 51, 48, 45, 42, 39, 57, 60,
    63, 66, 69, 72, 71, 70, 67, 64, 61, 58, 55, 18, 15, 12, 9, 6, 3, 2, 1, 4, 7,
    10, 13, 16, 34, 31, 28, 25, 22, 19, 20,
    // Home path
    23, 26, 29, 32, 35, 73,
  ],

  // Player 4 (Blue) - starts from cell 51, ends at 36
  3: [
    // Starting position
    51,
    // Main path as specified: 51→48→45→42→39→57→...→38
    48, 45, 42, 39, 57, 60, 63, 66, 69, 72, 71, 70, 67, 64, 61, 58, 55, 18, 15,
    12, 9, 6, 3, 2, 1, 4, 7, 10, 13, 16, 34, 31, 28, 25, 22, 19, 20, 21, 24, 27,
    30, 33, 36, 37, 40, 43, 46, 49, 52, 53,
    // Home path
    50, 47, 44, 41, 38, 73,
  ],
};

// Two-player paths (player 1 and player 2 with different path)
export const TWO_PLAYER_DETAILED_PATHS = {
  // Player 1 (Red) - same as in multi-player game
  0: DETAILED_PLAYER_PATHS[0],

  // Player 2 (Green) - if only 2 players - starts from cell 24, ends at 24
  1: [
    // Starting position
    24,
    // Main path as specified: 24→27→30→33→36→37→...→35
    27, 30, 33, 36, 37, 40, 43, 46, 49, 52, 53, 54, 51, 48, 45, 42, 39, 57, 60,
    63, 66, 69, 72, 71, 70, 67, 64, 61, 58, 55, 18, 15, 12, 9, 6, 3, 2, 1, 4, 7,
    10, 13, 16, 34,

    31, 28, 25, 22, 19, 20,

    // Home path
    23, 26, 29, 32, 35, 73,
  ],
};

// Safe spots on the board (where pieces cannot be captured)
export const SAFE_SPOTS = [67, 4, 24, 51, 19, 35, 56, 38]; // Starting positions and some key spots

// Get the correct path based on number of players
export function getPlayerPath(
  playerIndex: number,
  totalPlayers: number,
): number[] {
  if (totalPlayers === 2) {
    return (
      TWO_PLAYER_DETAILED_PATHS[
        playerIndex as keyof typeof TWO_PLAYER_DETAILED_PATHS
      ] || TWO_PLAYER_DETAILED_PATHS[0]
    );
  }
  return (
    DETAILED_PLAYER_PATHS[playerIndex as keyof typeof DETAILED_PLAYER_PATHS] ||
    DETAILED_PLAYER_PATHS[0]
  );
}

// Get starting position for a player
export function getPlayerStartingPosition(
  playerIndex: number,
  totalPlayers: number,
): number {
  if (totalPlayers === 2) {
    return (
      TWO_PLAYER_STARTING_POSITIONS[
        playerIndex as keyof typeof TWO_PLAYER_STARTING_POSITIONS
      ] || TWO_PLAYER_STARTING_POSITIONS[0]
    );
  }
  return (
    PLAYER_STARTING_POSITIONS[
      playerIndex as keyof typeof PLAYER_STARTING_POSITIONS
    ] || PLAYER_STARTING_POSITIONS[0]
  );
}

// Calculate next position for a piece based on dice value
export function calculateNextPosition(
  currentPos: number,
  diceValue: number,
  playerIndex: number,
  totalPlayers: number,
): number {
  const playerPath = getPlayerPath(playerIndex, totalPlayers);

  // If piece is at home (position 0), move to starting position
  if (currentPos === 0) {
    if (diceValue === 6) {
      const startingPos = getPlayerStartingPosition(playerIndex, totalPlayers);
      console.log(
        `Debug: Player ${playerIndex} in ${totalPlayers}-player game moving from home to starting position ${startingPos}`,
      );
      return startingPos;
    }
    return 0; // Can't move without a 6
  }

  // Find current position in player's path
  const currentPathIndex = playerPath.indexOf(currentPos);

  if (currentPathIndex === -1) {
    console.warn(
      `Position ${currentPos} not found in player ${playerIndex} path`,
    );
    return currentPos;
  }

  // Calculate next position
  const nextPathIndex = currentPathIndex + diceValue;

  // Check if move is valid (doesn't exceed path length)
  if (nextPathIndex >= playerPath.length) {
    return currentPos; // Invalid move, stay in place
  }

  return playerPath[nextPathIndex];
}

// Check if a move is valid for a piece
export function isValidMove(
  currentPos: number,
  diceValue: number,
  playerIndex: number,
  totalPlayers: number,
): boolean {
  // Validate input parameters
  if (diceValue < 1 || diceValue > 6) {
    return false;
  }

  if (playerIndex < 0 || playerIndex >= totalPlayers) {
    return false;
  }

  const playerPath = getPlayerPath(playerIndex, totalPlayers);

  if (!playerPath || playerPath.length === 0) {
    console.error(
      `Invalid player path for player ${playerIndex} in ${totalPlayers}-player game`,
    );
    return false;
  }

  // If piece is at home, can only move with a 6
  if (currentPos === 0) {
    return diceValue === 6;
  }

  // Find current position in player's path
  const currentPathIndex = playerPath.indexOf(currentPos);

  if (currentPathIndex === -1) {
    console.warn(
      `Position ${currentPos} not found in player ${playerIndex} path`,
    );
    return false;
  }

  // Check if next position is within path bounds
  const nextPathIndex = currentPathIndex + diceValue;
  const isValid = nextPathIndex < playerPath.length;

  if (!isValid) {
    console.log(
      `Move would exceed path length: current index ${currentPathIndex}, dice ${diceValue}, path length ${playerPath.length}`,
    );
  }

  return isValid;
}

// Get all valid moves for a player's pieces
export function getValidMovesForPlayer(
  pieces: number[],
  diceValue: number,
  playerIndex: number,
  totalPlayers: number,
): Array<{
  pieceIndex: number;
  currentPos: number;
  nextPos: number;
}> {
  const validMoves: Array<{
    pieceIndex: number;
    currentPos: number;
    nextPos: number;
  }> = [];

  pieces.forEach((piecePos, index) => {
    if (isValidMove(piecePos, diceValue, playerIndex, totalPlayers)) {
      const nextPos = calculateNextPosition(
        piecePos,
        diceValue,
        playerIndex,
        totalPlayers,
      );
      validMoves.push({
        pieceIndex: index,
        currentPos: piecePos,
        nextPos: nextPos,
      });
    }
  });

  return validMoves;
}

// Check if piece has reached home (final position)
export function isPieceAtHome(
  position: number,
  playerIndex: number,
  totalPlayers: number,
): boolean {
  const playerPath = getPlayerPath(playerIndex, totalPlayers);
  return position === playerPath[playerPath.length - 1];
}

// Check if position is a safe spot
export function isSafeSpot(position: number): boolean {
  return SAFE_SPOTS.includes(position);
}

// Get home path positions for a player
export function getPlayerHomePath(
  playerIndex: number,
  totalPlayers: number,
): number[] {
  return HOME_PATHS[playerIndex as keyof typeof HOME_PATHS] || HOME_PATHS[0];
}

// Check if piece is in home path
export function isPieceInHomePath(
  position: number,
  playerIndex: number,
  totalPlayers: number,
): boolean {
  const homePath = getPlayerHomePath(playerIndex, totalPlayers);
  return homePath.includes(position);
}

// Get distance to home for a piece
export function getDistanceToHome(
  currentPos: number,
  playerIndex: number,
  totalPlayers: number,
): number {
  const playerPath = getPlayerPath(playerIndex, totalPlayers);
  const currentPathIndex = playerPath.indexOf(currentPos);

  if (currentPathIndex === -1) {
    return -1; // Position not found
  }

  return playerPath.length - 1 - currentPathIndex;
}

// Check if two pieces are on the same position (for capturing)
export function canCapture(
  attackerPos: number,
  defenderPos: number,
  attackerPlayerIndex: number,
  defenderPlayerIndex: number,
  totalPlayers: number,
): boolean {
  // Can't capture if on safe spot
  if (isSafeSpot(defenderPos)) {
    return false;
  }

  // Can't capture pieces in home path
  if (isPieceInHomePath(defenderPos, defenderPlayerIndex, totalPlayers)) {
    return false;
  }

  // Can't capture own pieces
  if (attackerPlayerIndex === defenderPlayerIndex) {
    return false;
  }

  // Can capture if on same position
  return attackerPos === defenderPos;
}

// Get victory position for a player
export function getVictoryPosition(playerIndex: number): number {
  const homePath = HOME_PATHS[playerIndex as keyof typeof HOME_PATHS];
  return homePath[homePath.length - 1]; // Last position in home path
}

// Check if all pieces of a player have reached home
export function hasPlayerWon(pieces: number[], playerIndex: number): boolean {
  const victoryPos = getVictoryPosition(playerIndex);
  return pieces.every((piece) => piece === victoryPos);
}

// Debug function to log player paths
export function logPlayerPaths(): void {
  console.log("=== PLAYER PATHS ===");
  Object.entries(DETAILED_PLAYER_PATHS).forEach(([playerIndex, path]) => {
    console.log(`Player ${Number.parseInt(playerIndex) + 1} path:`, path);
    console.log(`Starting position: ${path[0]}`);
    console.log(
      `Home entry: ${path[path.length - HOME_PATHS[playerIndex as unknown as keyof typeof HOME_PATHS].length - 1]}`,
    );
    console.log(
      `Home path: ${path.slice(-HOME_PATHS[playerIndex as unknown as keyof typeof HOME_PATHS].length)}`,
    );
    console.log(`Victory position: ${path[path.length - 1]}`);
    console.log("---");
  });
}

// Find the path index for a given position
export function findPathIndex(
  position: number,
  playerIndex: number,
  totalPlayers: number,
): number {
  const playerPath = getPlayerPath(playerIndex, totalPlayers);
  return playerPath.indexOf(position);
}

// Get the position at a specific path index
export function getPositionAtPathIndex(
  pathIndex: number,
  playerIndex: number,
  totalPlayers: number,
): number | null {
  const playerPath = getPlayerPath(playerIndex, totalPlayers);
  if (pathIndex < 0 || pathIndex >= playerPath.length) {
    return null;
  }
  return playerPath[pathIndex];
}

// Calculate the exact destination position for a piece
export function calculateDestinationPosition(
  currentPos: number,
  diceValue: number,
  playerIndex: number,
  totalPlayers: number,
): number {
  const playerPath = getPlayerPath(playerIndex, totalPlayers);

  // For pieces in home base (position 0)
  if (currentPos === 0) {
    if (diceValue === 6) {
      return getPlayerStartingPosition(playerIndex, totalPlayers);
    }
    return 0; // Can't move without a 6
  }

  // Find current position in path
  const currentPathIndex = playerPath.indexOf(currentPos);

  if (currentPathIndex === -1) {
    console.error(
      `Position ${currentPos} not found in player ${playerIndex} path`,
    );
    return currentPos; // Return current position if not found in path
  }

  // Calculate destination path index
  const destinationPathIndex = currentPathIndex + diceValue;

  // Check if move is valid
  if (destinationPathIndex >= playerPath.length) {
    console.log(`Move exceeds path length for piece at position ${currentPos}`);
    return currentPos; // Stay in place if move is invalid
  }

  // Return the destination position
  return playerPath[destinationPathIndex];
}
