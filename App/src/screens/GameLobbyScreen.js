import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, StyleSheet, Dimensions, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import {ChevronLeftIcon} from 'react-native-heroicons/outline';
import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import Wrapper from '../layout/Wrapper';
import {useDispatch, useSelector} from 'react-redux';
import {gameMatchmakingApiCall} from '../api/game';
import socketService from '../api/socketService';
import {navigate} from '../utils/navigationUtils';
import Snackbar from 'react-native-snackbar';
import {selectUserInfo} from '../redux/reducers/app/appSelectors';
import {deviceHeight} from '../constants/Scaling';

const {width, height} = Dimensions.get('window');

const GameLobbyScreen = ({route}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {gameType} = route.params;
  const userInfo = useSelector(selectUserInfo);
  const [connect, setConnected] = useState(false);
  const [searchingStatus, setSearchingStatus] = useState('Connecting');
  const [queuePosition, setQueuePosition] = useState(null);
  const [matchFound, setMatchFound] = useState({});
  const [isGameStarted, setIsGameStarted] = useState(false);
  const pulseAnim = useSharedValue(1);
  const rotateAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(0);
  const socketRef = useRef(null);
  const lottieRef = useRef(null);

  const handleMatchmakingCall = async () => {
    const payload = {
      gameTypeId: gameType.id,
      preferredVariant: gameType.variant,
      region: 'India',
    };
    // await dispatch(
    //   gameMatchmakingApiCall(
    //     payload,
    //     data => {
    //       console.log('Matchmaking successfully initiated:', data);
    //     },
    //     error => {
    //       console.error('Matchmaking error:', error);
    //       Snackbar.show({
    //         text: 'Failed to join matchmaking. Please try again.',
    //         duration: 3000,
    //         backgroundColor: 'red',
    //         fontFamily: FontFamily.Bold,
    //       });
    //       navigation.goBack();
    //     },
    //   ),
    // );
    socketService.emit('matchmakingUpdate', payload);
  };

  // Handle room joining when match is found
  useEffect(() => {
    if (matchFound.gameId) {
      console.log('Joining room with details:', matchFound);
      socketService.emit(socketService.gameEvents.JOIN_ROOM, {
        roomCode: matchFound.roomCode,
        gameId: matchFound.gameId,
        userId: userInfo.id,
      });
    }
  }, [matchFound.gameId, userInfo.id]);

  // Handle animations
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.2, {duration: 1000, easing: Easing.ease}),
        withTiming(1, {duration: 1000, easing: Easing.ease}),
      ),
      -1,
      true,
    );

    rotateAnim.value = withRepeat(
      withTiming(360, {duration: 3000, easing: Easing.linear}),
      -1,
    );

    fadeAnim.value = withTiming(1, {duration: 1000});
    const statusTimer = setTimeout(() => {
      lottieRef.current?.play();
    }, 2000);

    return () => {
      clearTimeout(statusTimer);
    };
  }, [fadeAnim, pulseAnim, rotateAnim]);

  // Setup socket connection and event handlers
  useEffect(() => {
    async function setupSocket() {
      socketRef.current = await socketService.connect();
      const socket = socketRef.current;
      if (!socket) {
        console.error('Socket connection failed');
        Snackbar.show({
          text: 'Connection failed. Please try again.',
          duration: 3000,
          backgroundColor: 'red',
          fontFamily: FontFamily.Bold,
        });
        return;
      }
      setConnected(true);

      // Handle matchmaking updates
      socket.on(socketService.gameEvents.MATCHMAKING_UPDATE, update => {
        console.log('Matchmaking update received:', update);
        switch (update.type) {
          case 'JOINED_QUEUE':
            setSearchingStatus('Searching for players');
            lottieRef.current?.play();
            if (update.queueStatus) {
              setQueuePosition(update.queueStatus.position);
            }
            break;
          case 'MATCH_FOUND':
            setSearchingStatus('Match Found');
            setMatchFound(prev => ({...prev, ...update}));
            // if (update.gameId && update.roomCode) {
            //   console.log(
            //     'Match found! Navigating to game room:',
            //     update.roomCode,
            //     'gameId:',
            //     update.gameId,
            //   );
            //   setTimeout(() => {
            //     navigate('GameRoom', {
            //       roomCode: update.roomCode,
            //       gameId: update.gameId,
            //       gameType: gameType,
            //     });
            //   }, 1500); // Small delay to show "Match Found" message
            // }
            break;
          case 'QUEUE_POSITION_UPDATE':
            if (update.queueStatus) {
              setQueuePosition(update.queueStatus.position);
              setSearchingStatus(
                `Position in Queue: ${update.queueStatus.position}`,
              );
            }
            break;
          case 'LEFT_QUEUE':
            // Handle leaving queue
            break;
          default:
            console.log('Unhandled matchmaking update:', update);
        }
      });

      // Handle system messages
      socket.on(socketService.gameEvents.SYSTEM_MESSAGE, update => {
        console.log('System message received:', update);
        if (update.type === 'GAME_STARTING') {
          setSearchingStatus('Game Starting');
          setIsGameStarted(true);
        } else if (update.type === 'WAITING') {
          Snackbar.show({
            text: update.message,
            duration: 3000,
            marginBottom: deviceHeight - 100,
            backgroundColor: 'black',
            fontFamily: FontFamily.Bold,
          });
        } else if (update.status === 'ERROR') {
          Snackbar.show({
            text: update.message,
            duration: 3000,
            backgroundColor: 'red',
            fontFamily: FontFamily.Bold,
          });
        }
      });

      // Handle room joining
      socket.on(socketService.gameEvents.ROOM_JOINED, update => {
        console.log('Room joined:', update);
        // Set player as ready when room is joined
        socket.emit(socketService.gameEvents.PLAYER_READY, {
          roomCode: update.roomCode || matchFound.roomCode,
          playerId: userInfo.id,
          isReady: true,
          gameId: update.gameId || matchFound.gameId,
        });
      });

      // Handle game state updates
      socket.on(socketService.gameEvents.GAME_STATE_UPDATED, update => {
        console.log('Game state updated:', update);
        if (update.type === 'GAME_STARTED' || update.type === 'GAME_STARTING') {
          setIsGameStarted(true);
        }
      });

      // Handle room leaving
      socket.on(socketService.gameEvents.ROOM_LEFT, update => {
        console.log('Room left:', update);
      });
    }

    setupSocket();

    return () => {
      const socket = socketRef.current;
      // Clean up socket listeners
      if (socket) {
        socket.off(socketService.gameEvents.MATCHMAKING_UPDATE);
        socket.off(socketService.gameEvents.SYSTEM_MESSAGE);
        socket.off(socketService.gameEvents.ROOM_JOINED);
        socket.off(socketService.gameEvents.ROOM_LEFT);
        socket.off(socketService.gameEvents.GAME_STATE_UPDATED);

        // Leave matchmaking queue when component unmounts
        socket.emit('leaveMatchmaking', {userId: userInfo.id});

        socketService.disconnect();
      }
    };
  }, [gameType, userInfo.id]);

  useEffect(() => {
    if (connect) {
      console.log('HIii');
      handleMatchmakingCall();
    }
  }, [connect]);

  // Navigate to game room when game starts
  useEffect(() => {
    if (isGameStarted && matchFound.roomCode) {
      navigate('GameRoom', {
        gameId: matchFound.gameId,
        roomCode: matchFound.roomCode,
        userId: userInfo.id,
        gameType: gameType,
      });
    }
  }, [isGameStarted, matchFound, userInfo.id, gameType]);

  // Cancel matchmaking and go back
  const handleCancel = useCallback(() => {
    socketService.emit('leaveMatchmaking', {userId: userInfo.id});
    navigation.goBack();
  }, [navigation, userInfo.id]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{scale: pulseAnim.value}],
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotateAnim.value}deg`}],
  }));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  return (
    <Wrapper>
      <View style={styles.container}>
        <Animated.View style={[styles.header, fadeStyle]}>
          <TouchableOpacity style={{marginRight: 25}} onPress={handleCancel}>
            <ChevronLeftIcon size={24} color="#fff" />
          </TouchableOpacity>
          <CustomText
            size={20}
            fontFamily={FontFamily.Bold}
            css={styles.headerTitle}>
            {gameType.name}
          </CustomText>
          <View style={{width: 24}} />
        </Animated.View>

        <Animated.View style={[styles.animationContainer, fadeStyle]}>
          <Animated.View style={[styles.pulseCircle, pulseStyle]} />
          <Animated.View style={[styles.rotatingCircle, rotateStyle]} />
          <LottieView
            ref={lottieRef}
            source={require('../assets/animation/searchingAnimation.json')}
            style={styles.lottieAnimation}
            autoPlay={false}
            loop
          />
        </Animated.View>

        <Animated.View style={[styles.statusContainer, fadeStyle]}>
          <CustomText
            size={24}
            fontFamily={FontFamily.Bold}
            css={styles.statusText}>
            {searchingStatus}
          </CustomText>
          {queuePosition && (
            <CustomText
              size={18}
              fontFamily={FontFamily.Medium}
              css={styles.queuePosition}>
              Position: {queuePosition}
            </CustomText>
          )}
          <CustomText size={16} css={styles.subStatusText}>
            This may take a few moments
          </CustomText>
        </Animated.View>

        <Animated.View style={[styles.cancelButtonContainer, fadeStyle]}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <CustomText
              size={16}
              fontFamily={FontFamily.Medium}
              css={styles.cancelButtonText}>
              Cancel
            </CustomText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1b3c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    color: '#fff',
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 59, 127, 0.2)',
    position: 'absolute',
  },
  rotatingCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: '#ff3b7f',
    borderStyle: 'dashed',
    position: 'absolute',
  },
  lottieAnimation: {
    width: 150,
    height: 150,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  statusText: {
    color: '#fff',
    marginBottom: 8,
  },
  queuePosition: {
    color: '#ff3b7f',
    marginBottom: 8,
  },
  subStatusText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  cancelButtonContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  cancelButtonText: {
    color: '#fff',
  },
});

export default GameLobbyScreen;
