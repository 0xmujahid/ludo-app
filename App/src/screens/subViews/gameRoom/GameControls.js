import LottieView from 'lottie-react-native';
import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import DiceRoll from '../../../assets/animation/diceroll.json';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// Image assets for buttons
const ICONS = {
  DICE: require('../../../assets/images/dice/1.png'),
  CHAT: require('../../../assets/images/Icons/chat-icon.png'),
  SETTINGS: require('../../../assets/images/Icons/info-icon.png'),
  MUTE: require('../../../assets/images/Icons/mute-icon.png'),
  UNMUTE: require('../../../assets/images/Icons/unmute-icon.png'),
  EXIT: require('../../../assets/images/Icons/exit-icon.png'),
  INFO: require('../../../assets/images/Icons/info-icon.png'),
};

// Dice face images
const DICE_FACES = {
  0: require('../../../assets/images/dice/0.png'),
  1: require('../../../assets/images/dice/1.png'),
  2: require('../../../assets/images/dice/2.png'),
  3: require('../../../assets/images/dice/3.png'),
  4: require('../../../assets/images/dice/4.png'),
  5: require('../../../assets/images/dice/5.png'),
  6: require('../../../assets/images/dice/6.png'),
};

/**
 * Enhanced Dice component with animations
 */
const EnhancedDice = ({value, onRoll, canRoll}) => {
  const [isRolling, setIsRolling] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (value) {
      // Animate when dice value changes
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(spinValue, {
            toValue: 4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(spinValue, {
            toValue: 0,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [value, spinValue, scaleValue]);

  useEffect(() => {
    if (isRolling) {
      setTimeout(() => {
        setIsRolling(false);
      }, 800);
    }
  }, [isRolling]);

  // Spin transformation
  const spin = spinValue.interpolate({
    inputRange: [0, 4],
    outputRange: ['0deg', '1440deg'],
  });

  return (
    <TouchableOpacity
      style={styles.diceButton}
      onPress={() => {
        setIsRolling(true);
        onRoll();
      }}
      disabled={!canRoll}
      activeOpacity={canRoll ? 0.7 : 1}>
      <LinearGradient
        colors={canRoll ? ['#673AB7', '#4A148C'] : ['#9575CD', '#7E57C2']}
        style={[styles.diceGradient, !canRoll && styles.disabledDice]}>
        <Animated.View
          style={[
            styles.diceImageContainer,
            {transform: [{rotate: spin}, {scale: scaleValue}]},
          ]}>
          {isRolling ? (
            <LottieView
              source={DiceRoll}
              style={styles.rollingDice}
              loop={false}
              autoPlay
              cacheComposition={true}
              hardwareAccelerationAndroid
            />
          ) : (
            <Image
              source={DICE_FACES[value || 0]}
              style={[styles.diceImage, !value && styles.defalutImage]}
              resizeMode="contain"
            />
          )}
        </Animated.View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

/**
 * Game Controls component
 */
const GameControls = ({
  onDiceRoll,
  diceValue,
  canRoll,
  onExit,
  onPause,
  isGamePaused,
  hasUnreadMessages,
  onChatToggle,
  gameStatus,
  isMuted,
  onToggleMute,
  onShowInfo,
}) => {
  // Timer state for turn countdown
  const [countdown, setCountdown] = useState(30);
  const timerRef = useRef(null);

  // Setup timer for turns
  useEffect(() => {
    if (false && gameStatus === 'IN_PROGRESS' && !isGamePaused) {
      setCountdown(30); // Reset to 30 seconds for each turn

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [canRoll, gameStatus, isGamePaused]);

  return (
    <View style={styles.container}>
      {/* Game controls row */}
      <View style={styles.controlsRow}>
        {/* Left buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onExit}
            activeOpacity={0.7}>
            <Image source={ICONS.EXIT} style={styles.buttonIcon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              hasUnreadMessages && styles.notificationButton,
            ]}
            onPress={onChatToggle}
            activeOpacity={0.7}>
            <Image source={ICONS.CHAT} style={styles.buttonIcon} />
            {hasUnreadMessages && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        </View>

        {/* Center dice */}
        <EnhancedDice value={diceValue} onRoll={onDiceRoll} canRoll={canRoll} />

        {/* Right buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onToggleMute}
            activeOpacity={0.7}>
            <Image
              source={isMuted ? ICONS.MUTE : ICONS.UNMUTE}
              style={styles.buttonIcon}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={onShowInfo}
            activeOpacity={0.7}>
            <Image source={ICONS.INFO} style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Turn timer (only shown when it's player's turn) */}
      {false && gameStatus === 'IN_PROGRESS' && !isGamePaused && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>Your turn: {countdown}s</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  buttonIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  notificationButton: {
    borderColor: '#FF5252',
    borderWidth: 1.5,
  },
  notificationDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF5252',
  },
  diceButton: {
    marginHorizontal: 20,
  },
  diceGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  diceImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceImage: {
    width: 36,
    height: 36,
  },
  defalutImage: {
    width: 60,
    height: 60,
  },
  disabledDice: {
    opacity: 0.6,
  },
  rollingDice: {
    height: 80,
    width: 80,
    zIndex: 99,
    top: -25,
    position: 'absolute',
  },
  timerContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 12,
  },
});

export default GameControls;
