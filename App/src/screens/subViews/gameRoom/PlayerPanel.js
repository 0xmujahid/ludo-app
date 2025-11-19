import React from 'react';
import {View, Text, StyleSheet, Image, Dimensions} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// Default colors for players - updated to match the reference image
const PLAYER_COLORS = {
  RED: {gradient: ['#FF5252', '#D32F2F']},
  BLUE: {gradient: ['#448AFF', '#2962FF']},
  GREEN: {gradient: ['#4CAF50', '#2E7D32']},
  YELLOW: {gradient: ['#FFC107', '#FF9800']},
  DEFAULT: {gradient: ['#9E9E9E', '#616161']},
};

// Default avatars
const DEFAULT_AVATARS = {
  RED: require('../../../assets/images/avatars/avatar-1.png'),
  BLUE: require('../../../assets/images/avatars/avatar-4.png'),
  GREEN: require('../../../assets/images/avatars/avatar-2.png'),
  YELLOW: require('../../../assets/images/avatars/avatar-5.png'),
  DEFAULT: require('../../../assets/images/avatars/avatar-3.png'),
};

// Heart icons
const HEART_FILLED = require('../../../assets/images/Icons/heart-filled.png');
const HEART_OUTLINE = require('../../../assets/images/Icons/heart-outline.png');

// Dice icon
const DICE_ICON = require('../../../assets/images/dice/1.png');

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
 * Player Panel Component that shows player info, score and status
 */
const PlayerPanel = ({player, isCurrentTurn, position}) => {
  // Create a safe player object with defaults to prevent errors
  const safePlayer = {
    username: player?.username || 'Unknown',
    avatarUrl: player?.avatarUrl || null,
    color: player?.color || 'DEFAULT',
    score: player?.points || 0,
    isOnline: player?.isActive !== false,
  };

  // Get normalized color for UI elements
  const normalizedColor = normalizeColor(safePlayer.color);
  const colorData = PLAYER_COLORS[normalizedColor] || PLAYER_COLORS.DEFAULT;
  const avatarImage = safePlayer.avatarUrl
    ? {uri: safePlayer.avatarUrl}
    : DEFAULT_AVATARS[normalizedColor] || DEFAULT_AVATARS.DEFAULT;

  // Hearts/lives for the player (as seen in reference image)
  const totalLives = 3;
  const currentLives = player?.lives || 3;

  return (
    <LinearGradient
      colors={colorData.gradient}
      style={[
        styles.container,
        position === 'topLeft' && styles.topLeftCorner,
        position === 'topRight' && styles.topRightCorner,
        position === 'bottomLeft' && styles.bottomLeftCorner,
        position === 'bottomRight' && styles.bottomRightCorner,
      ]}>
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          <Image source={avatarImage} style={styles.avatar} />
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.username} numberOfLines={1}>
          {safePlayer.username}
        </Text>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{safePlayer.score}</Text>
        </View>
      </View>

      {/* Bottom Section - Hearts */}
      <View style={styles.bottomSection}>
        {Array.from({length: totalLives}).map((_, index) => (
          <Image
            key={index}
            source={index < currentLives ? HEART_FILLED : HEART_OUTLINE}
            style={styles.heartIcon}
          />
        ))}
      </View>

      {/* Current turn indicator */}
      {isCurrentTurn && (
        <View style={styles.turnIndicator}>
          <Image source={DICE_ICON} style={styles.diceIcon} />
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH * 0.28,
    height: SCREEN_WIDTH * 0.28,
    borderRadius: 16,
    padding: 12,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  infoSection: {
    marginTop: 6,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginRight: 4,
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  heartIcon: {
    width: 18,
    height: 18,
    marginRight: 5,
  },
  turnIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceIcon: {
    width: 18,
    height: 18,
  },
});

export default PlayerPanel;
