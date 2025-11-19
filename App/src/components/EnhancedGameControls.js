import LottieView from 'lottie-react-native';
import {useState, useEffect, useRef} from 'react';
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
import DiceRoll from '../assets/animation/diceroll.json';
import {RFValue} from 'react-native-responsive-fontsize';
import {PLAYER_COLORS_GRADIENT} from '../constants/Colors';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// Image assets for buttons
const ICONS = {
  DICE: require('../assets/images/dice/1.png'),
  CHAT: require('../assets/images/Icons/chat-icon.png'),
  SETTINGS: require('../assets/images/Icons/info-icon.png'),
  MUTE: require('../assets/images/Icons/mute-icon.png'),
  UNMUTE: require('../assets/images/Icons/unmute-icon.png'),
  EXIT: require('../assets/images/Icons/exit-icon.png'),
  INFO: require('../assets/images/Icons/info-icon.png'),
};

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

/**
 * Enhanced Dice component with animations
 */
const EnhancedDice = ({currentPlayer, value, onRoll, canRoll}) => {
  const [isRolling, setIsRolling] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  console.log(currentPlayer);
  useEffect(() => {
    if (value > 0) {
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
      setIsRolling(false);
    }
  }, [value, spinValue, scaleValue]);

  // Spin transformation
  const spin = spinValue.interpolate({
    inputRange: [0, 4],
    outputRange: ['0deg', '1440deg'],
  });

  return (
    <TouchableOpacity
      style={styles.diceButton}
      onPress={() => {
        if (canRoll) {
          setIsRolling(true);
          onRoll();
        }
      }}
      disabled={!canRoll}
      activeOpacity={canRoll ? 0.7 : 1}>
      <LinearGradient
        colors={
          currentPlayer && currentPlayer.color
            ? PLAYER_COLORS_GRADIENT[currentPlayer.color.toLowerCase()].gradient
            : ['#9575CD', '#7E57C2']
        }
        style={[styles.diceGradient, !canRoll && styles.disabledDice]}>
        <Animated.View
          style={[
            styles.diceImageContainer,
            {
              transform: [{rotate: spin}, {scale: scaleValue}],
            },
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
              style={[styles.diceImage, !value && styles.defaultImage]}
              resizeMode="contain"
            />
          )}
        </Animated.View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

/**
 * Enhanced Game Controls component
 */
const EnhancedGameControls = ({
  onDiceRoll,
  diceValue,
  canRoll,
  isMyTurn,
  gameStatus,
  isGamePaused,
  currentPlayer,
  timeRemaining,
  onTimeUp,
  hasValidMoves,
  onExit,
  onChatToggle,
  hasUnreadMessages,
  isMuted,
  onToggleMute,
  onShowInfo,
}) => {
  // Timer state for turn countdown
  // Remove local countdown state and timerRef
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for urgent timer
  useEffect(() => {
    if (timeRemaining <= 10 && timeRemaining > 0 && isMyTurn) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [timeRemaining, isMyTurn, pulseAnim]);

  console.log(gameStatus);

  const getTimerColor = () => {
    if (timeRemaining <= 5) return '#FF5252';
    if (timeRemaining <= 10) return '#FF9800';
    return '#4CAF50';
  };

  const getInstructionText = () => {
    if (!isMyTurn)
      return `Wait for ${currentPlayer?.username || 'Unknown'}'s turn`;
    if (diceValue === 0) return 'Tap dice to roll';
    if (diceValue > 0 && hasValidMoves) return 'Select a piece to move';
    if (diceValue > 0 && !hasValidMoves) return 'No valid moves - turn ending';
    return 'Roll the dice';
  };

  return (
    <View style={styles.container}>
      {/* Turn Indicator */}
      <View
        style={[
          styles.turnIndicator,
          {backgroundColor: isMyTurn ? '#4CAF50' : '#666'},
        ]}>
        <Text style={styles.turnText}>
          {isMyTurn
            ? 'Your Turn!'
            : `${currentPlayer?.username || 'Unknown'}'s Turn`}
        </Text>
      </View>

      {/* Timer - Show when game is active */}
      {gameStatus === 'IN_PROGRESS' && !isGamePaused && (
        <Animated.View
          style={[
            styles.timerContainer,
            {
              backgroundColor: getTimerColor(),
              transform: [
                {scale: timeRemaining <= 10 && isMyTurn ? pulseAnim : 1},
              ],
            },
          ]}>
          <Text style={styles.timerText}>
            {Math.floor(timeRemaining / 60)}:
            {(timeRemaining % 60).toString().padStart(2, '0')}
          </Text>
        </Animated.View>
      )}

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
        <EnhancedDice
          currentPlayer={currentPlayer}
          value={diceValue}
          onRoll={onDiceRoll}
          canRoll={canRoll}
        />

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

      {/* Instruction text */}
      <Text style={styles.instructionText}>{getInstructionText()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 15,
    // backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  turnIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  turnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: RFValue(14),
  },
  timerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 15,
    marginBottom: 10,
    elevation: 2,
  },
  timerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: RFValue(16),
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 10,
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
  defaultImage: {
    width: 60,
    height: 60,
  },
  disabledDice: {
    opacity: 0.1,
  },
  rollingDice: {
    height: 80,
    width: 80,
    zIndex: 99,
    top: -25,
    position: 'absolute',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: RFValue(12),
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 5,
    paddingHorizontal: 20,
  },
});

export default EnhancedGameControls;
