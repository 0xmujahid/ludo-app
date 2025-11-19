import React, {useEffect, useState, useMemo, useCallback} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Polygon} from 'react-native-svg';
import {Colors, PLAYER_All_COLORS, PLAYER_COLORS} from '../constants/Colors';
import {deviceHeight, deviceWidth} from '../constants/Scaling';
import Fireworks from '../assets/animation/firework.json';
import LottieView from 'lottie-react-native';

import Pile from './Pile'; // Ensure correct import path
import {RFValue} from 'react-native-responsive-fontsize';
import {useSelector} from 'react-redux'; // Import useSelector

const FourTriangles = React.memo(
  ({
    player1FinishedPieces = [], // Pieces for Logical Player 0
    player2FinishedPieces = [], // Pieces for Logical Player 1
    player3FinishedPieces = [], // Pieces for Logical Player 2
    player4FinishedPieces = [], // Pieces for Logical Player 3
    playersColor, // Map from 'player1' to color string for quadrant backgrounds
  }) => {
    // Access global state needed by Pile
    const currentTurn = useSelector(state => state.game.currentTurn);
    const selectedToken = useSelector(state => state.game.selectedToken);
    const isGamePaused = useSelector(state => state.game.isGamePaused);
    const diceValue = useSelector(state => state.game.diceNo); // Assuming diceNo is correct

    const size = RFValue(100); // Size for the central SVG area - adjust based on 20% of board width

    // Data structure mapping visual quadrant (1-4) to logical player position (0-3)
    // and providing piece data and render styles for pieces within that quadrant.
    const quadrantData = useMemo(
      () => [
        // Visual Quadrant 1 (Bottom-Left) maps to Logical Player 0 (Red)
        {
          pieces: player1FinishedPieces,
          playerColor: playersColor?.player1 || PLAYER_COLORS.red,
          // Style to position the piece rendering area within the FourTriangles component
          style: {
            bottom: '0%',
            left: '25%',
            transform: [{translateY: RFValue(20)}],
          }, // Position near bottom-left triangle
          translateAxis: 'translateX', // Axis along which pieces stack/offset visually
        },
        // Visual Quadrant 2 (Top-Right) maps to Logical Player 1 (Green)
        {
          pieces: player2FinishedPieces,
          playerColor: playersColor?.player2 || PLAYER_COLORS.green,
          style: {
            top: '-40%',
            right: '0%',
            transform: [{translateY: RFValue(20)}],
          }, // Position near top-right triangle
          translateAxis: 'translateX',
        },
        // Visual Quadrant 3 (Top-Left) maps to Logical Player 2 (Blue)
        {
          pieces: player3FinishedPieces,
          playerColor: playersColor?.player3 || PLAYER_COLORS.blue,
          style: {
            top: '0%',
            left: '0%',
            transform: [{translateY: RFValue(20)}],
          }, // Position near top-left triangle
          translateAxis: 'translateX',
        },
        // Visual Quadrant 4 (Bottom-Right) maps to Logical Player 3 (Yellow)
        {
          pieces: player4FinishedPieces,
          playerColor: playersColor?.player4 || PLAYER_COLORS.yellow,
          style: {
            bottom: '50%',
            right: '0%',
            transform: [{translateY: RFValue(-20)}],
          }, // Position near bottom-right triangle
          translateAxis: 'translateY',
        },
      ],
      [
        player1FinishedPieces,
        player2FinishedPieces,
        player3FinishedPieces,
        player4FinishedPieces,
        playersColor,
      ],
    );

    const renderPlayerPieces = useCallback(
      (data, index) => (
        // Render a container for the pieces in this quadrant
        <View
          key={index} // Use index for key as data object is recreated on each render
          style={[styles.winningPiecesContainer, data.style]} // Apply base container style and quadrant-specific position
        >
          {/* Map over the pieces in this quadrant */}
          {data.pieces.map((piece, pieceIndex) => {
            // Piece data for Pile {id, pos, playerId, color, travelCount}
            // Piece color for Pile graphic should be the player's color, not the quadrant background color
            const pieceVisualColor =
              PLAYER_COLORS[data.playerColor?.toLowerCase()] ||
              PLAYER_COLORS.default;

            return (
              <View
                key={piece.id} // Key by piece ID
                style={{
                  position: 'absolute',
                  // Position pieces relative to the winningPiecesContainer
                  top: '50%',
                  left: '50%',
                  transform: [
                    {scale: 0.7}, // Scale down pieces slightly
                    {translateX: -RFValue(16)}, // Center the scaled piece
                    {translateY: -RFValue(16)},
                    // Offset pieces along the specified axis to stack them visually
                    {
                      [data.translateAxis]:
                        (pieceIndex - (data.pieces.length - 1) / 2) *
                        RFValue(12), // Stack based on pieceIndex and total pieces
                    },
                  ],
                  zIndex: 99 + pieceIndex, // Stack order
                }}>
                <Pile
                  cell={false} // Indicate this is NOT a main board cell
                  pieceData={piece} // Pass piece data
                  currentTurn={currentTurn}
                  color={pieceVisualColor} // Pass the piece's visual color
                  isCurrentTurn={piece.playerId === currentTurn} // Pass if this piece's owner is current turn
                  diceValue={diceValue} // Pass dice value
                  validMoves={[]} // Valid moves are not relevant for finished pieces
                  selectedToken={selectedToken} // Pass selected token
                  isGamePaused={isGamePaused} // Pass game paused state
                  onSelectToken={() => {}} // Finished pieces are not selectable
                  onMoveToken={() => {}} // Finished pieces cannot be moved
                  onPress={() => {}} // Finished pieces are not pressable for game actions
                  showHighlight={false} // Finished pieces do not show highlight
                />
              </View>
            );
          })}
        </View>
      ),
      [currentTurn, selectedToken, isGamePaused, diceValue], // Dependencies for memoizing render callback
    );

    return (
      <View style={styles.mainContainer}>
        {/* Fireworks Lottie (needs state management in parent or elsewhere) */}
        {/* Example: Pass a 'showFireworks' prop and control Lottie visibility/loop */}
        {/* {showFireworks && (
          <LottieView
            source={Fireworks}
            autoPlay
            loop={false}
            onAnimationFinish={() => {/* hide fireworks after animation * /}}
            hardwareAccelerationAndroid
            speed={1}
            style={styles.lottieView}
          />
        )} */}
        <Svg height="100%" width="100%" viewBox={`0 0 ${size} ${size}`}>
          {' '}
          {/* SVG fills its container */}
          {/* Render colored triangles using colors from the playersColor map */}
          {/* Points are defined relative to the SVG's 0,0 to size,size coordinates */}
          <Polygon
            points={`0,0 ${size / 2},${size / 2} ${size},0`}
            fill={
              PLAYER_All_COLORS[playersColor?.player2?.toLowerCase() || 'green']
                .path
            }
          />
          <Polygon
            points={`${size},0 ${size / 2},${size / 2} ${size},${size}`}
            fill={
              PLAYER_All_COLORS[
                playersColor?.player4?.toLowerCase() || 'yellow'
              ].path
            }
          />
          <Polygon
            points={`${size},${size} ${size / 2},${size / 2} 0,${size}`}
            fill={
              PLAYER_All_COLORS[playersColor?.player1?.toLowerCase() || 'red']
                .path
            }
          />
          <Polygon
            points={`0,${size} ${size / 2},${size / 2} 0,0`}
            fill={
              PLAYER_All_COLORS[playersColor?.player3?.toLowerCase() || 'blue']
                .path
            }
          />
        </Svg>
        {/* Render finished pieces containers for each quadrant */}
        {quadrantData.map(renderPlayerPieces)}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  mainContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    width: '20%', // Takes 20% width of the pathContainer
    height: '100%', // Takes 100% height of the pathContainer
    overflow: 'hidden',
    backgroundColor: 'white', // Center background color
    borderColor: Colors.borderColor, // Border color
    position: 'relative', // Needed for absolute positioning of pieces/lottie
  },
  lottieView: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    zIndex: 1,
  },
  // Container for grouping finished pieces within a quadrant
  winningPiecesContainer: {
    position: 'absolute', // Position this container relative to the mainContainer
    width: RFValue(50), // Example size for the container
    height: RFValue(50), // Example size
    justifyContent: 'center', // Center pieces within this container
    alignItems: 'center', // Center pieces within this container
    // The specific 'top', 'left', 'right', 'bottom', and 'transform' styles are applied
    // dynamically from the quadrantData in GameRoom.js
  },
});

export default FourTriangles;
