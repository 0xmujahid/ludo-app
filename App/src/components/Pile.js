import React, {useEffect, useRef, useMemo, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import {Svg, Circle} from 'react-native-svg';
import {RFValue} from 'react-native-responsive-fontsize';

import PileGreen from '../assets/images/piles/green.png';
import PileRed from '../assets/images/piles/red.png';
import PileBlue from '../assets/images/piles/blue.png';
import PileYellow from '../assets/images/piles/yellow.png';
import {PLAYER_COLORS} from '../constants/Colors';

const TOKEN_IMAGES = {
  [PLAYER_COLORS.red]: PileRed,
  [PLAYER_COLORS.blue]: PileBlue,
  [PLAYER_COLORS.green]: PileGreen,
  [PLAYER_COLORS.yellow]: PileYellow,
  red: PileRed,
  blue: PileBlue,
  green: PileGreen,
  yellow: PileYellow,
  default: PileGreen,
};

const ANIMATION_CONFIG = {
  ROTATION_DURATION: 1000,
  SELECTION_SCALE: 1.2,
  SELECTION_DURATION: 150,
  BOUNCE_DURATION: 200,
  SPRING_CONFIG: {friction: 5, tension: 80},
  GLOW_RADIUS: RFValue(8),
};

const Pile = React.memo(
  ({
    // Core piece data
    pieceData,
    color,

    // Game state
    currentTurn,
    diceValue = 0,
    selectedToken,
    isGamePaused = false,

    // Context flags
    cell = false, // true if on board cell, false if in pocket

    // Interaction handlers
    onPress,
    onSelectToken,
    onMoveToken,

    // Visual state
    showHighlight = false,

    // Animation state
    isAnimating = false,
    animationData = null,

    // Legacy support
    validMoves = [],
  }) => {
    // Separate animation refs to avoid conflicts
    const scaleAnimation = useRef(new Animated.Value(1)).current;
    const translateYAnimation = useRef(new Animated.Value(0)).current;
    const rotation = useRef(new Animated.Value(0)).current;
    const glowOpacity = useRef(new Animated.Value(0)).current; // Separate for opacity
    
    // Movement animation refs
    const translateXAnimation = useRef(new Animated.Value(0)).current;
    const moveScaleAnimation = useRef(new Animated.Value(1)).current;

    // Track previous position for move animation
    const previousPosition = useRef(pieceData?.pos);

    // Computed states
    const isMyPiece = useMemo(
      () => pieceData?.playerId === currentTurn,
      [pieceData?.playerId, currentTurn],
    );

    const isSelected = useMemo(
      () => selectedToken === pieceData?.id,
      [selectedToken, pieceData?.id],
    );

    const canInteract = useMemo(
      () => !!pieceData && !isGamePaused && isMyPiece && diceValue > 0,
      [pieceData, isGamePaused, isMyPiece, diceValue],
    );

    const shouldShowGlow = useMemo(
      () => canInteract && (showHighlight || isSelected),
      [canInteract, showHighlight, isSelected],
    );

    // Get piece image
    const pieceImage = useMemo(
      () => TOKEN_IMAGES[color] || TOKEN_IMAGES.default,
      [color],
    );

    // Rotation animation (continuous) - useNativeDriver: true
    const rotateInterpolate = useMemo(
      () =>
        rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      [rotation],
    );

    // Start continuous rotation
    useEffect(() => {
      const rotateAnimation = Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: ANIMATION_CONFIG.ROTATION_DURATION,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );

      if (shouldShowGlow) {
        rotateAnimation.start();
      } else {
        rotateAnimation.stop();
        rotation.setValue(0);
      }

      return () => rotateAnimation.stop();
    }, [rotation, shouldShowGlow]);

    // Selection animation - useNativeDriver: true
    useEffect(() => {
      if (isSelected) {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scaleAnimation, {
              toValue: ANIMATION_CONFIG.SELECTION_SCALE,
              duration: ANIMATION_CONFIG.SELECTION_DURATION,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnimation, {
              toValue: 1.1,
              ...ANIMATION_CONFIG.SPRING_CONFIG,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(translateYAnimation, {
              toValue: -RFValue(8),
              duration: ANIMATION_CONFIG.SELECTION_DURATION,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.spring(translateYAnimation, {
              toValue: -RFValue(4),
              ...ANIMATION_CONFIG.SPRING_CONFIG,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(scaleAnimation, {
            toValue: 1,
            ...ANIMATION_CONFIG.SPRING_CONFIG,
            useNativeDriver: true,
          }),
          Animated.spring(translateYAnimation, {
            toValue: 0,
            ...ANIMATION_CONFIG.SPRING_CONFIG,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [isSelected, scaleAnimation, translateYAnimation]);

    // Position change animation - useNativeDriver: true
    useEffect(() => {
      if (
        pieceData?.pos !== previousPosition.current &&
        previousPosition.current !== undefined &&
        pieceData?.pos !== 0 // Don't animate when piece goes to home
      ) {
        // Bounce animation for position change
        Animated.sequence([
          Animated.timing(scaleAnimation, {
            toValue: 1.3,
            duration: ANIMATION_CONFIG.BOUNCE_DURATION,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnimation, {
            toValue: isSelected ? 1.1 : 1,
            ...ANIMATION_CONFIG.SPRING_CONFIG,
            useNativeDriver: true,
          }),
        ]).start();

        previousPosition.current = pieceData?.pos;
      } else if (
        previousPosition.current === undefined &&
        pieceData?.pos !== undefined
      ) {
        previousPosition.current = pieceData?.pos;
      }
    }, [pieceData?.pos, scaleAnimation, isSelected]);

    // Movement animation for smooth step-by-step movement
    useEffect(() => {
      if (isAnimating && animationData) {
        console.log(`🎯 Pile: Animating piece ${pieceData?.id} with data:`, animationData);
        
        // Create a subtle bounce and scale effect during movement
        Animated.parallel([
          Animated.sequence([
            Animated.timing(moveScaleAnimation, {
              toValue: 1.2,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(moveScaleAnimation, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(translateXAnimation, {
              toValue: 5,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(translateXAnimation, {
              toValue: -5,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(translateXAnimation, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      } else {
        // Reset movement animations
        moveScaleAnimation.setValue(1);
        translateXAnimation.setValue(0);
      }
    }, [isAnimating, animationData, moveScaleAnimation, translateXAnimation, pieceData?.id]);

    // Glow animation - useNativeDriver: false (for opacity)
    useEffect(() => {
      if (shouldShowGlow) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowOpacity, {
              toValue: 0.8,
              duration: 1000,
              useNativeDriver: false, // opacity requires false
            }),
            Animated.timing(glowOpacity, {
              toValue: 0.3,
              duration: 1000,
              useNativeDriver: false, // opacity requires false
            }),
          ]),
        ).start();
      } else {
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    }, [shouldShowGlow, glowOpacity]);

    // Handle press
    const handlePress = useCallback(() => {
      if (!canInteract || !onPress) return;

      // Add haptic feedback
      try {
        // For React Native, you might want to add haptic feedback here
        // HapticFeedback.impact(HapticFeedback.ImpactFeedbackStyle.Light)
      } catch (error) {
        // Haptic feedback not available
      }

      onPress();
    }, [canInteract, onPress]);

    // Don't render if no piece data
    if (!pieceData) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.container}
        activeOpacity={canInteract ? 0.7 : 1}
        disabled={!canInteract}
        onPress={handlePress}>
        {/* Highlight Ring */}
        {shouldShowGlow && (
          <View style={styles.highlightContainer}>
            <View style={styles.hollowCircle}>
              <View style={styles.dashedCircleContainer}>
                <Animated.View
                  style={[
                    styles.dashedCircle,
                    {transform: [{rotate: rotateInterpolate}]},
                  ]}>
                  <Svg height={RFValue(20)} width={RFValue(20)}>
                    <Circle
                      cx={RFValue(10)}
                      cy={RFValue(10)}
                      r={RFValue(8)}
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      strokeDashoffset="0"
                      fill="transparent"
                    />
                  </Svg>
                </Animated.View>
              </View>
            </View>
          </View>
        )}

        {/* Piece Image with Glow */}
        <Animated.View
          style={[
            styles.pieceContainer,
            {
              transform: [
                {scale: Animated.multiply(scaleAnimation, moveScaleAnimation)},
                {translateY: translateYAnimation},
                {translateX: translateXAnimation},
              ],
            },
          ]}>
          {/* Glow Layer - separate animated view for opacity */}
          {shouldShowGlow && (
            <Animated.View
              style={[
                styles.glowLayer,
                {
                  opacity: glowOpacity,
                },
              ]}
            />
          )}

          {/* Actual Piece Image */}
          <Image
            source={pieceImage}
            style={[
              styles.pieceImage,
              cell ? styles.cellPieceImage : styles.pocketPieceImage,
            ]}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Selection indicator */}
        {isSelected && <View style={styles.selectionIndicator} />}
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
    overflow: 'visible', // Allow content to overflow
  },
  highlightContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  hollowCircle: {
    width: RFValue(18),
    height: RFValue(18),
    borderRadius: RFValue(9),
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dashedCircleContainer: {
    position: 'absolute',
    width: RFValue(24),
    height: RFValue(24),
    alignItems: 'center',
    justifyContent: 'center',
    top: -RFValue(3),
    left: -RFValue(4),
  },
  dashedCircle: {
    width: RFValue(24),
    height: RFValue(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    overflow: 'visible', // Allow content to overflow
  },
  glowLayer: {
    position: 'absolute',
    width: RFValue(20),
    height: RFValue(20),
    borderRadius: RFValue(25),
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: ANIMATION_CONFIG.GLOW_RADIUS,
    elevation: 8,
    zIndex: 1, // Keep this below the piece image
  },
  pieceImage: {
    resizeMode: 'contain',
    zIndex: 5, // Increase z-index to be above everything else
  },
  cellPieceImage: {
    width: RFValue(30),
    height: RFValue(30),
    zIndex: 500000,
    overflow: 'visible',
    alignSelf: 'center',
  },
  pocketPieceImage: {
    width: RFValue(24),
    height: RFValue(24),
    zIndex: 500,
  },
  selectionIndicator: {
    position: 'absolute',
    bottom: -RFValue(2),
    width: RFValue(6),
    height: RFValue(6),
    borderRadius: RFValue(3),
    backgroundColor: '#FFD700',
    zIndex: 3,
  },
});

Pile.displayName = 'Pile';

export default Pile;
