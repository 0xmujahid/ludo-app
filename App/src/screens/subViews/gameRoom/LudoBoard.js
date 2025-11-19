import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';
import Token from './Token';

// Get screen dimensions
const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CELL_SIZE = SCREEN_WIDTH * 0.07; // Smaller cells for the paths

// Player colors with proper gradients - updated to match reference image
const PLAYER_COLORS = {
  RED: {
    primary: '#FF4141',
    secondary: '#CF0A0A',
    path: '#FF6B6B',
    safe: '#FFECEC',
  },
  BLUE: {
    primary: '#3871DF',
    secondary: '#1F4690',
    path: '#6C9BFF',
    safe: '#E6EFFF',
  },
  GREEN: {
    primary: '#4CAF50',
    secondary: '#2E7D32',
    path: '#7BCB7D',
    safe: '#EAF7EA',
  },
  YELLOW: {
    primary: '#FFC107',
    secondary: '#FF9800',
    path: '#FFD54F',
    safe: '#FFF9E6',
  },
  DEFAULT: {
    primary: '#9E9E9E',
    secondary: '#616161',
    path: '#BDBDBD',
    safe: '#F5F5F5',
  },
};

// Star icon for safe cells
const STAR_ICON = require('../../../assets/images/star.png');
const STAR_ICON_WHITE = require('../../../assets/images/star.png');

/**
 * BoardCell component - Renders a single cell on the board
 */
const BoardCell = ({type, color, size = CELL_SIZE, isSafe = false}) => {
  // Choose appropriate color based on cell type and player color
  const playerColor = PLAYER_COLORS[color] || PLAYER_COLORS.DEFAULT;

  let backgroundColor = '#FFFFFF';
  let borderColor = 'rgba(0, 0, 0, 0.1)';

  switch (type) {
    case 'path':
      backgroundColor = playerColor.path;
      break;
    case 'safe':
      backgroundColor = playerColor.safe;
      borderColor = playerColor.primary;
      break;
    case 'home':
      backgroundColor = playerColor.primary;
      break;
    default:
      backgroundColor = '#FFFFFF';
  }

  return (
    <View
      style={[
        styles.cell,
        {
          width: size,
          height: size,
          backgroundColor,
          borderColor,
          borderWidth: isSafe ? 1.5 : 0.5,
        },
      ]}>
      {isSafe && <Image source={STAR_ICON_WHITE} style={styles.starIcon} />}
    </View>
  );
};

/**
 * Path segment for the Ludo board
 * @param {string} displaySection - Which section to display ('topPath', 'rightPath', etc.)
 * @param {string} colorScheme - Color scheme for this path segment ('RED', 'BLUE', etc.)
 */
const LudoBoard = ({
  gameState,
  onTokenMove,
  onTokenSelect,
  selectedToken,
  validMoves = [],
  displaySection,
  colorScheme = 'BLUE', // Default color
}) => {
  // Function to generate cells for the path segment
  const renderCells = () => {
    let cells = [];
    const color = colorScheme;

    // Generate cells based on the display section
    switch (displaySection) {
      case 'topPath': {
        // Blue path (horizontal path at top)
        const rows = 3;
        const cols = 6;

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            // Determine if this is a path cell, colored cell or safe cell
            const isPathCell = row === 1; // Middle row is the color path
            const isSafeCell = row === 1 && (col === 1 || col === 4); // Safe cells

            cells.push(
              <View
                key={`${row}-${col}`}
                style={[
                  styles.cellPosition,
                  {
                    left: col * CELL_SIZE,
                    top: row * CELL_SIZE,
                  },
                ]}>
                <BoardCell
                  type={isPathCell ? 'path' : 'default'}
                  color={isPathCell ? color : 'DEFAULT'}
                  size={CELL_SIZE}
                  isSafe={isSafeCell}
                />
              </View>,
            );
          }
        }
        break;
      }

      case 'rightPath': {
        // Red path (vertical path on right)
        const rows = 6;
        const cols = 3;

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            // Middle column is the color path
            const isPathCell = col === 1;
            const isSafeCell = col === 1 && (row === 1 || row === 4);

            cells.push(
              <View
                key={`${row}-${col}`}
                style={[
                  styles.cellPosition,
                  {
                    left: col * CELL_SIZE,
                    top: row * CELL_SIZE,
                  },
                ]}>
                <BoardCell
                  type={isPathCell ? 'path' : 'default'}
                  color={isPathCell ? color : 'DEFAULT'}
                  size={CELL_SIZE}
                  isSafe={isSafeCell}
                />
              </View>,
            );
          }
        }
        break;
      }

      case 'bottomPath': {
        // Green path (horizontal path at bottom)
        const rows = 3;
        const cols = 6;

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            // Middle row is the color path
            const isPathCell = row === 1;
            const isSafeCell = row === 1 && (col === 1 || col === 4);

            cells.push(
              <View
                key={`${row}-${col}`}
                style={[
                  styles.cellPosition,
                  {
                    left: col * CELL_SIZE,
                    top: row * CELL_SIZE,
                  },
                ]}>
                <BoardCell
                  type={isPathCell ? 'path' : 'default'}
                  color={isPathCell ? color : 'DEFAULT'}
                  size={CELL_SIZE}
                  isSafe={isSafeCell}
                />
              </View>,
            );
          }
        }
        break;
      }

      case 'leftPath': {
        // Yellow path (vertical path on left)
        const rows = 6;
        const cols = 3;

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            // Middle column is the color path
            const isPathCell = col === 1;
            const isSafeCell = col === 1 && (row === 1 || row === 4);

            cells.push(
              <View
                key={`${row}-${col}`}
                style={[
                  styles.cellPosition,
                  {
                    left: col * CELL_SIZE,
                    top: row * CELL_SIZE,
                  },
                ]}>
                <BoardCell
                  type={isPathCell ? 'path' : 'default'}
                  color={isPathCell ? color : 'DEFAULT'}
                  size={CELL_SIZE}
                  isSafe={isSafeCell}
                />
              </View>,
            );
          }
        }
        break;
      }
    }

    return cells;
  };

  // Render tokens if they exist in the game state
  const renderTokens = () => {
    if (!gameState || !gameState.players) return null;

    const tokens = [];
    Object.values(gameState.players).forEach(player => {
      if (player.tokenPositions) {
        player.tokenPositions.forEach((position, index) => {
          // Check if this token should be in this segment (simplified logic for demo)
          // In a real implementation, you'd need more complex logic to determine token position
          const isInThisSegment = true; // Replace with real logic

          if (isInThisSegment) {
            tokens.push(
              <Token
                key={`${player.userId}-${index}`}
                token={{
                  id: `${player.userId}-${index}`,
                  color: player.color,
                  position,
                }}
                isSelected={selectedToken === `${player.userId}-${index}`}
                isCurrentTurn={player.userId === gameState.currentPlayer}
                onPress={() => onTokenSelect(`${player.userId}-${index}`)}
              />,
            );
          }
        });
      }
    });

    return tokens;
  };

  return (
    <View style={styles.container}>
      {/* Render the board cells */}
      {renderCells()}

      {/* Render the tokens */}
      {renderTokens()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    // backgroundColor: '#FFFFFF',
    borderRadius: 8,
    objectFit: 'contain',
  },
  cellPosition: {
    position: 'absolute',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
  },
  starIcon: {
    width: CELL_SIZE * 0.5,
    height: CELL_SIZE * 0.5,
    tintColor: '#FFD700',
    opacity: 0.8,
  },
});

export default LudoBoard;
