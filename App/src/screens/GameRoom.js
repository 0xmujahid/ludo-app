import React, {useState, useMemo, useCallback, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  Image,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  BackHandler,
  Modal,
  Button,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';

import EnhancedGameControls from '../components/EnhancedGameControls';
import GameChat from './subViews/gameRoom/GameChat';
import Board from '../components/Board/Board';

import GameCompletionModal from '../components/GameCompletionModal';

import useGameState from './hooks/gameHook';

import {selectUserId} from '../redux/reducers/app/appSelectors';
import {useSelector, useDispatch} from 'react-redux';

import {initializeGameWithPaths} from '../utils/gameIntegration';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const BACKGROUND = require('../assets/images/bg.jpg');
const HOME_ICON = require('../assets/images/Icons/home-white.png');

const QuickGameTimerBar = ({timeRemaining, totalTime, warningZone}) => {
  const progress =
    totalTime && timeRemaining >= 0 ? timeRemaining / totalTime : 0;
  const minutes = Math.floor((timeRemaining || 0) / 60);
  const seconds = (timeRemaining || 0) % 60;
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    let interval;
    if (warningZone) {
      interval = setInterval(() => setFlash(f => !f), 500);
    } else {
      setFlash(false);
    }
    return () => interval && clearInterval(interval);
  }, [warningZone]);
  return (
    <View
      style={{
        width: '100%',
        padding: 8,
        backgroundColor: warningZone && flash ? '#ff5252' : '#222',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}>
      <Text
        style={{
          color: warningZone ? '#fff' : '#fff',
          fontWeight: 'bold',
          fontSize: 18,
        }}>
        {minutes}:{seconds.toString().padStart(2, '0')} remaining
      </Text>
      <View
        style={{
          width: '90%',
          height: 8,
          backgroundColor: '#444',
          borderRadius: 4,
          marginTop: 6,
        }}>
        <View
          style={{
            width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
            height: 8,
            backgroundColor: warningZone ? '#ff5252' : '#4caf50',
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
};

const GameRoom = ({route}) => {
  const navigation = useNavigation();
  const {gameId, roomCode, gameType} = route.params;
  const userId = useSelector(selectUserId);

  const [showInfo, setShowInfo] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const {
    gameState,
    players,
    plottedPieces,
    currentTurn,
    diceValue,
    selectedToken,
    validMoves,
    hasValidMoves,
    gameStatus,
    playersColor,
    playerDetails,
    totalPlayers,

    socket,
    connectionState,
    error,
    loading,

    chat,
    isGamePaused,
    hasUnreadMessages,

    reconnect,
    rollDice,
    selectToken,
    moveToken,
    sendMessage,
    togglePause,
    leaveGame,
    setHasUnreadMessages,

    // Enhanced features
    canRollDice,
    canSelectPieces,
    handleTurnTimeout,
    calculateTimeRemaining,
    currentPlayer,
    gameCompletionData,
    clearGameCompletionData,

    // Turn timeout features
    timeRemaining,
    playerLives,

    // Debug function
    testTurnTimeoutEvents,

    // Quick game timer state
    isQuickGame,
    quickGameTimeRemaining,
    quickGameTotalTime,
    quickGameWarningZone,
    quickGameFinalRankings,
    quickGameWinner,
    setQuickGameFinalRankings,
    setQuickGameWinner,

    // Animation functions
    animatePieceMovement,
    clearPieceAnimation,
    isPieceAnimating,
    getPieceAnimationData,
    movingPieces,
  } = useGameState(roomCode, gameId, gameType);

  console.log('GameRoom state:', {
    gameStatus,
    currentTurn,
    diceValue,
    selectedToken,
    validMoves,
    plottedPieces,
    players,
    playersColor,
    playerDetails,
    connectionState,
    loading,
    error: error?.message,
  });

  const handleChatToggle = useCallback(() => {
    setShowChat(prev => !prev);
    if (!showChat) {
      setHasUnreadMessages(false);
    }
  }, [showChat, setHasUnreadMessages]);

  const isMyTurn = useMemo(() => currentTurn === userId, [currentTurn, userId]);

  // Modal state for exit confirmation
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  // Replace handleExit to open the modal
  const handleExit = useCallback(() => {
    setIsExitModalOpen(true);
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const handleShowInfo = useCallback(() => {
    setShowInfo(true);
  }, []);

  console.log('connectionState', connectionState);

  // Initialize game with new path system when players change
  useEffect(() => {
    if (players.length > 0 && !loading) {
      initializeGameWithPaths(players, totalPlayers);
    }
  }, [players, totalPlayers, loading]);

  // Handler to close quick game results modal
  const handleCloseQuickGameResults = useCallback(() => {
    setQuickGameFinalRankings(null);
    setQuickGameWinner(null);
  }, [setQuickGameFinalRankings, setQuickGameWinner]);

  // Handle hardware back button (Android) and navigation back (iOS)
  useEffect(() => {
    const onBackPress = () => {
      if (!isExitModalOpen) {
        setIsExitModalOpen(true);
        return true; // Prevent default navigation
      }
      // If modal is open, allow default back (or close modal)
      return false;
    };
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (!isExitModalOpen) {
        e.preventDefault();
        setIsExitModalOpen(true);
      }
      // If modal is open, allow navigation
    });
    return () => {
      backHandler.remove();
      unsubscribe && unsubscribe();
    };
  }, [isExitModalOpen, navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#330066" />

      {/* Quick Game Timer Bar */}
      {isQuickGame && quickGameTotalTime && quickGameTimeRemaining !== null && (
        <QuickGameTimerBar
          timeRemaining={quickGameTimeRemaining}
          totalTime={quickGameTotalTime}
          warningZone={quickGameWarningZone}
        />
      )}

      <ImageBackground
        source={BACKGROUND}
        style={styles.backgroundImage}
        resizeMode="repeat">
        <LinearGradient
          colors={['rgba(51, 0, 102, 0.97)', 'rgba(25, 0, 51, 0.97)']}
          style={styles.container}>
          {/* Header with settings and connection status */}
          <View style={styles.header}>
            <TouchableOpacity style={{padding: 8}} onPress={handleExit}>
              <Image source={HOME_ICON} style={styles.homeIconSmall} />
            </TouchableOpacity>

            {/* <Text style={styles.gameTitle}>Ludo Game</Text> */}

            <View style={styles.connectionStatus}>
              <View
                style={[
                  styles.connectionDot,
                  {
                    backgroundColor:
                      connectionState === 'connected'
                        ? '#4CAF50'
                        : connectionState === 'connecting'
                        ? '#FFD700'
                        : '#FF5252',
                  },
                ]}
              />
              <Text style={styles.connectionText}>
                {connectionState === 'connected'
                  ? 'Connected'
                  : connectionState === 'connecting'
                  ? 'Connecting...'
                  : connectionState === 'disconnected'
                  ? 'Disconnected'
                  : 'Error'}
              </Text>
            </View>
          </View>

          {/* Main game board area */}
          {loading ? (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>Loading Game...</Text>
              {connectionState === 'connecting' && (
                <Text style={styles.loadingSubText}>
                  Connecting to server...
                </Text>
              )}
              {error && (
                <Text style={styles.errorText}>
                  {error.message || 'An error occurred'}
                </Text>
              )}
              {connectionState === 'disconnected' && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={reconnect}>
                  <Text style={styles.retryText}>Reconnect</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.gameArea}>
              <Board
                gameState={gameState}
                players={players}
                plottedPieces={plottedPieces}
                currentTurn={currentTurn}
                userId={userId}
                diceValue={diceValue}
                validMoves={validMoves}
                selectedToken={selectedToken}
                isGamePaused={isGamePaused}
                onDiceRoll={rollDice}
                onSelectToken={selectToken}
                onMoveToken={moveToken}
                playerDetails={playerDetails}
                playersColor={playersColor}
                movingPieces={movingPieces}
                isPieceAnimating={isPieceAnimating}
                getPieceAnimationData={getPieceAnimationData}
              />
            </View>
          )}

          {/* Enhanced Game controls at the bottom */}
          <View style={styles.controlsArea}>
            {!loading && (
              <EnhancedGameControls
                onDiceRoll={rollDice}
                diceValue={diceValue}
                canRoll={canRollDice}
                isMyTurn={isMyTurn}
                gameStatus={gameStatus}
                isGamePaused={isGamePaused}
                currentPlayer={currentPlayer}
                timeRemaining={timeRemaining}
                onTimeUp={handleTurnTimeout}
                hasValidMoves={hasValidMoves}
                onExit={handleExit}
                onChatToggle={handleChatToggle}
                hasUnreadMessages={hasUnreadMessages}
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
                onShowInfo={handleShowInfo}
              />
            )}
          </View>

          {/* Chat overlay when toggled */}
          {showChat && (
            <View style={styles.chatOverlay}>
              <GameChat
                messages={chat.messages}
                players={players}
                userId={userId}
                onSendMessage={sendMessage}
                onClose={handleChatToggle}
              />
            </View>
          )}

          {/* Info panel overlay when toggled */}
          {showInfo && (
            <View style={styles.infoOverlay}>
              <TouchableOpacity
                style={styles.closeInfoButton}
                onPress={() => setShowInfo(false)}>
                <Text style={styles.closeInfoText}>×</Text>
              </TouchableOpacity>

              <Text style={styles.infoTitle}>Game Rules</Text>

              <View style={styles.infoContent}>
                <Text style={styles.infoText}>
                  • Roll the dice on your turn (
                  {playerDetails[
                    isMyTurn
                      ? `player${
                          players?.find(p => p.userId === userId)?.position + 1
                        }`
                      : 'player?'
                  ]?.username || 'Your'}{' '}
                  Turn)
                </Text>
                <Text style={styles.infoText}>
                  • Move your tokens{' '}
                  {diceValue > 0 ? `(Dice: ${diceValue})` : ''}
                </Text>
                <Text style={styles.infoText}>
                  • Need 6 to move pieces out of home
                </Text>
                <Text style={styles.infoText}>
                  • Capture opponent tokens by landing on them
                </Text>
                <Text style={styles.infoText}>
                  • Get all your tokens to the home area to win
                </Text>
                <Text style={styles.infoText}>
                  • Roll a 6 to get an extra turn
                </Text>
              </View>
            </View>
          )}

          {/* Game Completion Modal */}
          {/* {false && ( */}
          <GameCompletionModal
            isVisible={!!gameCompletionData}
            gameResults={gameCompletionData}
            onClose={() => clearGameCompletionData && clearGameCompletionData()}
            onPlayAgain={() => {
              clearGameCompletionData && clearGameCompletionData();
              navigation.reset({
                index: 0,
                routes: [{name: 'GameListScreen'}],
              });
            }}
            onGoHome={() => {
              clearGameCompletionData && clearGameCompletionData();
              navigation.reset({
                index: 0,
                routes: [{name: 'MainTabs'}],
              });
            }}
          />
          {/* )} */}

          {/* Display error outside of loading */}
          {/* {!loading && error && (
            <View style={stylesss.errorOverlay}>
              <Text style={styles.errorText}>
                {error.message || 'An error occurred'}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={reconnect}>
                <Text style={styles.retryText}>Reconnect</Text>
              </TouchableOpacity>
            </View>
          )} */}
        </LinearGradient>
      </ImageBackground>
      <Modal
        visible={isExitModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsExitModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Leave Game</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to leave this game?
            </Text>
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setIsExitModalOpen(false)}
              />
              <Button
                title="Leave"
                color="#d32f2f"
                onPress={() => {
                  leaveGame();
                  navigation.reset({
                    index: 0,
                    routes: [{name: 'MainTabs'}],
                  });
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#330066',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    // paddingTop: StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
    // backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  gameTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  homeIconSmall: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  gameArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  controlsArea: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 5,
    alignItems: 'center',
    // backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  chatOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    zIndex: 30,
  },
  infoOverlay: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 10,
    zIndex: 40,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  closeInfoButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeInfoText: {
    fontSize: 24,
    color: '#330066',
    fontWeight: 'bold',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#330066',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoContent: {
    marginTop: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  loadingOverlay: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  loadingSubText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginBottom: 20,
  },
  errorOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    zIndex: 50,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  debugButton: {
    backgroundColor: '#FFD700', // Yellow color for debug button
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 10,
  },
  debugButtonText: {
    color: '#330066',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 300,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#222',
  },
  modalMessage: {
    fontSize: 16,
    color: '#444',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
});

export default GameRoom;
