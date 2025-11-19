import {MMKV} from 'react-native-mmkv';

const storage = new MMKV();

export const GAME_CONSTANTS = {
  BOARD_SIZE: 15,
  TOKENS_PER_PLAYER: {
    classic: 4,
    quick: 2,
  },
  DICE_VALUES: [1, 2, 3, 4, 5, 6],
  MAX_PLAYERS: 4,
  PLAYER_COLORS: {
    0: 'red',
    1: 'green',
    2: 'blue',
    3: 'yellow',
  },
  GAME_STATES: {
    WAITING: 'WAITING',
    STARTING: 'STARTING',
    IN_PROGRESS: 'IN_PROGRESS',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
  },
  MOVE_RULES: {
    CONSECUTIVE_SIXES: 3,
    CLASSIC_START_VALUE: 6,
    QUICK_START_VALUE: 4,
  },
  VICTORY_POSITION_ID: 57,
  HOME_POSITION_ID: 0,
};

export const areTokenPositionsEqual = (pos1, pos2) => {
  return pos1 === pos2;
};

export const formatTimestamp = timestamp => {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Failed to format timestamp:', timestamp, error);
    return 'Invalid Date';
  }
};

export const darkenColor = (color, amount) => {
  if (
    typeof color !== 'string' ||
    !color.startsWith('#') ||
    color.length !== 7
  ) {
    console.warn(`Invalid color format for darkenColor: ${color}`);
    return color;
  }
  try {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const b = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(255 * amount));
    const g = Math.max(0, (num & 0x0000ff) - Math.round(255 * amount));
    return `#${(g | (b << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
  } catch (error) {
    console.error(`Error darkening color ${color}:`, error);
    return color;
  }
};

export const calculatePlayerProgress = (playerDetail, gameType) => {
  if (
    !playerDetail ||
    !Array.isArray(playerDetail.tokenPositions) ||
    playerDetail.tokenPositions.length === 0
  ) {
    return 0;
  }

  const tokens = playerDetail.tokenPositions;
  const totalTokens = tokens.length;
  let totalProgressPoints = 0;

  const maxPathPosition = GAME_CONSTANTS.VICTORY_POSITION_ID;

  tokens.forEach(pos => {
    if (pos === GAME_CONSTANTS.VICTORY_POSITION_ID) {
      totalProgressPoints += maxPathPosition;
    } else if (pos !== GAME_CONSTANTS.HOME_POSITION_ID) {
      totalProgressPoints += pos;
    }
  });

  const maxPossibleTotalProgress = totalTokens * maxPathPosition;

  if (maxPossibleTotalProgress === 0) return 0;

  const progressPercentage =
    (totalProgressPoints / maxPossibleTotalProgress) * 100;

  return Math.round(progressPercentage);
};

export const compareGameStates = (serverState, localState) => {
  if (!serverState || !localState) return {};

  const differences = {};

  const serverTokenPositions = Object.values(serverState.players || {}).flatMap(
    p => p.tokenPositions || [],
  );
  const localTokenPositions = Object.values(localState.players || {}).flatMap(
    p => p.tokenPositions || [],
  );

  if (
    JSON.stringify(serverTokenPositions) !== JSON.stringify(localTokenPositions)
  ) {
    differences.tokenPositions = serverTokenPositions;
  }

  if (serverState.currentPlayer !== localState.currentPlayer) {
    differences.currentPlayer = serverState.currentPlayer;
  }

  if (serverState.status !== localState.status) {
    differences.status = serverState.status;
  }

  if (serverState.diceRoll !== localState.diceRoll) {
    differences.diceRoll = serverState.diceRoll;
  }

  return differences;
};

const areTokenArraysEqual = (serverTokens, localTokens) => {
  if (!serverTokens || !localTokens) return false;
  if (serverTokens.length !== localTokens.length) return false;

  const sortedServer = [...serverTokens].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const sortedLocal = [...localTokens].sort((a, b) => a.id.localeCompare(b.id));

  return sortedServer.every((serverToken, index) => {
    const localToken = sortedLocal[index];

    return (
      serverToken.id === localToken.id &&
      serverToken.pos === localToken.pos &&
      serverToken.color === localToken.color
    );
  });
};

export const GameStatePersistence = {
  saveGameState: (gameId, state) => {
    if (!gameId || !state) {
      console.warn('Cannot save game state: missing gameId or state');
      return;
    }
    try {
      storage.set(
        `game_${gameId}`,
        JSON.stringify({
          ...state,
          lastSaved: Date.now(),
        }),
      );
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  },

  loadGameState: gameId => {
    if (!gameId) {
      console.warn('Cannot load game state: missing gameId');
      return null;
    }
    try {
      const saved = storage.getString(`game_${gameId}`);
      if (!saved) return null;

      const state = JSON.parse(saved);

      if (Date.now() - state.lastSaved > 3600000) {
        console.log(`Game state for ${gameId} is too old, clearing.`);
        storage.delete(`game_${gameId}`);
        return null;
      }
      console.log(`Loaded game state for ${gameId}`);
      return state;
    } catch (error) {
      console.error('Failed to load game state:', error);
      return null;
    }
  },

  clearGameState: gameId => {
    if (!gameId) {
      console.warn('Cannot clear game state: missing gameId');
      return;
    }
    try {
      storage.delete(`game_${gameId}`);
    } catch (error) {
      console.error('Failed to clear game state:', error);
    }
  },
};

export const createSocketRetryHandler = (
  socket,
  maxRetries = 5,
  initialDelay = 1000,
) => {
  let retryCount = 0;
  let retryDelay = initialDelay;

  const handleDisconnect = reason => {
    console.log(
      `Retry handler: Socket disconnected (${reason}). Retries left: ${
        maxRetries - retryCount
      }`,
    );
    if (reason === 'io server disconnect') {
    }

    if (retryCount < maxRetries) {
      retryCount++;
      retryDelay = initialDelay * Math.pow(2, retryCount - 1);
      console.log(`Retry handler: Attempting reconnect in ${retryDelay}ms...`);
      setTimeout(() => {
        if (socket && !socket.connected) {
          socket.connect();
        }
      }, retryDelay);
    } else {
      console.error(
        `Retry handler: Max retries (${maxRetries}) reached. Connection failed.`,
      );
    }
  };

  const handleConnect = () => {
    console.log('Retry handler: Socket reconnected.');
    retryCount = 0;
    retryDelay = initialDelay;
  };

  if (socket) {
    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleConnect);
  } else {
    console.warn('Retry handler: Socket is null, cannot attach listeners.');
  }

  return {
    reset: () => {
      retryCount = 0;
      retryDelay = initialDelay;
      console.log('Retry handler: Reset.');
    },
    cleanup: () => {
      console.log('Retry handler: Cleaning up listeners.');
      if (socket) {
        socket.off('disconnect', handleDisconnect);
        socket.off('connect', handleConnect);
      }
    },
  };
};

export const validateGameState = state => {
  if (!state || typeof state !== 'object') {
    console.error('Validation Error: State is null or not an object');
    return false;
  }

  const requiredFields = [
    'id',
    'status',
    'players',
    'turnOrder',
    'diceRoll',
    'maxPlayers',
    'roomCode',
    'currentPlayer',
  ];
  if (!requiredFields.every(field => field in state)) {
    console.error(
      'Validation Error: Missing required fields',
      requiredFields.filter(field => !(field in state)),
    );
    return false;
  }

  if (!Object.values(GAME_CONSTANTS.GAME_STATES).includes(state.status)) {
    console.error('Validation Error: Invalid game status', state.status);
    return false;
  }

  if (
    !state.players ||
    typeof state.players !== 'object' ||
    Object.keys(state.players).length === 0
  ) {
    console.error('Validation Error: Players data is invalid or empty');
    return false;
  }

  const allPlayersValid = Object.values(state.players).every(player => {
    if (!player || typeof player !== 'object') {
      console.error(
        'Validation Error: Invalid player object in players map',
        player,
      );
      return false;
    }
    const playerRequiredFields = [
      'userId',
      'username',
      'color',
      'position',
      'tokenPositions',
    ];
    if (!playerRequiredFields.every(field => field in player)) {
      console.error(
        'Validation Error: Player object missing required fields',
        playerRequiredFields.filter(field => !(field in player)),
        player,
      );
      return false;
    }
    if (!Array.isArray(player.tokenPositions)) {
      console.error(
        'Validation Error: player.tokenPositions is not an array',
        player.tokenPositions,
      );
      return false;
    }

    const maxPosId = 60;
    if (
      !player.tokenPositions.every(
        pos => typeof pos === 'number' && pos >= 0 && pos <= maxPosId,
      )
    ) {
      console.warn(
        'Validation Warning: Invalid token position(s)',
        player.tokenPositions,
      );
    }
    return true;
  });

  if (!allPlayersValid) return false;

  if (!Array.isArray(state.turnOrder) || state.turnOrder.length === 0) {
    console.error('Validation Error: turnOrder is invalid or empty');
    return false;
  }

  if (
    state.currentPlayer !== null &&
    state.currentPlayer !== undefined &&
    !Object.keys(state.players).includes(state.currentPlayer)
  ) {
    console.warn(
      'Validation Warning: currentPlayer is not a valid player userId',
      state.currentPlayer,
    );
  }

  console.log('Game state validated successfully.');
  return true;
};

export class GameStateError extends Error {
  constructor(message, code, data) {
    super(message);
    this.name = 'GameStateError';
    this.code = code;
    this.data = data;
  }
}

export const handleGameError = error => {
  const errorCode = error?.code || 'UNKNOWN_ERROR';
  const errorMessage = error?.message || 'An unexpected error occurred.';

  switch (errorCode) {
    case 'INVALID_MOVE':
      return {
        message: errorMessage,
        severity: 'warning',
      };
    case 'NOT_YOUR_TURN':
      return {
        message: errorMessage,
        severity: 'info',
      };
    case 'GAME_FINISHED':
      return {
        message: errorMessage,
        severity: 'info',
      };
    case 'SYNC_ERROR':
      return {
        message: errorMessage,
        severity: 'error',
      };
    case 'CONNECTION_ERROR':
      return {
        message: errorMessage,
        severity: 'error',
      };
    case 'TOKEN_ERROR':
      return {
        message: errorMessage,
        severity: 'error',
      };
    case 'ROOM_NOT_FOUND':
      return {
        message: errorMessage || 'Game room not found.',
        severity: 'error',
      };
    case 'PLAYER_ALREADY_IN_ROOM':
      return {
        message: errorMessage || 'You are already in this room.',
        severity: 'info',
      };
    case 'ROOM_FULL':
      return {
        message: errorMessage || 'This room is full.',
        severity: 'warning',
      };
    default:
      if (errorCode.startsWith('BACKEND_')) {
        return {
          message: errorMessage,
          severity: 'error',
        };
      }

      return {
        message: 'An unexpected client-side error occurred.',
        severity: 'error',
      };
  }
};

export const createDebouncedTokenMove = (callback, delay = 200) => {
  let timeoutId;
  let lastArgs;

  return (...args) => {
    lastArgs = args;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      callback(...lastArgs);
    }, delay);
  };
};
