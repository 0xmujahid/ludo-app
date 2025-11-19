import React, {useEffect, useRef} from 'react';
import {
  Animated,
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

// Token/Pawn images for each color
const TOKEN_IMAGES = {
  RED: require('../../../assets/images/piles/red.png'),
  BLUE: require('../../../assets/images/piles/blue.png'),
  GREEN: require('../../../assets/images/piles/green.png'),
  YELLOW: require('../../../assets/images/piles/yellow.png'),
  DEFAULT: require('../../../assets/images/piles/yellow.png'),
};

// Color configurations
const TOKEN_COLORS = {
  RED: {
    primary: '#FF4141',
    secondary: '#CF0A0A',
    gradient: ['#FF6B6B', '#CF0A0A'],
  },
  BLUE: {
    primary: '#3871DF',
    secondary: '#1F4690',
    gradient: ['#6C9BFF', '#1F4690'],
  },
  GREEN: {
    primary: '#4CAF50',
    secondary: '#2E7D32',
    gradient: ['#7BCB7D', '#2E7D32'],
  },
  YELLOW: {
    primary: '#FFC107',
    secondary: '#FF9800',
    gradient: ['#FFD54F', '#FF9800'],
  },
  DEFAULT: {
    primary: '#9E9E9E',
    secondary: '#616161',
    gradient: ['#BDBDBD', '#616161'],
  },
};

/**
 * Normalize color to match our color keys
 */
const normalizeColor = color => {
  if (!color || typeof color !== 'string') return 'DEFAULT';

  const upperColor = color.toUpperCase();
  if (['RED', 'BLUE', 'GREEN', 'YELLOW'].includes(upperColor)) {
    return upperColor;
  }

  // Map based on color references
  if (upperColor.includes('RED')) return 'RED';
  if (upperColor.includes('BLUE')) return 'BLUE';
  if (upperColor.includes('GREEN')) return 'GREEN';
  if (upperColor.includes('YELLOW')) return 'YELLOW';

  return 'DEFAULT';
};

/**
 * Token Component - Represents a game piece/pawn
 */
const Token = ({
  token,
  size = 36,
  isSelected = false,
  isCurrentTurn = false,
  onPress,
}) => {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Get normalized color and image
  const normalizedColor = normalizeColor(token.color);
  const colorData = TOKEN_COLORS[normalizedColor] || TOKEN_COLORS.DEFAULT;
  const tokenImage = TOKEN_IMAGES[normalizedColor] || TOKEN_IMAGES.DEFAULT;

  // Pulse animation when selected
  useEffect(() => {
    if (isSelected) {
      // Create a repeating pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      // Reset to normal size with a spring animation
      Animated.spring(pulseAnim, {
        toValue: 1,
        tension: 40,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  }, [isSelected, pulseAnim]);

  // "My turn" animation - subtle rotation
  useEffect(() => {
    if (isCurrentTurn) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: -1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      // Reset rotation
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isCurrentTurn, rotateAnim]);

  // Calculate position based on token's position property
  // This would need to be replaced with real positioning logic based on your board
  const getPosition = () => {
    if (!token.position) return {x: 0, y: 0};

    // In a real implementation, convert from game coordinates to screen coordinates
    return {x: 0, y: 0};
  };

  const position = getPosition();

  // Rotation for animation
  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  return (
    <TouchableOpacity
      onPress={() => onPress && onPress(token.id)}
      activeOpacity={0.8}
      style={[
        styles.tokenContainer,
        {
          width: size,
          height: size,
          left: position.x,
          top: position.y,
        },
      ]}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            transform: [{scale: pulseAnim}, {rotate}],
          },
          isCurrentTurn && styles.currentTurnGlow,
        ]}>
        <LinearGradient
          colors={colorData.gradient}
          style={[
            styles.tokenGradient,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}>
          <Image
            source={tokenImage}
            style={[
              styles.tokenImage,
              {
                width: size * 0.7,
                height: size * 0.7,
              },
            ]}
            resizeMode="contain"
          />
        </LinearGradient>
      </Animated.View>

      {/* Selection indicator */}
      {isSelected && (
        <Animated.View
          style={[
            styles.selectionRing,
            {
              width: size + 8,
              height: size + 8,
              borderRadius: (size + 8) / 2,
              borderColor: colorData.primary,
              transform: [{scale: pulseAnim}],
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tokenContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  animatedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  tokenImage: {
    opacity: 0.9,
  },
  selectionRing: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FFF',
    backgroundColor: 'transparent',
  },
  currentTurnGlow: {
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 8,
  },
});

export default Token;
