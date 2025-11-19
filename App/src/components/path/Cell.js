import {StyleSheet, View, TouchableOpacity, Image} from 'react-native';
import React, {useMemo, useCallback} from 'react';
import {Colors, PLAYER_COLORS, PLAYER_All_COLORS} from '../../constants/Colors';
import {ArrowRightIcon} from 'react-native-heroicons/outline';
import {RFValue} from 'react-native-responsive-fontsize';

import {
  ArrowSpot,
  SafeSpots,
  StarSpots,
  playerHomePathsById,
} from '../../utils/plotData';
import Pile from '../Pile';
import {useSelector} from 'react-redux';
import {isValidMove, calculateNextPosition} from '../../utils/playerPaths';

import SafeImage from '../../assets/images/star.png';
import SafeImageWhite from '../../assets/images/star_white.png';

const Cell = React.memo(
  ({
    id,
    playersColor,
    userId,
    plottedPieces,
    currentTurn,
    diceValue,
    validMoves,
    selectedToken,
    isGamePaused,
    isMyTurn,
    onSelectToken,
    onMoveToken,
    movingPieces,
    isPieceAnimating,
    getPieceAnimationData,
  }) => {
    const players = useSelector(state => state.game.players);

    const piecesAtPosition = useMemo(
      () => plottedPieces.filter(item => item.pos === id),
      [plottedPieces, id],
    );

    const isSafeSpot = useMemo(() => SafeSpots.includes(id), [id]);
    const isStarSpot = useMemo(() => StarSpots.includes(id), [id]);
    const isArrowSpot = useMemo(() => ArrowSpot.includes(id), [id]);

    let cellBackgroundColor = '#FFFFFF';

    const fallbackColors = {
      player1: 'red',
      player2: 'green',
      player3: 'blue',
      player4: 'yellow',
    };

    const matchingPlayerEntry = Object.entries(playerHomePathsById).find(
      ([playerIndex, path]) => path.includes(id),
    );

    if (matchingPlayerEntry) {
      const [playerIndex, _] = matchingPlayerEntry;
      const playerKey = `player${Number.parseInt(playerIndex) + 1}`;
      const playerColor =
        playersColor?.[playerKey] || fallbackColors[playerKey];
      if (playerColor) {
        cellBackgroundColor =
          PLAYER_All_COLORS[playerColor]?.path || cellBackgroundColor;
      }
    }

    if (isSafeSpot) {
      const safePlayerColor = matchingPlayerEntry
        ? playersColor?.[
            `player${Number.parseInt(matchingPlayerEntry[0]) + 1}`
          ] ||
          fallbackColors[`player${Number.parseInt(matchingPlayerEntry[0]) + 1}`]
        : null;

      if (safePlayerColor) {
        cellBackgroundColor =
          PLAYER_All_COLORS[safePlayerColor]?.safe || cellBackgroundColor;
      } else {
        cellBackgroundColor = '#ffffff';
      }
    }

    // Enhanced piece press handler with NEW path validation
    const handlePiecePress = useCallback(
      pieceId => {
        console.log(
          `Cell: Piece ${pieceId} pressed - checking with new path logic`,
        );

        if (!isMyTurn || isGamePaused) {
          console.log('Cell: Cannot select - not my turn or game paused');
          return;
        }

        if (diceValue <= 0) {
          console.log('Cell: Cannot select - dice not rolled');
          return;
        }

        const pieceData = piecesAtPosition.find(p => p.id === pieceId);
        if (!pieceData || pieceData.playerId !== userId) {
          console.log('Cell: Cannot select - not my piece');
          return;
        }

        // Get player info for path validation,
        const currentPlayer = players?.find(p => p.userId === userId);
        if (!currentPlayer) {
          console.log(
            'Cell: Cannot select - player not found',
            players,
            userId,
          );
          return;
        }

        // Use NEW path logic to validate move
        const totalPlayers = players?.filter(p => p.userId).length || 2;
        if (
          !isValidMove(
            pieceData.pos,
            diceValue,
            currentPlayer.position,
            totalPlayers,
          )
        ) {
          console.log('Cell: Invalid move according to new path logic');
          return;
        }

        const nextPos = calculateNextPosition(
          pieceData.pos,
          diceValue,
          currentPlayer.position,
          totalPlayers,
        );
        console.log(
          `Cell: Valid move from ${pieceData.pos} to ${nextPos} using new paths`,
        );

        // Move the piece directly
        onSelectToken(pieceId);
      },
      [
        isMyTurn,
        isGamePaused,
        diceValue,
        piecesAtPosition,
        userId,
        onSelectToken,
        players,
      ],
    );

    // Show highlight for selectable pieces using NEW path logic
    const showSelectionHighlight = useCallback(
      pieceId => {
        const piece = piecesAtPosition.find(p => p.id === pieceId);
        if (
          !piece ||
          !isMyTurn ||
          diceValue <= 0 ||
          isGamePaused ||
          piece.playerId !== userId
        ) {
          return false;
        }

        // Use NEW path logic to check if piece can move
        const currentPlayer = players?.find(p => p.userId === userId);
        if (!currentPlayer) return false;

        const totalPlayers = players?.filter(p => p.userId).length || 4;
        return isValidMove(
          piece.pos,
          diceValue,
          currentPlayer.position,
          totalPlayers,
        );
      },
      [piecesAtPosition, isMyTurn, diceValue, isGamePaused, userId, players],
    );

    return (
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: cellBackgroundColor,
            borderColor: Colors.borderColor,
            borderWidth: 0.4,
          },
        ]}
        disabled={true} // Disable cell press since we only want piece press
        activeOpacity={1}>
        {/* Special markers */}

        {isArrowSpot && (
          <ArrowRightIcon
            style={{
              transform: [
                {
                  rotate:
                    id === 2
                      ? '0deg'
                      : id === 20
                      ? '90deg'
                      : id === 71
                      ? '-90deg'
                      : '180deg',
                },
              ],
            }}
            size={RFValue(12)}
            color={Colors.darkGrey || 'grey'}
          />
        )}

        {/* Show image on safe spots */}
        {isSafeSpot && (
          <Image
            source={
              cellBackgroundColor == '#ffffff' ? SafeImage : SafeImageWhite
            }
            style={styles.safeSpotImage}
            resizeMode="contain"
          />
        )}

        {/* Render pieces */}
        {piecesAtPosition?.map((piece, index) => {
          if (!piece || !piece.id) return null;
          const pieceOwnerPlayer = players?.find(
            p => p.userId === piece.playerId,
          );
          const pieceColorString =
            pieceOwnerPlayer?.color?.toLowerCase() || 'default';
          const pieceVisualColor = PLAYER_COLORS[pieceColorString];

          return (
            <View
              key={piece.id}
              style={[
                styles.pieceContainer,
                {
                  transform: [
                    {scale: piecesAtPosition.length === 1 ? 1 : 0.7},
                    {
                      translateX:
                        piecesAtPosition.length === 1
                          ? 0
                          : index % 2 === 0
                          ? -RFValue(4)
                          : RFValue(4),
                    },
                    {
                      translateY:
                        piecesAtPosition.length === 1
                          ? 0
                          : index < 2
                          ? -RFValue(4)
                          : RFValue(4),
                    },
                  ],
                },
              ]}>
              <Pile
                cell={true}
                pieceData={piece}
                color={pieceVisualColor}
                currentTurn={currentTurn}
                diceValue={diceValue}
                validMoves={validMoves}
                selectedToken={selectedToken}
                isGamePaused={isGamePaused}
                onSelectToken={onSelectToken}
                onMoveToken={onMoveToken}
                onPress={() => handlePiecePress(piece.id)}
                showHighlight={showSelectionHighlight(piece.id)}
                isAnimating={isPieceAnimating?.(piece.id)}
                animationData={getPieceAnimationData?.(piece.id)}
              />
            </View>
          );
        })}
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    borderWidth: 0.4,
    borderColor: Colors.borderColor,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
    backgroundColor: '#FFFFFF',
  },
  pieceContainer: {
    position: 'absolute',
    zIndex: 99,
    justifyContent: 'center',
    alignItems: 'center',
    width: RFValue(36),
    height: RFValue(36),
  },
  safeSpotImage: {
    position: 'absolute',
    width: RFValue(12),
    height: RFValue(12),
    zIndex: 15,
    top: RFValue(3),
    right: RFValue(4),
  },
});

export default Cell;
