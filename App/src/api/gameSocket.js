import {useState, useEffect, useCallback} from 'react';
import EncryptedStorage from 'react-native-encrypted-storage';
import {io} from 'socket.io-client';
import {GameStatePersistence, GameStateError} from '../utils/gameUtils';
import {SocketEvents} from '../constants/socketEvents';

const socketUrl = 'http://10.0.2.2:3000';

export const useSocketConnection = (roomCode = '', gameId = '') => {
  const [socket, setSocket] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState(null);

  const connect = useCallback(() => {
    EncryptedStorage.getItem('authToken')
      .then(token => {
        const newSocket = io(socketUrl, {
          auth: {token},
          reconnection: true,
          transports: ['websocket'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          query: {gameId: gameId},
        });

        newSocket.on('connect', () => {
          console.log('Socket connected successfully');
          setConnectionState('connected');
          setError(null);
          if (gameId && roomCode) {
            socket.emit(SocketEvents.GET_GAME_STATE, {roomCode, gameId});
          }

          // Request game state sync if reconnecting
          const savedState = GameStatePersistence.loadGameState(gameId);
          if (savedState) {
            newSocket.emit('syncGameState', {
              gameId,
              lastUpdateTime: savedState.lastUpdateTime,
            });
          }
        });

        newSocket.on('connect_error', err => {
          console.error('Socket connection error:', err);
          setConnectionState('error');
          setError(new GameStateError(err.message, 'CONNECTION_ERROR'));
        });

        newSocket.on('disconnect', reason => {
          setConnectionState('disconnected');
          if (reason === 'io server disconnect') {
            setTimeout(() => newSocket.connect(), 1000);
          }
        });

        setSocket(newSocket);
      })
      .catch(err => {
        console.error('Failed to retrieve auth token:', err);
        setError(new GameStateError(err.message, 'TOKEN_ERROR'));
      });

    return () => {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    };
  }, [gameId]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return {socket, connectionState, error, reconnect: connect};
};
