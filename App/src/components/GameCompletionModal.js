import React, {useEffect, useState} from 'react';

import {
  Animated,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Pressable,
} from 'react-native';
import Modal from 'react-native-modal';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import GradientButton from './GradientButton';
import {playSound} from '../utils/soundUtils';
import {navigate, resetAndNavigate} from '../utils/navigationUtils';
import {PLAYER_COLORS} from '../constants/Colors';
import Trophy from '../assets/animation/trophy.json';
import Firework from '../assets/animation/firework.json';
import {RFValue} from 'react-native-responsive-fontsize';
import HomeButton from '../screens/subViews/homeScreen/homeButton';
import CustomText from './CustomText';
import {FontFamily} from '../constants/Fonts';
import {deviceWidth} from '../constants/Scaling';
import Button from './Button';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const GameCompletionModal = ({
  isVisible,
  gameResults,
  onClose,
  onPlayAgain,
  onGoHome,
}) => {
  const [showModal, setShowModal] = useState(false);
  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const bounceAnim = React.useRef(new Animated.Value(0)).current;

  const buttonScale = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '2deg'],
  });

  useEffect(() => {
    if (isVisible && gameResults) {
      setShowModal(true);
      // playSound('game_end');
    } else {
      setShowModal(false);
    }
  }, [isVisible, gameResults]);

  const handleClose = () => {
    setShowModal(false);
    onClose && onClose();
  };

  const handlePlayAgain = () => {
    setShowModal(false);
    onPlayAgain && onPlayAgain();
  };

  const handleGoHome = () => {
    setShowModal(false);
    resetAndNavigate('MainTabs');
    onGoHome && onGoHome();
  };

  if (!gameResults) return null;

  const {winner, players, finalState, endTime} = gameResults;

  console.log('!!!!!!!', gameResults);

  // Sort players by rank (winner first, then by points/performance)
  const rankedPlayers = [...players].sort((a, b) => {
    if (a.userId === winner.id) return -1;
    if (b.userId === winner.id) return 1;
    return (b.points || 0) - (a.points || 0);
  });

  const getPlayerRank = playerIndex => {
    const ranks = ['1st', '2nd', '3rd', '4th'];
    return ranks[playerIndex] || `${playerIndex + 1}th`;
  };

  const getPlayerColor = color => {
    return PLAYER_COLORS[color?.toLowerCase()] || '#666666';
  };

  const getMedalIcon = rank => {
    switch (rank) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return '🏆';
    }
  };

  return (
    <Modal
      style={styles.modal}
      isVisible={showModal}
      backdropColor="black"
      backdropOpacity={0.8}
      onBackdropPress={() => {}}
      animationIn="zoomIn"
      animationOut="zoomOut"
      onBackButtonPress={() => {}}>
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={styles.gradientContainer}>
        {/* Firework Animation */}
        <LottieView
          autoPlay
          hardwareAccelerationAndroid
          loop={true}
          source={Firework}
          style={styles.fireworkAnimation}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <LottieView
              autoPlay
              hardwareAccelerationAndroid
              loop={false}
              source={Trophy}
              style={styles.trophyAnimation}
            />
            <Text style={styles.winnerText}>
              🎉 {rankedPlayers[0]?.username || 'Player'} Wins! 🎉
            </Text>
          </View>

          {/* Results Table */}
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Final Results</Text>

            {rankedPlayers.map((player, index) => (
              <View key={player.userId} style={styles.playerRow}>
                <View style={styles.rankSection}>
                  <Text style={styles.medalIcon}>{getMedalIcon(index)}</Text>
                  {/* <Text
                    style={{
                      ...styles.rankText,
                      color: getPlayerColor(player.color),
                    }}>
                    {getPlayerRank(index)}
                  </Text> */}
                </View>

                <View style={styles.playerInfo}>
                  {/* <View
                    style={[
                      styles.playerColorDot,
                      {backgroundColor: getPlayerColor(player.color)},
                    ]}
                  /> */}
                  <Text style={styles.playerName} numberOfLines={1}>
                    {player.username || `Player ${player.position + 1}`}
                  </Text>
                </View>

                <View style={styles.statsSection}>
                  <Text style={styles.pointsText}>
                    {player.points || 0} pts
                  </Text>
                  <Text style={styles.killsText}>
                    {player.kills || 0} Kills
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              size="medium"
              textStyle={{
                fontFamily: FontFamily.Bold,
                fontWeight: 600,
                size: RFValue(14),
              }}
              title={'Play Again'}
            />
            <Button
              size="medium"
              onPress={handleGoHome}
              textStyle={{
                fontFamily: FontFamily.Bold,
                fontWeight: 600,
                size: RFValue(14),
              }}
              title={'Home'}
              colors={['#000000ff', '#000000ff']}
            />
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
};

const formatGameDuration = endTime => {
  // Simple duration formatting - you might want to enhance this
  const duration = new Date(endTime).getTime() - Date.now() + 30 * 60 * 1000; // Approximate
  const minutes = Math.floor(duration / (1000 * 60));
  return `${minutes} min`;
};

const getWinnerPiecesHome = (finalState, winnerId) => {
  if (!finalState?.players?.[winnerId]?.pieces) return '4/4';

  const pieces = finalState.players[winnerId].pieces;
  const homePieces = pieces.filter(piece => {
    // Check if piece is in home area (position > 100 typically indicates home area)
    return typeof piece === 'object' ? piece.pos > 100 : piece > 100;
  }).length;

  return `${homePieces}/4`;
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
  },
  gradientContainer: {
    borderRadius: 20,
    // width: SCREEN_WIDTH * 0.95,
    maxHeight: '90%',
    borderWidth: 2,
    borderColor: '#4facfeff',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  gameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: RFValue(16),
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.35,
    shadowRadius: 6.65,
    elevation: 11,
    overflow: 'hidden',
    height: RFValue(70),
  },
  fireworkAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    width: '100%',
    zIndex: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 1,
  },
  trophyAnimation: {
    height: 100,
    width: 100,
  },
  gameOverText: {
    fontSize: RFValue(16),
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  winnerText: {
    fontSize: RFValue(20),
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
  },
  resultsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: RFValue(16),
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
  },
  rankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  medalIcon: {
    fontSize: RFValue(18),
    marginRight: 8,
  },
  rankText: {
    fontSize: RFValue(12),
    color: 'white',
    fontWeight: 'bold',
  },
  playerInfo: {
    // flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  playerColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'white',
  },
  playerName: {
    fontSize: RFValue(14),
    color: 'white',
    fontWeight: '600',
  },
  statsSection: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  pointsText: {
    fontSize: RFValue(14),
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  killsText: {
    fontSize: RFValue(12),
    color: '#FF5722',
    marginTop: 2,
  },
  gameStats: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: RFValue(14),
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  statLabel: {
    fontSize: RFValue(12),
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statValue: {
    fontSize: RFValue(12),
    color: 'white',
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    marginVertical: 8,
  },
});

export default GameCompletionModal;
