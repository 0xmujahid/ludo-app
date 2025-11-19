import EncryptedStorage from 'react-native-encrypted-storage';
import {io} from 'socket.io-client';
import {SocketEvents} from '../constants/socketEvents';
import {GameStateError} from '../utils/gameUtils';

const socketUrl = 'http://10.0.2.2:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.error = null;
    this.connectionState = 'disconnected';
    this.gameEvents = {
      ...SocketEvents,
    };
  }

  async connect() {
    const token = await EncryptedStorage.getItem('authToken');

    this.socket = io(socketUrl, {
      auth: {token},
      transports: ['websocket'],
    });

    await this.socket.on('connect', () => {
      console.log('Socket connected successfully');
      this.connectionState = 'connected';
    });

    this.socket.on('connect_error', error => {
      console.error('Socket connection error:', error);
      this.connectionState = 'error';
      this.error = new GameStateError(error.message, 'CONNECTION_ERROR');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connectionState = 'disconnected';
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

export default new SocketService();
