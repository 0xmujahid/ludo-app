// Visualization utilities for debugging player paths

export function visualizePlayerPath(playerIndex, totalPlayers) {
  const {
    getPlayerPath,
    getPlayerStartingPosition,
    getPlayerHomePath,
  } = require('./playerPaths');

  const path = getPlayerPath(playerIndex, totalPlayers);
  const startPos = getPlayerStartingPosition(playerIndex, totalPlayers);
  const homePath = getPlayerHomePath(playerIndex, totalPlayers);

  console.log(`\n=== PLAYER ${playerIndex + 1} PATH VISUALIZATION ===`);
  console.log(`Starting Position: ${startPos}`);
  console.log(`Total Path Length: ${path.length} cells`);
  console.log(`Main Board: ${path.slice(0, 52).join(' → ')}`);
  console.log(`Home Path: ${homePath.join(' → ')}`);
  console.log(`Victory Position: ${path[path.length - 1]}`);

  return {
    startPos,
    mainBoard: path.slice(0, 52),
    homePath,
    victoryPos: path[path.length - 1],
    totalLength: path.length,
  };
}

export function validatePlayerPaths() {
  const {DETAILED_PLAYER_PATHS, HOME_PATHS} = require('./playerPaths');

  console.log('\n=== PATH VALIDATION ===');

  Object.entries(DETAILED_PLAYER_PATHS).forEach(([playerIndex, path]) => {
    const playerNum = Number.parseInt(playerIndex) + 1;
    const homePath = HOME_PATHS[playerIndex];

    console.log(`\nPlayer ${playerNum} validation:`);
    console.log(`✓ Path length: ${path.length} (should be 57)`);
    console.log(
      `✓ Main board length: ${path.slice(0, 52).length} (should be 52)`,
    );
    console.log(`✓ Home path length: ${homePath.length} (should be 6)`);
    console.log(`✓ Starting position: ${path[0]}`);
    console.log(`✓ Home entry: ${path[51]}`);
    console.log(`✓ Victory position: ${path[path.length - 1]}`);

    // Check for duplicates in main board
    const mainBoard = path.slice(0, 52);
    const uniqueMainBoard = [...new Set(mainBoard)];
    if (uniqueMainBoard.length !== 52) {
      console.warn(
        `⚠️ Player ${playerNum} has duplicate positions in main board`,
      );
    }
  });
}
