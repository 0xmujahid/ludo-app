export const Plot1Data = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
];
export const Plot2Data = [
  19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
];
export const Plot3Data = [
  37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,
];
export const Plot4Data = [
  55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72,
];

export const SafeSpots = [4, 9, 24, 25, 46, 51, 66, 67];

export const StarSpots = [];

export const ArrowSpot = [2, 20, 53, 71];

export const startingPoints = [
  Plot4Data[12],
  Plot2Data[12],
  Plot2Data[Plot2Data.length - 1],
  Plot4Data[Plot4Data.length - 1],
];

export const turningPoints = [13, 31, 49, 67];

export const victoryStart = [58, 16, 34, 52];

// Numerical IDs for each player's 6-cell home entry path + the final center spot (57)
// *** THESE ARE HYPOTHETICAL. VERIFY WITH BACKEND BOARD DEFINITION ***
export const playerHomePathsById = {
  0: [56, 59, 62, 65, 68, 67], // Player 0 (Red), assuming path IDs
  1: [24, 23, 26, 29, 32, 35], // Player 1 (Green), assuming path IDs
  2: [4, 5, 8, 11, 14, 17], // Player 2 (Blue), assuming path IDs
  3: [38, 41, 44, 47, 50, 51], // Player 3 (Yellow), assuming path IDs
};

// Define the IDs for the 4 visual plots within each home base pocket (pos 0)
// These are internal to the frontend rendering of the pocket.
export const homeBasePlotIds = {
  0: ['R1', 'R2', 'R3', 'R4'], // Red (Pos 0) home base plots
  1: ['G1', 'G2', 'G3', 'G4'], // Green (Pos 1) home base plots
  2: ['B1', 'B2', 'B3', 'B4'], // Blue (Pos 2) home base plots
  3: ['Y1', 'Y2', 'Y3', 'Y4'], // Yellow (Pos 3) home base plots
};
