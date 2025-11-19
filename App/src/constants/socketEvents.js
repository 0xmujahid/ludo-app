export const SocketEvents = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  ERROR: 'error',

  // Room events
  JOIN_ROOM: 'joinRoom',
  LEAVE_ROOM: 'leaveRoom',
  ROOM_JOINED: 'roomJoined',
  ROOM_LEFT: 'roomLeft',

  // Game events
  GAME_STATE_UPDATED: 'gameStateUpdated',
  GET_GAME_STATE: 'getGameState',
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  GAME_STARTED: 'gameStarted',
  GAME_STARTING: 'gameStarting',
  PLAYER_READY: 'playerReady',
  DICE_ROLLED: 'diceRolled',
  PIECE_MOVED: 'pieceMoved',
  PLAYER_CAPTURED: 'playerCaptured',
  TURN_CHANGED: 'turnChanged',
  TURN_COMPLETE: 'turnComplete',
  TURN_TIMEOUT: 'turnTimeout',
  AUTO_TURN_CHANGE: 'autoTurnChange',
  REQUEST_VALID_MOVES: 'requestValidMoves',
  VALID_MOVES_RESPONSE: 'validMovesResponse',
  GAME_COMPLETED: 'gameCompleted',
  GAME_STATUS_UPDATED: 'gameStatusUpdated',
  PLAYER_FORFEITED: 'playerForfeited',
  PLAYER_DISCONNECTED: 'playerDisconnected',
  PLAYER_RECONNECTED: 'playerReconnected',

  // Chat events
  CHAT_MESSAGE: 'chatMessage',
  SYSTEM_MESSAGE: 'systemMessage',

  // Add new matchmaking events
  MATCHMAKING_UPDATE: 'matchmakingUpdate',
  MATCH_FOUND: 'matchFound',
  QUEUE_POSITION_UPDATE: 'queuePositionUpdate',
  MATCHMAKING_TIMEOUT: 'matchmakingTimeout',
  MATCHMAKING_ERROR: 'matchmakingError',
  // Turn timeout events
  TURN_TIME_RESET: 'turn-time-reset',
  TURN_TIME_TICK: 'turn-time-tick',
  LIFE_DEDUCTED: 'life-deducted',
};
