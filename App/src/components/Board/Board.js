import React, {useMemo, useCallback} from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';
import {useSelector} from 'react-redux'; // Import useSelector
import Pocket from '../Pocket'; // Ensure correct import path
import VerticalPath from '../path/VerticalPath'; // Ensure correct import path
import HorizontalPath from '../path/HorizontalPath'; // Ensure correct import path
import FourTriangles from '../FourTriangles'; // Ensure correct import path
import {
  Plot1Data,
  Plot2Data,
  Plot3Data,
  Plot4Data,
  // Keep other plot data imports if needed by child components
} from '../../utils/plotData';
import {PLAYER_COLORS} from '../../constants/Colors'; // Import PLAYER_COLORS

const {width: SCREEN_WIDTH} = Dimensions.get('window');
// Define board size based on screen width or a fixed ratio
const BOARD_CONTAINER_SIZE = SCREEN_WIDTH * 0.95; // Adjust as needed

const Board = React.memo(
  ({
    gameState, // Optional, maybe needed for status checks?
    players, // Array of player objects
    plottedPieces, // Flattened array of all pieces with pos, color, playerId
    currentTurn, // ID of the player whose turn it is
    userId, // Current user's ID
    diceValue,
    validMoves,
    selectedToken,
    isGamePaused,
    onDiceRoll, // Keep if dice is rendered on board
    onSelectToken, // Pass down to Pockets and Cells
    onMoveToken, // Pass down to Cells
    playerDetails, // Map from 'player1' to full player detail object
    playersColor, // Map from 'player1' to color string ('red', 'green', etc.)
    movingPieces, // Animation state for moving pieces
    isPieceAnimating, // Function to check if piece is animating
    getPieceAnimationData, // Function to get animation data for piece
  }) => {
    // Map logical player positions (0, 1, 2, 3) from backend to visual quadrant slots (1, 2, 3, 4)
    // Visual slots: 1=Bottom-Left, 2=Top-Right, 3=Top-Left, 4=Bottom-Right

    const logicalPlayer0 = playerDetails.player1; // Player at logical pos 0
    const logicalPlayer1 = playerDetails.player2; // Player at logical pos 1
    const logicalPlayer2 = playerDetails.player3; // Player at logical pos 2
    const logicalPlayer3 = playerDetails.player4; // Player at logical pos 3

    // Define the player details and color for each visual slot
    const pocket1Props = {
      // Bottom-Left (Visual Slot 1) -> Logical Player 0
      playerDetail: logicalPlayer0,
      color: playersColor?.player1 || PLAYER_COLORS.red, // Use player's color or default Red
      homePieces: plottedPieces.filter(
        p => p.playerId === logicalPlayer0?.userId && p.pos === 0,
      ),
      isCurrentTurn: currentTurn === logicalPlayer0?.userId,
      player: 1, // Indicate visual slot number
    };

    const pocket2Props = {
      // Top-Right (Visual Slot 2) -> Logical Player 1 (in 4-player), or maybe Logical Player 1 (in 2-player)?
      // Standard 2-player Ludo: Players are opposite (Pos 0 & Pos 2).
      // Let's adjust based on standard: Visual 1=Pos 0, Visual 2=Pos 1, Visual 3=Pos 2, Visual 4=Pos 3
      // And if only 2 players (Pos 0 & Pos 1), Visual 3 & 4 are empty.
      // Re-checking screenshot: Visual BL is Red (Pos 0), Visual TR is Green (Pos 1).
      // Visual TL is Blue (Empty), Visual BR is Yellow (Empty).
      // This matches the mapping: Visual 1=Pos 0, Visual 2=Pos 1, Visual 3=Pos 2, Visual 4=Pos 3.
      playerDetail: logicalPlayer1, // Top-Right maps to Logical Player 1
      color: playersColor?.player2 || PLAYER_COLORS.green, // Use player's color or default Green
      homePieces: plottedPieces.filter(
        p => p.playerId === logicalPlayer1?.userId && p.pos === 0,
      ),
      isCurrentTurn: currentTurn === logicalPlayer1?.userId,
      player: 2, // Indicate visual slot number
    };

    const pocket3Props = {
      // Top-Left (Visual Slot 3) -> Logical Player 2
      playerDetail: logicalPlayer2, // Top-Left maps to Logical Player 2
      color: playersColor?.player3 || PLAYER_COLORS.blue, // Use player's color or default Blue
      homePieces: plottedPieces.filter(
        p => p.playerId === logicalPlayer2?.userId && p.pos === 0,
      ),
      isCurrentTurn: currentTurn === logicalPlayer2?.userId,
      player: 3, // Indicate visual slot number
    };

    const pocket4Props = {
      // Bottom-Right (Visual Slot 4) -> Logical Player 3
      playerDetail: logicalPlayer3, // Bottom-Right maps to Logical Player 3
      color: playersColor?.player4 || PLAYER_COLORS.yellow, // Use player's color or default Yellow
      homePieces: plottedPieces.filter(
        p => p.playerId === logicalPlayer3?.userId && p.pos === 0,
      ),
      isCurrentTurn: currentTurn === logicalPlayer3?.userId,
      player: 4, // Indicate visual slot number
    };

    // Props to pass down to path cells (VerticalPath and HorizontalPath) and FourTriangles
    const sharedCellProps = useMemo(
      () => ({
        plottedPieces,
        currentTurn,
        userId,
        diceValue,
        validMoves,
        selectedToken,
        isGamePaused,
        isMyTurn: userId === currentTurn, // Calculate isMyTurn once
        onSelectToken,
        onMoveToken,
        playersColor, // Pass the map for cell coloring
        movingPieces, // Animation state
        isPieceAnimating, // Animation check function
        getPieceAnimationData, // Animation data function
      }),
      [
        plottedPieces,
        currentTurn,
        userId,
        diceValue,
        validMoves,
        selectedToken,
        isGamePaused,
        onSelectToken,
        onMoveToken,
        playersColor,
        movingPieces,
        isPieceAnimating,
        getPieceAnimationData,
      ],
    );

    // Props to pass down to Piles inside Pockets
    const sharedPilePropsInPocket = useMemo(
      () => ({
        diceValue,
        validMoves, // Might be needed by Pile to determine its own highlight? (See Pile logic)
        selectedToken,
        isGamePaused,
        onSelectToken, // Piles in pockets trigger selection
        currentTurn, // Pass currentTurn for Pile's internal isCurrentTurn calculation
        movingPieces, // Animation state
        isPieceAnimating, // Animation check function
        getPieceAnimationData, // Animation data function
      }),
      [
        diceValue,
        validMoves,
        selectedToken,
        isGamePaused,
        onSelectToken,
        currentTurn,
        movingPieces,
        isPieceAnimating,
        getPieceAnimationData,
      ],
    );

    return (
      <View style={styles.boardWrapper}>
        <View style={styles.ludoBoard}>
          {/* Top Row: Pocket (P3/TL) | VerticalPath (Plot2) | Pocket (P2/TR) */}
          <View style={styles.plotContainer}>
            {/* Top-Left Pocket (Visual Slot 3) */}
            <Pocket
              {...pocket3Props} // Pass calculated props for Visual Slot 3
              {...sharedPilePropsInPocket} // Pass shared pile interaction props
            />
            {/* Vertical Path (Plot2Data) - Shared path segment */}
            <VerticalPath
              cells={Plot2Data}
              {...sharedCellProps} // Pass shared cell interaction/rendering props
            />
            {/* Top-Right Pocket (Visual Slot 2) */}
            <Pocket
              {...pocket2Props} // Pass calculated props for Visual Slot 2
              {...sharedPilePropsInPocket} // Pass shared pile interaction props
            />
          </View>

          {/* Middle Row: HorizontalPath (Plot1) | FourTriangles | HorizontalPath (Plot3) */}
          <View style={styles.pathContainer}>
            {/* Horizontal Path (Plot1Data) - Shared path segment */}
            <HorizontalPath
              cells={Plot1Data}
              {...sharedCellProps} // Pass shared cell interaction/rendering props
            />
            {/* Center Triangle (Winning Area) */}
            <FourTriangles
              // Pass finished pieces for *all* logical players (0, 1, 2, 3) if they exist
              player1FinishedPieces={plottedPieces.filter(
                p => p.playerId === logicalPlayer0?.userId && p.pos >= 73,
              )}
              player2FinishedPieces={plottedPieces.filter(
                p => p.playerId === logicalPlayer1?.userId && p.pos >= 73,
              )}
              player3FinishedPieces={plottedPieces.filter(
                p => p.playerId === logicalPlayer2?.userId && p.pos >= 73,
              )}
              player4FinishedPieces={plottedPieces.filter(
                p => p.playerId === logicalPlayer3?.userId && p.pos >= 73,
              )}
              // Pass colors for the four logical players (which map to the triangle quadrants)
              playersColor={{
                player1: playersColor?.player1 || PLAYER_COLORS.red,
                player2: playersColor?.player2 || PLAYER_COLORS.green, // Check screenshot - Green is TR visual slot, which is Logical Pos 1
                player3: playersColor?.player3 || PLAYER_COLORS.blue, // Check screenshot - Blue is TL visual slot, which is Logical Pos 2
                player4: playersColor?.player4 || PLAYER_COLORS.yellow, // Check screenshot - Yellow is BR visual slot, which is Logical Pos 3
              }}
              // Note: The FourTriangles component uses player1/2/3/4 keys internally for quadrants.
              // This mapping aligns the colors to the visual quadrants as seen in the screenshot.
            />
            {/* Horizontal Path (Plot3Data) - Shared path segment */}
            <HorizontalPath
              cells={Plot3Data}
              {...sharedCellProps} // Pass shared cell interaction/rendering props
            />
          </View>

          {/* Bottom Row: Pocket (P1/BL) | VerticalPath (Plot4) | Pocket (P4/BR) */}
          <View style={styles.plotContainer}>
            {/* Bottom-Left Pocket (Visual Slot 1) */}
            <Pocket
              {...pocket1Props} // Pass calculated props for Visual Slot 1
              {...sharedPilePropsInPocket} // Pass shared pile interaction props
            />
            {/* Vertical Path (Plot4Data) - Shared path segment */}
            <VerticalPath
              cells={Plot4Data}
              {...sharedCellProps} // Pass shared cell interaction/rendering props
            />
            {/* Bottom-Right Pocket (Visual Slot 4) */}
            <Pocket
              {...pocket4Props} // Pass calculated props for Visual Slot 4
              {...sharedPilePropsInPocket} // Pass shared pile interaction props
            />
          </View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  boardWrapper: {
    width: '100%', // Take full width of gameArea
    aspectRatio: 1, // Maintain square aspect ratio
    position: 'relative',
    borderRadius: 0,
    overflow: 'visible',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ludoBoard: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
    // Layout the main sections
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  plotContainer: {
    width: '100%',
    height: '40%', // 40% for top and bottom sections
    justifyContent: 'space-between',
    flexDirection: 'row',
    backgroundColor: 'transparent', // These containers don't have a background
  },
  pathContainer: {
    flexDirection: 'row',
    overflow: 'visible',
    width: '100%',
    height: '20%', // 20% for the middle section
    justifyContent: 'space-between',
    backgroundColor: 'transparent', // This container doesn't have a background
  },
  // Styles for child components are handled within those components (Pocket, Path, Triangle, Cell, Pile)
});

export default Board;
