import {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {Alert, AppState} from 'react-native';
import {
  GAME_CONSTANTS,
  GameStatePersistence,
  handleGameError,
} from '../../utils/gameUtils';
import socketService from '../../api/socketService';
import {SocketEvents} from '../../constants/socketEvents';
import {
  selectUserId,
  selectUserInfo,
} from '../../redux/reducers/app/appSelectors';
import {useDispatch, useSelector} from 'react-redux';
import {PLAYER_COLORS_GRADIENT} from '../../constants/Colors';
import {
  calculateNextPosition,
  isValidMove,
  getValidMovesForPlayer,
  getPlayerStartingPosition,
  logPlayerPaths,
} from '../../utils/playerPaths';
import {updatePlayers} from '../../redux/reducers/game/gameSlice';
import {applyOptimisticPieceMove} from '../../utils/optimisticUpdates';
import {getGameDetailsById} from '../../api/game';
import uuid from 'react-native-uuid';


const GameEvents = SocketEvents;

const useGameState = (roomCode, gameId, gameType) => {
  const dispatch = useDispatch();
  const [appState, setAppState] = useState(AppState.currentState);
  const userInfo = useSelector(selectUserInfo);
  const userId = useSelector(selectUserId);

  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [diceValue, setDiceValue] = useState(0);
  const [hasValidMoves, setHasValidMoves] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [validMoves, setValidMoves] = useState([]);

  const [chat, setChat] = useState({messages: []});
  const [isGamePaused, setIsGamePaused] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [gameStatus, setGameStatus] = useState(null);
  const [connectionState, setConnectionState] = useState('connected');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Enhanced state for turn management
  const [turnStartTime, setTurnStartTime] = useState(null);
  const [autoTurnTimeout, setAutoTurnTimeout] = useState(null);
  const [gameCompletionData, setGameCompletionData] = useState(null);

  // Turn timeout state
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [playerLives, setPlayerLives] = useState({});

  // QUICK GAME TIMER STATE
  const [quickGameTimeRemaining, setQuickGameTimeRemaining] = useState(null);
  const [quickGameTotalTime, setQuickGameTotalTime] = useState(null);
  const [quickGameWarningZone, setQuickGameWarningZone] = useState(false);
  const [quickGameFinalRankings, setQuickGameFinalRankings] = useState(null);
  const [quickGameWinner, setQuickGameWinner] = useState(null);
  const [isQuickGame, setIsQuickGame] = useState(false);

  // Animation state for smooth token movement
  const [movingPieces, setMovingPieces] = useState({});
  const [pieceAnimations, setPieceAnimations] = useState({});

  const joinRoomRetryTimerRef = useRef(null);

  // Animation functions for smooth token movement
  const animatePieceMovement = useCallback((pieceId, fromPos, toPos, playerIndex, totalPlayers) => {
    console.log(`🎯 Starting animation for piece ${pieceId} from ${fromPos} to ${toPos}`);
    
    if (fromPos === toPos) {
      console.log('🎯 No animation needed - same position');
      return;
    }

    // Calculate the path between positions
    const pathSteps = [];
    let currentPos = fromPos;
    
    // Generate step-by-step path
    while (currentPos !== toPos) {
      const nextPos = calculateNextPosition(
        currentPos,
        1, // Move 1 step at a time
        playerIndex,
        totalPlayers,
        timeRemaining,
        playerLives,
      );
      
      if (nextPos === currentPos) break; // Prevent infinite loop
      
      pathSteps.push(nextPos);
      currentPos = nextPos;
    }

    console.log(`🎯 Generated ${pathSteps.length} steps:`, pathSteps);

    if (pathSteps.length === 0) {
      console.log('🎯 No valid path found');
      return;
    }

    // Set initial animation state
    setMovingPieces(prev => ({
      ...prev,
      [pieceId]: {
        fromPos,
        toPos,
        pathSteps,
        currentStep: 0,
        isAnimating: true,
      }
    }));

    // Start step-by-step animation
    let stepIndex = 0;
    const animateStep = () => {
      if (stepIndex >= pathSteps.length) {
        // Animation complete
        console.log(`🎯 Animation complete for piece ${pieceId}`);
        setMovingPieces(prev => {
          const newState = { ...prev };
          delete newState[pieceId];
          return newState;
        });
        return;
      }

      const currentStep = pathSteps[stepIndex];
      console.log(`🎯 Moving piece ${pieceId} to step ${stepIndex + 1}/${pathSteps.length}: position ${currentStep}`);
      
      // Update piece position for this step by updating players state
      setPlayers(prev => 
        prev.map(player => ({
          ...player,
          tokenPositions: player.tokenPositions?.map((pos, index) => {
            const pieceIdPrefix = player.color?.slice(0, 1).toUpperCase() || '';
            const currentPieceId = `${pieceIdPrefix}${index + 1}`;
            return currentPieceId === pieceId ? currentStep : pos;
          }) || player.tokenPositions
        }))
      );

      // Move to next step after delay
      setTimeout(() => {
        stepIndex++;
        animateStep();
      }, 200); // 200ms per step for smooth movement
    };

    // Start animation
    setTimeout(animateStep, 100);
  }, [timeRemaining, playerLives]);

  const clearPieceAnimation = useCallback((pieceId) => {
    setMovingPieces(prev => {
      const newState = { ...prev };
      delete newState[pieceId];
      return newState;
    });
  }, []);

  const isPieceAnimating = useCallback((pieceId) => {
    return movingPieces[pieceId]?.isAnimating || false;
  }, [movingPieces]);

  const getPieceAnimationData = useCallback((pieceId) => {
    return movingPieces[pieceId] || null;
  }, [movingPieces]);

  // Turn timeout event handlers - moved outside useEffect to prevent recreation

  const onTurnTimeTick = useCallback(
    data => {
      console.log('useGameState: Turn time tick event received:', data);
      if (data.gameId === gameId) {
        const newTimeRemaining = data.timeLeftInSeconds || 0;
        console.log(
          'useGameState: Updating timeRemaining to:',
          newTimeRemaining,
        );
        setTimeRemaining(newTimeRemaining);
      }
    },
    [gameId],
  );

  const onLifeDeducted = useCallback(
    data => {
      console.log('useGameState: Life deducted event received:', data);
      if (data.gameId === gameId) {
        setPlayerLives(prev => ({
          ...prev,
          [data.playerId]: data.remainingLives,
        }));

        // Update players state with new lives
        if (data.gameState && data.gameState.players) {
          const formattedPlayers = formatPlayersForUI(data.gameState.players);
          setPlayers(formattedPlayers);
        }
      }
    },
    [gameId, formatPlayersForUI],
  );

  const reconnect = useCallback(() => {
    console.log('useGameState: Manual reconnect requested.');
    joinGameRoomAndSyncState();
  }, [joinGameRoomAndSyncState]);

  // Get total number of players
  const totalPlayers = useMemo(() => {
    return players.filter(p => p.userId).length;
  }, [players]);

  const plottedPieces = useMemo(() => {
    if (!players || players.length === 0) return [];

    const allPieces = [];
    players.forEach(player => {
      const playerIdPrefix = player.color?.slice(0, 1).toUpperCase() || '';

      if (Array.isArray(player.tokenPositions)) {
        player.tokenPositions.forEach((pos, index) => {
          const pieceId = `${playerIdPrefix}${index + 1}`;
          allPieces.push({
            id: pieceId,
            pos: pos,
            color: player.color,
            playerId: player.userId,
            playerIndex: player.position,
          });
        });
      } else if (Array.isArray(player.pieces)) {
        player.pieces.forEach((piece, index) => {
          const piecePos =
            typeof piece === 'object' && piece !== null ? piece.pos : piece;
          const pieceId = `${playerIdPrefix}${index + 1}`;
          if (piecePos !== undefined) {
            allPieces.push({
              id: pieceId,
              pos: piecePos,
              color: player.color,
              playerId: player.userId,
              playerIndex: player.position,
              travelCount: typeof piece === 'object' ? piece.travelCount : 0,
            });
          }
        });
      }
    });
    return allPieces;
  }, [players]);

  const playersColor = useMemo(() => {
    const result = {};
    if (players && Array.isArray(players)) {
      players.forEach(player => {
        if (player.userId) {
          const playerKey = `player${player.position + 1}`;
          result[playerKey] = player.color?.toLowerCase();
        }
      });
    }
    return result;
  }, [players]);

  const playerDetails = useMemo(() => {
    const details = {};
    if (players && Array.isArray(players)) {
      players.forEach(player => {
        if (player.userId) {
          const playerKey = `player${player.position + 1}`;
          details[playerKey] = {
            ...player,
            gradientColors:
              PLAYER_COLORS_GRADIENT[player.color?.toLowerCase()]?.gradient,
            diceGradientColors:
              PLAYER_COLORS_GRADIENT[player.color?.toLowerCase()]?.gradient,
          };
        }
      });
    }
    return details;
  }, [players]);

  const getHomePiecesForPlayer = useCallback(
    player => {
      if (!player?.userId) return [];
      return plottedPieces.filter(
        p => p.playerId === player.userId && p.pos === 0,
      );
    },
    [plottedPieces],
  );

  const socket = socketService.socket;

  const formatPlayersForUI = useCallback(playersData => {
    if (!playersData) return [];

    const playersArray = Array.isArray(playersData)
      ? playersData
      : Object.values(playersData);

    return playersArray.map(player => ({
      ...player,
      tokenPositions: Array.isArray(player.tokenPositions)
        ? player.tokenPositions
        : Array.isArray(player.pieces)
        ? player.pieces.map(p =>
            typeof p === 'object' && p !== null ? p.pos : p,
          )
        : [0, 0, 0, 0],
      username:
        player.username ||
        `Player ${player.position !== undefined ? player.position + 1 : ''}`,
      isReady: player.isReady || false,
      color: player.color || 'RED',
      position: player.position !== undefined ? player.position : 0,
      userId: player.userId || player.id || '',
      isActive: player.isActive !== undefined ? player.isActive : true,
      kills: player.kills || 0,
      lives: player.lives !== undefined ? player.lives : 3,
      points: player.points || 0,
      avatarIndex:
        player.avatarIndex !== undefined
          ? player.avatarIndex
          : player.position !== undefined
          ? player.position
          : 0,
      timeRemaining: player.timeRemaining || 30,
    }));
  }, []);

  const joinGameRoomAndSyncState = useCallback(async () => {
    const currentSocket = socketService.socket;

    if (!currentSocket || !userId || !roomCode || !gameId) {
      console.log('joinGameRoomAndSyncState: Missing required data:', {
        hasSocket: !!currentSocket,
        userId,
        roomCode,
        gameId,
      });

      joinRoomRetryTimerRef.current = setTimeout(
        joinGameRoomAndSyncState,
        1000,
      );
      return;
    }

    if (!currentSocket.connected) {
      console.log(
        'joinGameRoomAndSyncState: Socket not connected, waiting for connection.',
      );
      return;
    }

    console.log(
      'joinGameRoomAndSyncState: Joining room',
      roomCode,
      'for game',
      gameId,
      'as user',
      userId,
    );

    setLoading(true);

    currentSocket.emit(GameEvents.JOIN_ROOM, {
      roomCode: roomCode,
      gameId: gameId,
      userId: userId,
    });

    currentSocket.emit(GameEvents.GET_GAME_STATE, {
      roomCode: roomCode,
      gameId: gameId,
      userId: userId,
    });

    currentSocket.emit(GameEvents.PLAYER_READY, {
      roomCode: roomCode,
      gameId: gameId,
      playerId: userId,
      isReady: true,
    });

    if (joinRoomRetryTimerRef.current) {
      clearTimeout(joinRoomRetryTimerRef.current);
      joinRoomRetryTimerRef.current = null;
    }
  }, [userId, roomCode, gameId]);

  useEffect(() => {
    console.log('useGameState: Initial useEffect run');

    if (!socketService.socket?.connected) {
      console.log(
        'useGameState: Socket not connected, attempting initial service connect.',
      );
      socketService
        .connect()
        .then(() => {
          console.log(
            'useGameState: Initial service connect successful (async)',
          );
        })
        .catch(err => {
          console.error('useGameState: Initial service connect failed:', err);
          setConnectionState('error');
          setError(err);
          setLoading(false);
        });
    } else {
      console.log(
        'useGameState: Socket already connected, attempting to join room directly.',
      );
      joinGameRoomAndSyncState();
    }

    const onConnect = () => {
      console.log('useGameState: Socket connected event received.');
      setConnectionState('connected');
      setError(null);
      joinGameRoomAndSyncState();
    };

    const onDisconnect = reason => {
      console.log('useGameState: Socket disconnected:', reason);
      setConnectionState('disconnected');
      setLoading(true);
    };

    const onConnectError = err => {
      console.error('useGameState: Socket connection error:', err);
      setConnectionState('error');
      setError(err);
      setLoading(false);
      Alert.alert(
        'Connection Error',
        'Socket connection error. Please check your network.',
      );
    };

    const onError = error => {
      console.error('useGameState: Generic socket error:', error);
      setError(error);
      const gameError = handleGameError(error);
      Alert.alert(gameError.severity.toUpperCase(), gameError.message);
    };

    const currentSocket = socketService.socket;

    if (currentSocket) {
      currentSocket.on('connect', onConnect);
      currentSocket.on('disconnect', onDisconnect);
      currentSocket.on('connect_error', onConnectError);
      currentSocket.on('error', onError);
    } else {
      console.warn(
        'useGameState: Socket instance not available to attach basic listeners.',
      );
    }

    return () => {
      console.log('useGameState: Initial useEffect cleanup.');

      if (joinRoomRetryTimerRef.current) {
        clearTimeout(joinRoomRetryTimerRef.current);
        joinRoomRetryTimerRef.current = null;
      }

      const currentSocketCleanup = socketService.socket;
      if (currentSocketCleanup) {
        currentSocketCleanup.off('connect', onConnect);
        currentSocketCleanup.off('disconnect', onDisconnect);
        currentSocketCleanup.off('connect_error', onConnectError);
        currentSocketCleanup.off('error', onError);
      }
    };
  }, [userId, roomCode, gameId, joinGameRoomAndSyncState]);

  useEffect(() => {
    const currentSocket = socketService.socket;
    if (!currentSocket || !currentSocket.connected || !userId) {
      console.log(
        'useGameState: Socket not connected or userId missing for game listeners setup.',
      );
      return;
    }

    // console.log('useGameState: Setting up game event listeners');

    const onGameStateUpdated = data => {
      console.log('useGameState: Game state update received:', data.type, data);
      setLoading(false);

      switch (data.type) {
        case 'GAME_STATE_UPDATE':
        case 'GAME_STATE_SYNC':
          if (data.game && data.game.state) {
            console.log(
              'useGameState: Updating game state with:',
              data.game.state,
            );

            setGameState(data.game.state);

            if (data.game.state.players) {
              const formattedPlayers = formatPlayersForUI(
                data.game.state.players,
              );
              console.log('useGameState: Formatted players:', formattedPlayers);
              setPlayers(formattedPlayers);
            } else {
              console.warn(
                'useGameState: Game state update missing players data.',
              );
              setPlayers([]);
            }

            setCurrentTurn(data.game.state.currentPlayer);
            setDiceValue(
              data.game.state.diceRoll !== undefined
                ? data.game.state.diceRoll
                : 0,
            );
            setGameStatus(data.game.state.status);

            setSelectedToken(null);
            setValidMoves([]);
            setHasValidMoves(false);
          } else {
            console.warn(
              'useGameState: Received game state update without valid game data.',
            );
            setError(new Error('Received incomplete game state data.'));
          }
          break;

        case 'DICE_ROLLED':
          console.log('useGameState: DICE_ROLLED received:', data);

          if (data.gameId === gameId) {
            setDiceValue(data.diceResult);
            setHasValidMoves(data.hasValidMoves);
            setSelectedToken(null);
            // Use valid moves from backend if available
            if (data.validMoves && Array.isArray(data.validMoves)) {
              setValidMoves(data.validMoves);
              console.log(
                `Backend provided ${data.validMoves.length} valid moves:`,
                data.validMoves,
              );
            } else {
              // Fallback: Calculate valid moves using frontend logic
              const currentPlayer = players.find(p => p.userId === currentTurn);
              if (currentPlayer) {
                const playerPieces = plottedPieces.filter(
                  p => p.playerId === currentPlayer.userId,
                );
                const validPlayerMoves = getValidMovesForPlayer(
                  playerPieces,
                  data.diceResult,
                  currentPlayer.position,
                  totalPlayers,

                  // Turn timeout features
                  timeRemaining,
                  playerLives,
                );
                setValidMoves(validPlayerMoves);
                console.log(
                  `Frontend calculated ${validPlayerMoves.length} valid moves:`,
                  validPlayerMoves,
                );
              } else {
                setValidMoves([]);
              }
            }
            setTurnStartTime(Date.now());
          } else {
            console.warn(
              'useGameState: Received DICE_ROLLED for wrong game/turn or missing data.',
            );

            if (data.gameId === gameId && data.diceResult !== undefined) {
              setDiceValue(data.diceResult);
            }
          }
          break;

        case 'VALID_MOVES_AVAILABLE':
          console.log('useGameState: VALID_MOVES_AVAILABLE received:', data);
          if (data.gameId === gameId && data.userId === userId) {
            if (Array.isArray(data.validMoves)) {
              setValidMoves(data.validMoves);
              setHasValidMoves(data.validMoves.length > 0);
            } else {
              setValidMoves([]);
              setHasValidMoves(false);
            }
            if (data.selectedTokenId) {
              setSelectedToken(data.selectedTokenId);
            }
          }
          break;

        case 'GAME_STARTED':
          console.log('useGameState: GAME_STARTED event received.');
          setGameStatus(GAME_CONSTANTS.GAME_STATES.IN_PROGRESS);
          setLoading(false);
          socket.emit(GameEvents.GET_GAME_STATE, {roomCode, gameId, userId});
          break;

        case 'TURN_TIMEOUT':
          console.log('useGameState: Turn timeout event received:', data);
          if (data.gameId === gameId) {
            setCurrentTurn(data.nextPlayer.id);
            setDiceValue(0);
            setHasValidMoves(false);
            setSelectedToken(null);
            setValidMoves([]);
            currentSocket.emit(GameEvents.GET_GAME_STATE, {
              roomCode,
              gameId,
              userId,
            });

            if (data.gameState.players) {
              const formattedPlayers = formatPlayersForUI(
                data.gameState.players,
              );
              setPlayers(formattedPlayers);
            }

            console.log(
              '✅ Turn timeout handled, updated to current player:',
              data.currentPlayer,
            );
          }
          break;

        case 'PLAYER_JOINED':
        case 'PLAYER_LEFT':
        case 'PLAYER_READY':
        case 'PLAYER_FORFEITED':
        case 'PLAYER_DISCONNECTED':
        case 'PLAYER_RECONNECTED':
          console.log(`useGameState: Player event: ${data.type}`, data);

          if (data.gameId === gameId) {
            socket.emit(GameEvents.GET_GAME_STATE, {
              roomCode,
              gameId,
              userId,
            });
          }
          break;
        case 'PIECE_MOVED':
          console.log('useGameState: PIECE_MOVED received:', data);
          if (data.gameId === gameId) {
            // Request updated game state after piece move
            socket.emit(GameEvents.GET_GAME_STATE, {roomCode, gameId, userId});

            // Clear dice and selection state
            setDiceValue(0);
            setSelectedToken(null);
            setValidMoves([]);
            setHasValidMoves(false);

            // If there were kills, show notification
            if (data.kills && data.kills.length > 0) {
              console.log('🎯 Pieces captured:', data.kills);
              // You can add a toast notification here if needed
            }

            console.log(
              '✅ Piece moved successfully, requesting game state update',
            );
          }
          break;

        default:
          console.log(
            'useGameState: Unhandled game state update type:',
            data.type,
          );
      }
    };

    const onGameComplete = data => {
      console.log('useGameState: GAME_COMPLETED event received.', data);
      setGameStatus(GAME_CONSTANTS.GAME_STATES.COMPLETED);
      setLoading(false);
      if (data) {
        setGameCompletionData({
          winner: data.winner,
          players: players,
          finalState: data.finalState,
          endTime: data.endTime,
        });
      }
    };

    const onTurnChanged = data => {
      console.log('useGameState: Turn changed event received:', data);
      if (data.gameId === gameId) {
        setCurrentTurn(data.nextPlayerId);
        setDiceValue(0);
        setHasValidMoves(false);
        setSelectedToken(null);
        setValidMoves([]);
        setTurnStartTime(null);
        // Remove this line - timeRemaining should come from backend events
        // setTimeRemaining(30);

        // If backend provides timeRemaining in turn changed event, use it
        // if (data.timeRemaining !== undefined) {
        //   console.log(
        //     'useGameState: Setting timeRemaining from turn changed:',
        //     data.timeRemaining,
        //   );
        //   setTimeRemaining(data.timeRemaining);
        // }
      }
    };

    const onChatMessage = message => {
      console.log('useGameState: Chat message received:', message);
      if (message.roomCode === roomCode) {
        const msgWithId = message.id
          ? message
          : { ...message, id: `${message.userId || ''}_${message.timestamp || ''}_${Math.random().toString(36).substr(2, 9)}` };
        setChat(prevChat => {
          // Filter out any message with the same id
          const exists = prevChat.messages.some(m => m.id === msgWithId.id);
          if (exists) return prevChat;
          return {
            messages: [...prevChat.messages, msgWithId],
          };
        });
        setHasUnreadMessages(true);
      }
    };

    const onSystemMessage = message => {
      console.log('useGameState: System message received:', message);
      if (message.roomCode === roomCode) {
        if (message.type === 'GAME_PAUSED') {
          setIsGamePaused(true);
          Alert.alert(
            'Game Paused',
            message.message || 'Game has been paused.',
          );
        } else if (message.type === 'GAME_RESUMED') {
          setIsGamePaused(false);
          Alert.alert('Game Resumed', message.message || 'Game has resumed.');
        } else if (message.status === 'ERROR') {
          const gameError = handleGameError(message);
          setError(new Error(gameError.message));
          Alert.alert(gameError.severity.toUpperCase(), gameError.message);
        } else if (
          message.type === 'WAITING' &&
          gameStatus === GAME_CONSTANTS.GAME_STATES.WAITING
        ) {
          console.log('useGameState: Waiting message:', message.message);
        } else {
          setChat(prevChat => ({
            messages: [
              ...prevChat.messages,
              {
                isSystem: true,
                text: message.message,
                timestamp: new Date().toISOString(),
              },
            ],
          }));
        }
      }
    };

    const onRoomJoined = data => {
      console.log('useGameState: Room joined event:', data);
      if (data.gameId === gameId && data.userId === userId) {
        socket.emit(GameEvents.GET_GAME_STATE, {roomCode, gameId, userId});
        setLoading(true);
        setConnectionState('connected');
        setError(null);
      } else {
        console.warn(
          'useGameState: Received ROOM_JOINED for different user/game.',
        );
      }
    };

    const onJoinRoomError = errorData => {
      console.error('useGameState: Join Room Error:', errorData);
      setLoading(false);
      const gameError = handleGameError(errorData);
      setError(new Error(gameError.message));
      Alert.alert('Join Error', gameError.message);
    };

    const onRoomLeft = data => {
      console.log('useGameState: Room left event:', data);
      if (data.gameId === gameId) {
        if (data.userId === userId) {
          console.log('useGameState: Current user left the room.');
          GameStatePersistence.clearGameState(gameId);
        } else {
          console.log(`useGameState: Player ${data.userId} left.`);
        }
      }
    };

    const onPieceMoved = data => {
      console.log('useGameState: Direct PIECE_MOVED event received:', data);
      if (data.gameId === gameId) {
        // Handle the piece move
        socket.emit(GameEvents.GET_GAME_STATE, {roomCode, gameId, userId});

        // Clear turn state
        setDiceValue(0);
        setSelectedToken(null);
        setValidMoves([]);
        setHasValidMoves(false);

        console.log('✅ Handling direct PIECE_MOVED event');
      }
    };
    const onPlayerCaptured = data => {
      console.log('useGameState: PLAYER_CAPTURED event received:', data);
      if (data.gameId === gameId) {
        socket.emit(GameEvents.GET_GAME_STATE, {roomCode, gameId, userId});
        if (data.kills && data.kills.length > 0) {
          console.log('🎯 Player captured event:', {
            attacker: data.player.id,
            victims: data.kills,
          });
        }
        console.log('✅ Handling PLAYER_CAPTURED event, requesting state sync');
      }
    };

    if (currentSocket) {
      // Add debugging for socket connection
      // console.log('useGameState: Setting up socket listeners for game events');

      currentSocket.on(GameEvents.GAME_STATE_UPDATED, onGameStateUpdated);
      currentSocket.on(GameEvents.GAME_COMPLETED, onGameComplete);
      currentSocket.on(GameEvents.TURN_CHANGED, onTurnChanged);
      currentSocket.on(GameEvents.CHAT_MESSAGE, onChatMessage);
      currentSocket.on(GameEvents.SYSTEM_MESSAGE, onSystemMessage);
      currentSocket.on(GameEvents.ROOM_JOINED, onRoomJoined);
      currentSocket.on('joinRoomError', onJoinRoomError);
      currentSocket.on(GameEvents.ROOM_LEFT, onRoomLeft);
      currentSocket.on(GameEvents.PIECE_MOVED, onPieceMoved);
      currentSocket.on(GameEvents.PLAYER_CAPTURED, onPlayerCaptured);

      // Turn timeout event listeners with debugging

      // currentSocket.on(GameEvents.TURN_TIME_RESET, onTurnTimeReset);
      currentSocket.on(GameEvents.TURN_TIME_TICK, onTurnTimeTick);
      currentSocket.on(GameEvents.LIFE_DEDUCTED, onLifeDeducted);
    } else {
      console.warn(
        'useGameState: Socket instance not available to attach game listeners.',
      );
    }

    return () => {
      // console.log('useGameState: Cleaning up game event listeners');
      const currentSocketCleanup = socketService.socket;
      if (currentSocketCleanup) {
        currentSocketCleanup.off(
          GameEvents.GAME_STATE_UPDATED,
          onGameStateUpdated,
        );
        currentSocketCleanup.off(GameEvents.TURN_CHANGED, onTurnChanged);
        currentSocketCleanup.off(GameEvents.CHAT_MESSAGE, onChatMessage);
        currentSocketCleanup.off(GameEvents.SYSTEM_MESSAGE, onSystemMessage);
        currentSocketCleanup.off(GameEvents.ROOM_JOINED, onRoomJoined);
        currentSocketCleanup.off('joinRoomError', onJoinRoomError);
        currentSocketCleanup.off(GameEvents.ROOM_LEFT, onRoomLeft);
        currentSocketCleanup.off(GameEvents.PIECE_MOVED, onPieceMoved);

        // Clean up turn timeout listeners
        // currentSocketCleanup.off(GameEvents.TURN_TIME_RESET, onTurnTimeReset);
        currentSocketCleanup.off(GameEvents.TURN_TIME_TICK, onTurnTimeTick);
        currentSocketCleanup.off(GameEvents.LIFE_DEDUCTED, onLifeDeducted);
      }
    };
  }, [
    currentTurn,
    diceValue,
    socket,
    userId,
    roomCode,
    gameId,
    appState,
    formatPlayersForUI,
    joinGameRoomAndSyncState,
    players,
    plottedPieces,
    totalPlayers,
    timeRemaining,
    playerLives,
    onTurnTimeTick,
    onLifeDeducted,
    gameStatus,
    selectedToken,
    reconnect,
  ]);

  useEffect(() => {
    if (players) {
      dispatch(updatePlayers(players));
    }
  }, [players, dispatch]);

  // Enhanced rollDice function
  const rollDice = useCallback(() => {
    const currentSocket = socketService.socket;
    if (
      !currentSocket ||
      !currentSocket.connected ||
      !roomCode ||
      currentTurn !== userId ||
      isGamePaused ||
      (diceValue > 0 && hasValidMoves && currentTurn === userId) ||
      gameStatus !== GAME_CONSTANTS.GAME_STATES.IN_PROGRESS
    ) {
      console.log('useGameState: Cannot roll dice (condition failed)', {
        hasSocket: !!currentSocket,
        connected: currentSocket?.connected,
        roomCode,
        isMyTurn: currentTurn === userId,
        isPaused: isGamePaused,
        diceRolled: diceValue > 0,
        status: gameStatus,
      });
      if (currentTurn !== userId)
        Alert.alert(
          'Not Your Turn',
          'Please wait for your turn to roll the dice.',
        );
      else if (isGamePaused)
        Alert.alert('Game Paused', 'The game is currently paused.');
      else if (diceValue > 0)
        Alert.alert(
          'Dice Already Rolled',
          'You have already rolled the dice this turn.',
        );
      else if (gameStatus !== GAME_CONSTANTS.GAME_STATES.IN_PROGRESS)
        Alert.alert(
          'Game Not Active',
          'The game is not currently in progress.',
        );
      return;
    }

    console.log('useGameState: Emitting DICE_ROLLED');
    currentSocket.emit(GameEvents.DICE_ROLLED, {
      roomCode,
      gameId,
      userId,
    });

    setDiceValue(-1);
    setTurnStartTime(Date.now());
  }, [
    roomCode,
    gameId,
    userId,
    currentTurn,
    isGamePaused,
    diceValue,
    hasValidMoves,
    gameStatus,
  ]);

  // Enhanced selectToken function with frontend path calculation
  const selectToken = useCallback(
    pieceId => {
      const currentSocket = socketService.socket;
      if (
        !currentSocket ||
        !currentSocket.connected ||
        !roomCode ||
        currentTurn !== userId ||
        isGamePaused ||
        diceValue <= 0
      ) {
        console.log('useGameState: Cannot select token (condition failed)');
        return;
      }

      const pieceToSelect = plottedPieces.find(
        p => p.id === pieceId && p.playerId === userId,
      );
      if (!pieceToSelect) {
        console.warn(
          'useGameState: Piece not found or not owned by current user',
        );
        return;
      }

      // Get current player info
      const currentPlayer = players.find(p => p.userId === userId);
      if (!currentPlayer) {
        console.warn('useGameState: Current player not found');
        return;
      }

      // Check if move is valid using NEW path logic
      if (
        !isValidMove(
          pieceToSelect.pos,
          diceValue,
          currentPlayer.position,
          totalPlayers,

          // Turn timeout features
          timeRemaining,
          playerLives,
        )
      ) {
        console.log(
          'useGameState: Invalid move detected by frontend path logic',
        );
        Alert.alert(
          'Invalid Move',
          'This piece cannot be moved with the current dice value.',
        );
        return;
      }

      // Calculate next position using NEW path logic
      const nextPosition = calculateNextPosition(
        pieceToSelect.pos,
        diceValue,
        currentPlayer.position,
        totalPlayers,

        // Turn timeout features
        timeRemaining,
        playerLives,
      );

      console.log(
        `useGameState: Moving token ${pieceId} from ${pieceToSelect.pos} to ${nextPosition} using new paths`,
      );

      // Convert piece ID to array index for backend
      const arrayTokenId = Number.parseInt(pieceId.replace(/\D/g, ''), 10) - 1;

      // Send move to backend with calculated position
      currentSocket.emit(GameEvents.PIECE_MOVED, {
        roomCode,
        gameId,
        userId,
        pieceId: arrayTokenId,
        destinationPos: nextPosition,
        diceValue: diceValue,
      });

          // Clear state after move
    setSelectedToken(null);
    setValidMoves([]);

    // Trigger smooth animation for the piece movement
    const playerForAnimation = players.find(p => p.userId === userId);
    if (playerForAnimation) {
      animatePieceMovement(
        pieceId,
        pieceToSelect.pos,
        nextPosition,
        playerForAnimation.position,
        totalPlayers
      );
    }
  },
  [
    roomCode,
    gameId,
    userId,
    currentTurn,
    isGamePaused,
    diceValue,
    plottedPieces,
    players,
    totalPlayers,
    timeRemaining,
    playerLives,
    animatePieceMovement,
  ],
);

  // Simplified moveToken function (kept for compatibility but not  used in new flow)
  const moveToken = useCallback(
    (destinationPosId = '') => {
      const currentSocket = socketService.socket;

      if (
        !currentSocket ||
        !currentSocket.connected ||
        !roomCode ||
        currentTurn !== userId ||
        isGamePaused ||
        selectedToken === null ||
        diceValue <= 0
      ) {
        console.log('useGameState: Cannot move token (condition failed)');
        return;
      }

      console.log(
        `useGameState: Emitting PIECE_MOVED for token ${selectedToken} to position ${destinationPosId}`,
      );

      const arrayTokenId =
        Number.parseInt(selectedToken.replace(/\D/g, ''), 10) - 1;
      currentSocket.emit(GameEvents.PIECE_MOVED, {
        roomCode,
        gameId,
        userId,
        pieceId: arrayTokenId,
        destinationPos: destinationPosId,
      });

      setSelectedToken(null);
      setValidMoves([]);
    },
    [
      roomCode,
      gameId,
      userId,
      currentTurn,
      isGamePaused,
      selectedToken,
      diceValue,
    ],
  );

  // Auto turn change when  no valid moves
  useEffect(() => {
    if (
      diceValue > 0 &&
      hasValidMoves === false &&
      currentTurn === userId &&
      gameStatus === GAME_CONSTANTS.GAME_STATES.IN_PROGRESS
    ) {
      console.log('No valid moves available, scheduling turn change...');

      if (autoTurnTimeout) {
        clearTimeout(autoTurnTimeout);
      }

      const timeout = setTimeout(() => {
        const currentSocket = socketService.socket;
        if (currentSocket?.connected) {
          console.log('Auto-changing turn due to no valid moves');
          currentSocket.emit('turnComplete', {
            roomCode,
            gameId,
            userId,
            reason: 'NO_VALID_MOVES',
          });
        }
      }, 2000);

      setAutoTurnTimeout(timeout);
    }

    return () => {
      if (autoTurnTimeout) {
        clearTimeout(autoTurnTimeout);
      }
    };
  }, [
    diceValue,
    hasValidMoves,
    currentTurn,
    userId,
    gameStatus,
    roomCode,
    gameId,
    autoTurnTimeout,
  ]);

  // Turn timeout handler
  const handleTurnTimeout = useCallback(() => {
    console.log('Turn timeout - !!!!!!!!!!!!!!!!!!!!!!');
  }, []);

  // Calculate remaining time
  const calculateTimeRemaining = useCallback(() => {
    const currentPlayer = Object.values(playerDetails).find(
      p => p.userId === currentTurn,
    );
    if (!currentPlayer || !turnStartTime) return 30;

    const elapsed = (Date.now() - turnStartTime) / 1000;
    return Math.max(0, (currentPlayer.timeRemaining || 30) - elapsed);
  }, [playerDetails, currentTurn, turnStartTime]);

  const sendMessage = useCallback(
    message => {
      const currentSocket = socketService.socket;
      if (
        !currentSocket ||
        !currentSocket.connected ||
        !roomCode ||
        !message.trim()
      ) {
        console.log('useGameState: Cannot send message (condition failed)');
        return;
      }

      const uniqueId = uuid.v4();
      console.log('useGameState: Sending chat message:', message);
      currentSocket.emit(GameEvents.CHAT_MESSAGE, {
        roomCode,
        gameId,
        userId,
        message: message.trim(),
        timestamp: new Date().toISOString(),
        id: uniqueId,
      });

      setChat(prevChat => {
        // Filter out any message with the same id
        const exists = prevChat.messages.some(m => m.id === uniqueId);
        if (exists) return prevChat;
        return {
          messages: [
            ...prevChat.messages,
            {
              text: message.trim(),
              userId: userId,
              username: userInfo?.username || 'You',
              timestamp: new Date().toISOString(),
              roomCode: roomCode,
              id: uniqueId,
            },
          ],
        };
      });
    },
    [roomCode, gameId, userId, userInfo],
  );

  const togglePause = useCallback(() => {
    const currentSocket = socketService.socket;

    if (
      !currentSocket ||
      !currentSocket.connected ||
      !roomCode ||
      gameStatus === GAME_CONSTANTS.GAME_STATES.WAITING ||
      gameStatus === GAME_CONSTANTS.GAME_STATES.COMPLETED
    ) {
      console.log('useGameState: Cannot toggle pause (condition failed)');
      return;
    }

    console.log(
      `useGameState: Emitting ${isGamePaused ? 'resumeGame' : 'pauseGame'}`,
    );
    const event = isGamePaused ? 'resumeGame' : 'pauseGame';
    currentSocket.emit(event, {
      roomCode,
      gameId,
      userId,
      isPaused: !isGamePaused,
    });
  }, [roomCode, gameId, userId, isGamePaused, gameStatus]);

  const toggleChat = useCallback(() => {
    console.log('useGameState: Toggle chat called, clearing unread.');
    setHasUnreadMessages(false);
  }, []);

  const toggleSound = useCallback(() => {
    console.log('useGameState: Toggle sound action called.');
  }, []);

  const leaveGame = useCallback(() => {
    const currentSocket = socketService.socket;
    if (!currentSocket || !currentSocket.connected || !roomCode) {
      console.log('useGameState: Cannot leave game (condition failed)');
      return;
    }

    console.log('useGameState: Emitting LEAVE_ROOM');
    currentSocket.emit(GameEvents.LEAVE_ROOM, {
      roomCode,
      gameId,
      userId,
    });
  }, [roomCode, gameId, userId]);

  useEffect(() => {
    if (selectedToken === null) {
      setValidMoves([]);
    }
  }, [selectedToken]);

  useEffect(() => {
    // Add a 1 second delay before auto-move logic to allow state updates
    let timeoutId;
    if (
      currentTurn === userId &&
      diceValue > 0 &&
      validMoves &&
      validMoves.length > 0 &&
      !selectedToken &&
      gameStatus === GAME_CONSTANTS.GAME_STATES.IN_PROGRESS &&
      !isGamePaused
    ) {
      timeoutId = setTimeout(() => {
        if (validMoves.length === 1) {
          // Only one valid move, auto-move
          selectToken(validMoves[0].pieceId);
        } else {
          // Check if all valid moves are for tokens at the same position
          const allSamePos = validMoves.every(
            m => m.currentPos === validMoves[0].currentPos,
          );
          if (allSamePos) {
            // Pick one at random and auto-move
            const randomIdx = Math.floor(Math.random() * validMoves.length);
            selectToken(validMoves[randomIdx].pieceId);
          }
          // else: let user select
        }
      }, 500);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    validMoves,
    currentTurn,
    userId,
    diceValue,
    gameStatus,
    isGamePaused,
    selectToken,
    selectedToken,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log(
        'useGameState: AppState changed:',
        appState,
        '->',
        nextAppState,
      );
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log(
          'useGameState: App came to foreground - attempting reconnect.',
        );

        if (socketService.socket?.disconnected) {
          reconnect();
        } else {
          console.log(
            'useGameState: Socket appears connected on foreground, requesting state sync.',
          );
          const currentSocket = socketService.socket;
          if (currentSocket?.connected && roomCode && gameId && userId) {
            currentSocket.emit(GameEvents.GET_GAME_STATE, {
              roomCode,
              gameId,
              userId,
            });
          }
        }
      } else if (nextAppState === 'background') {
        console.log('useGameState: App going to background.');

        if (gameState) GameStatePersistence.saveGameState(gameId, gameState);
      }
      setAppState(nextAppState);
    });

    return () => {
      console.log('useGameState: AppState listener removed.');
      subscription.remove();
    };
  }, [appState, gameId, gameState, roomCode, userId, reconnect, selectedToken]);

  // Detect QUICK variant or quickGameTimerEnabled from game state
  useEffect(() => {
    if (gameType) {
      const variant = gameType.variant;
      const quickEnabled = gameType?.rules?.quickGameTimerEnabled;
      setIsQuickGame(variant === 'QUICK' || quickEnabled === true);
    }
  }, [gameType]);

  useEffect(() => {
    const currentSocket = socketService.socket;
    if (!currentSocket || !currentSocket.connected || !userId) {
      return;
    }

    // QUICK GAME TIMER EVENTS
    const onQuickGameTimerStarted = data => {
      if (data.gameId === gameId) {
        setQuickGameTotalTime(data.totalTime);
        setQuickGameTimeRemaining(data.timeRemaining);
        setQuickGameWarningZone(false);
      }
    };
    const onQuickGameTimerTick = data => {
      if (data.gameId === gameId) {
        setQuickGameTimeRemaining(data.timeRemaining);
        setQuickGameTotalTime(data.totalTime);
        setQuickGameWarningZone(!!data.warningZone);
      }
    };
    const onQuickGameTimerExpired = data => {
      if (data.gameId === gameId) {
        setQuickGameTimeRemaining(0);
        setQuickGameWarningZone(false);
        setQuickGameWinner(data.winner);
        setQuickGameFinalRankings(data.finalRankings);
      }
    };
    currentSocket.on('quick_game_timer_started', onQuickGameTimerStarted);
    currentSocket.on('quick_game_timer_tick', onQuickGameTimerTick);
    currentSocket.on('quick_game_timer_expired', onQuickGameTimerExpired);

    return () => {
      currentSocket.off('quick_game_timer_started', onQuickGameTimerStarted);
      currentSocket.off('quick_game_timer_tick', onQuickGameTimerTick);
      currentSocket.off('quick_game_timer_expired', onQuickGameTimerExpired);
    };
  }, [gameId, userId]);

  // Calculate if user can roll dice
  const canRollDice = useMemo(() => {
    return (
      currentTurn === userId &&
      gameStatus === GAME_CONSTANTS.GAME_STATES.IN_PROGRESS &&
      !isGamePaused &&
      diceValue <= 0
    );
  }, [currentTurn, userId, gameStatus, isGamePaused, diceValue]);

  // Calculate if pieces are selectable using NEW path logic
  const canSelectPieces = useMemo(() => {
    if (
      currentTurn !== userId ||
      gameStatus !== GAME_CONSTANTS.GAME_STATES.IN_PROGRESS ||
      isGamePaused ||
      diceValue <= 0
    ) {
      return false;
    }

    // Check if current player has any valid moves using NEW paths
    const currentPlayer = players.find(p => p.userId === userId);
    if (!currentPlayer) return false;

    const playerPieces = plottedPieces.filter(p => p.playerId === userId);
    const validPlayerMoves = getValidMovesForPlayer(
      playerPieces,
      diceValue,
      currentPlayer.position,
      totalPlayers,

      // Turn timeout features
      timeRemaining,
      playerLives,
    );

    console.log(
      `Player ${currentPlayer.position + 1} valid moves:`,
      validPlayerMoves,
    );
    return validPlayerMoves.length > 0;
  }, [
    currentTurn,
    userId,
    gameStatus,
    isGamePaused,
    diceValue,
    players,
    plottedPieces,
    totalPlayers,

    // Turn timeout features
    timeRemaining,
    playerLives,
  ]);

  // Get current player details
  const currentPlayer = useMemo(() => {
    return Object.values(playerDetails).find(p => p.userId === currentTurn);
  }, [playerDetails, currentTurn]);

  return {
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

    socket,
    connectionState,
    error,
    loading,

    chat,
    isGamePaused,
    hasUnreadMessages,

    reconnect,
    getHomePiecesForPlayer,
    rollDice,
    selectToken,
    moveToken,
    sendMessage,
    togglePause,
    leaveGame,
    toggleChat,
    setHasUnreadMessages,
    toggleSound,

    gameCompletionData,
    clearGameCompletionData: () => setGameCompletionData(null),
    // Enhanced features
    canRollDice,
    canSelectPieces,
    handleTurnTimeout,
    calculateTimeRemaining,
    currentPlayer,
    turnStartTime,
    totalPlayers,

    // Turn timeout features
    timeRemaining,
    playerLives,
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
  };
};

export default useGameState;
