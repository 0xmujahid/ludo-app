import React, {useMemo, useCallback, useRef, useEffect} from 'react';
import {View, StyleSheet, Text, Image, Animated} from 'react-native';

import {Colors, PLAYER_COLORS_GRADIENT} from '../constants/Colors';
import {startingPoints, homeBasePlotIds} from '../utils/plotData';
import Pile from './Pile';
import LinearGradient from 'react-native-linear-gradient';
import {avatars} from '../constants/Avatar';
import CustomText from './CustomText';
import {FontFamily} from '../constants/Fonts';
import {RFValue} from 'react-native-responsive-fontsize';
import {isValidMove, getPlayerStartingPosition} from '../utils/playerPaths';

const HEART_FILLED = require('../assets/images/Icons/heart-filled.png');
const HEART_OUTLINE = require('../assets/images/Icons/heart-outline.png');

// Dice face images
const DICE_FACES = {
  0: require('../assets/images/dice/0.png'),
  1: require('../assets/images/dice/1.png'),
  2: require('../assets/images/dice/2.png'),
  3: require('../assets/images/dice/3.png'),
  4: require('../assets/images/dice/4.png'),
  5: require('../assets/images/dice/5.png'),
  6: require('../assets/images/dice/6.png'),
};

const Pocket = React.memo(
  ({
    color,
    player,
    playerDetail,
    homePieces,
    isCurrentTurn,
    diceValue,
    validMoves,
    selectedToken,
    isGamePaused,
    onSelectToken,
    currentTurn,
    movingPieces,
    isPieceAnimating,
    getPieceAnimationData,
  }) => {
    console.log(
      `Rendering Pocket for visual player slot ${player}`,
      playerDetail,
    );

    // Enhanced home pile press handler with NEW path logic
    const handleHomePilePress = useCallback(
      pieceId => {
        console.log(
          `Pocket: Home piece ${pieceId} pressed - checking with new path logic`,
        );

        if (!isCurrentTurn || isGamePaused) {
          console.log(
            'Pocket: Cannot select - not current turn or game paused',
          );
          return;
        }

        if (diceValue <= 0) {
          console.log('Pocket: Cannot select - dice not rolled');
          return;
        }

        // In classic Ludo, you need a 6 to move out of home
        if (diceValue !== 6) {
          console.log('Pocket: Cannot select - need 6 to move out of home');
          return;
        }

        const piece = homePieces?.find(p => p.id === pieceId);
        if (!piece || piece.playerId !== playerDetail?.userId) {
          console.log('Pocket: Cannot select - piece not found or not owned');
          return;
        }

        // Use NEW path logic to validate home exit
        const totalPlayers = 4; // You can get this from props if needed
        if (!isValidMove(0, diceValue, playerDetail.position, totalPlayers)) {
          console.log(
            'Pocket: Cannot move out of home according to new path logic',
          );
          return;
        }

        const startingPos = getPlayerStartingPosition(
          playerDetail.position,
          totalPlayers,
        );
        console.log(
          `Pocket: Moving piece ${pieceId} from home to starting position ${startingPos}`,
        );

        onSelectToken(pieceId);
      },
      [
        isCurrentTurn,
        isGamePaused,
        diceValue,
        homePieces,
        playerDetail,
        onSelectToken,
      ],
    );

    const colorData = useMemo(
      () => PLAYER_COLORS_GRADIENT[color] || PLAYER_COLORS_GRADIENT.default,
      [color],
    );
    const totalLives = 3;
    const currentLives =
      playerDetail?.lives !== undefined ? playerDetail.lives : totalLives;

    const dynamicBorderRadius = useMemo(() => {
      switch (player) {
        case 1:
          return styles.borderBottomLeftRadius;
        case 2:
          return styles.borderTopRightRadius;
        case 3:
          return styles.borderTopLeftRadius;
        case 4:
          return styles.borderBottomRightRadius;
        default:
          return {};
      }
    }, [player]);

    const playerStartingPos = useMemo(() => {
      const backendPosition = playerDetail?.position;
      if (
        backendPosition !== undefined &&
        startingPoints &&
        startingPoints[backendPosition] !== undefined
      ) {
        return startingPoints[backendPosition];
      }

      console.warn(
        `Pocket: Could not determine starting point for visual slot ${player}. Using default 1.`,
      );
      return 1;
    }, [playerDetail?.position, player]);

    const visualPocketSlots = useMemo(() => {
      const slots = [null, null, null, null];

      if (
        Array.isArray(homePieces) &&
        playerDetail?.position !== undefined &&
        homeBasePlotIds[playerDetail.position]
      ) {
        const expectedPieceIds = homeBasePlotIds[playerDetail.position];

        homePieces.forEach(piece => {
          if (piece?.id) {
            const slotIndex = expectedPieceIds.indexOf(piece.id);
            if (slotIndex !== -1) {
              slots[slotIndex] = piece;
            } else {
              console.warn(
                `Pocket: Piece ID ${piece.id} not found in expected homeBasePlotIds for player position ${playerDetail.position}.`,
              );
              const firstEmptySlot = slots.findIndex(slot => slot === null);
              if (firstEmptySlot !== -1) {
                slots[firstEmptySlot] = piece;
              }
            }
          }
        });
      }
      return slots;
    }, [homePieces, playerDetail?.position]);

    // Show highlight for selectable home pieces using NEW path logic
    const showSelectionHighlight = useCallback(
      pieceId => {
        const piece = homePieces?.find(p => p.id === pieceId);
        if (!piece || !isCurrentTurn || isGamePaused) {
          return false;
        }

        // Use NEW path logic - can only move out with a 6
        const totalPlayers = 4; // You can get this from props if needed
        return (
          diceValue === 6 &&
          isValidMove(0, diceValue, playerDetail?.position || 0, totalPlayers)
        );
      },
      [homePieces, isCurrentTurn, diceValue, isGamePaused, playerDetail],
    );

    // Glowing animation for current player's pocket
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (isCurrentTurn) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 900,
              useNativeDriver: false,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 900,
              useNativeDriver: false,
            }),
          ]),
        ).start();
      } else {
        glowAnim.stopAnimation();
        glowAnim.setValue(0);
      }
    }, [isCurrentTurn, glowAnim]);

    const animatedGlowStyle = useMemo(() => {
      const shadowRadius = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [8, 24],
      });
      const shadowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.18, 0.38],
      });
      const scale = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.04],
      });
      return {
        shadowColor: '#FFD700', // Gold glow
        shadowRadius,
        shadowOpacity,
        shadowOffset: {width: 0, height: 0},
        elevation: 12,
        transform: [{scale}],
      };
    }, [glowAnim]);

    return (
      <Animated.View
        style={[
          isCurrentTurn ? [styles.glow, animatedGlowStyle] : null,
          {flex: 1, width: '100%'},
        ]}
      >
        <LinearGradient
          colors={colorData.gradient}
          style={[styles.container, dynamicBorderRadius]}>
          {playerDetail?.userId ? (
            <>
              <View style={styles.topSection}>
                <View style={styles.avatarSection}>
                  <View style={styles.avatarContainer}>
                    <Image
                      source={
                        avatars[
                          playerDetail?.avatarIndex !== undefined
                            ? playerDetail.avatarIndex % avatars.length
                            : player % avatars.length
                        ]
                      }
                      style={styles.avatar}
                    />
                  </View>
                </View>
                <View style={styles.infoSection}>
                  <CustomText fontFamily={FontFamily.Bold} size={RFValue(12)}>
                    {playerDetail?.username || `Player ${player}`}{' '}
                  </CustomText>
                  <View style={styles.livesContainer}>
                    {Array.from({length: totalLives}).map((_, index) => (
                      <Image
                        key={index}
                        source={
                          index < currentLives ? HEART_FILLED : HEART_OUTLINE
                        }
                        style={styles.heartIcon}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <View style={styles.playerInfo}>
                <CustomText fontFamily={FontFamily.Bold} size={RFValue(12)}>
                  Score
                </CustomText>
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreValue}>
                    {playerDetail?.points !== undefined
                      ? playerDetail.points
                      : '0'}
                  </Text>
                </View>
                {isCurrentTurn && (
                  <View style={styles.turnIndicator}>
                    <Image
                      source={DICE_FACES[diceValue || 0]}
                      style={styles.diceIcon}
                    />
                  </View>
                )}
              </View>

              <View style={styles.flexRow}>
                {visualPocketSlots.map((pieceData, visualSlotIndex) => {
                  return (
                    <Plot
                      key={visualSlotIndex}
                      pieceIndex={visualSlotIndex}
                      pieceData={pieceData}
                      playerColor={color}
                      isCurrentTurn={isCurrentTurn}
                      diceValue={diceValue}
                      validMoves={validMoves}
                      selectedToken={selectedToken}
                      isGamePaused={isGamePaused}
                      onSelectToken={onSelectToken}
                      currentTurn={currentTurn}
                      handlePress={() =>
                        pieceData ? handleHomePilePress(pieceData.id) : undefined
                      }
                      showHighlight={
                        pieceData ? showSelectionHighlight(pieceData.id) : false
                      }
                      movingPieces={movingPieces}
                      isPieceAnimating={isPieceAnimating}
                      getPieceAnimationData={getPieceAnimationData}
                    />
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.emptyPlayerSlotPlaceholder} />
          )}
        </LinearGradient>
      </Animated.View>
    );
  },
);

// Plot component remains the same
const Plot = React.memo(
  ({
    pieceIndex,
    pieceData,
    playerColor,
    isCurrentTurn,
    diceValue,
    validMoves,
    selectedToken,
    isGamePaused,
    onSelectToken,
    onMoveToken,
    handlePress,
    currentTurn,
    showHighlight,
    movingPieces,
    isPieceAnimating,
    getPieceAnimationData,
  }) => {
    if (!pieceData) {
      return (
        <View style={styles.plot}>
          <View style={styles.emptyPlotBase} />
        </View>
      );
    }

    const isPieceInHomeBase = pieceData.pos === 0;

    return (
      <View style={styles.plot}>
        {isPieceInHomeBase && (
          <Pile
            cell={false}
            pieceData={pieceData}
            color={playerColor}
            currentTurn={currentTurn}
            diceValue={diceValue}
            validMoves={validMoves}
            selectedToken={selectedToken}
            isGamePaused={isGamePaused}
            onSelectToken={onSelectToken}
            onMoveToken={onMoveToken}
            onPress={handlePress}
            showHighlight={showHighlight}
            isAnimating={isPieceAnimating?.(pieceData.id)}
            animationData={getPieceAnimationData?.(pieceData.id)}
          />
        )}
        {!pieceData ||
          (!isPieceInHomeBase && <View style={styles.emptyPlotBase} />)}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    borderWidth: 0.4,
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: Colors.borderColor,
    borderRadius: 0,
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  glow: {
    // This style is for the Animated.View wrapper
    borderRadius: 20,
    // The rest is handled by the animated style
  },
  borderBottomLeftRadius: {borderBottomLeftRadius: 20},
  borderTopLeftRadius: {borderTopLeftRadius: 20},
  borderTopRightRadius: {borderTopRightRadius: 20},
  borderBottomRightRadius: {borderBottomRightRadius: 20},
  topSection: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    paddingTop: 8,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 45,
    height: 45,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.39)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 17,
    resizeMode: 'cover',
  },
  infoSection: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 2,
  },
  scoreValue: {
    fontSize: RFValue(12),
    fontWeight: 'bold',
    color: '#fff',
  },
  turnIndicator: {
    width: 18,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  diceIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  playerInfo: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  livesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartIcon: {
    width: 16,
    height: 16,
    marginRight: 3,
    resizeMode: 'contain',
    tintColor: '#fff',
  },
  flexRow: {
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    height: '30%',
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  plot: {
    height: '100%',
    width: '20%',
    // borderRadius: 8,
    // borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
  emptyPlayerSlotPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPlotBase: {
    width: '80%',
    height: '80%',
    borderRadius: 50,
    // backgroundColor: 'rgba(255,255,255,0.3)',
    // borderWidth: 1,
    // borderColor: 'rgba(0,0,0,0.1)',
  },
});

export default Pocket;
