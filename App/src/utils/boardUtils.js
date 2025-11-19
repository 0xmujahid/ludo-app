import {GAME_CONSTANTS} from './gameUtils';
import {SafeSpots} from './plotData';

export const calculatePath = (color, boardSize = 15) => {
  if (!color) {
    console.warn(
      'calculatePath received undefined color, using RED as default',
    );
    color = 'RED';
  }

  const normalizedColor =
    typeof color === 'string' ? color.toUpperCase() : 'RED';
  let path = [];

  switch (normalizedColor) {
    case 'RED':
      for (let y = 1; y <= 5; y++) path.push({x: 6, y: y});
      path.push({x: 5, y: 6});
      for (let x = 4; x >= 0; x--) path.push({x: x, y: 6});
      path.push({x: 0, y: 7});
      for (let y = 8; y <= 14; y++) path.push({x: 0, y: y});
      path.push({x: 1, y: 14});
      for (let x = 2; x <= 6; x++) path.push({x: x, y: 14});
      path.push({x: 6, y: 13});
      for (let y = 12; y >= 8; y--) path.push({x: 6, y: y});
      path.push({x: 7, y: 8});

      for (let y = 9; y <= 14; y++) path.push({x: 7, y: y});

      break;

    case 'BLUE':
      for (let x = 1; x <= 5; x++) path.push({x: x, y: 8});
      path.push({x: 6, y: 9});
      for (let y = 10; y <= 14; y++) path.push({x: 6, y: y});
      path.push({x: 7, y: 14});
      for (let x = 8; x <= 14; x++) path.push({x: x, y: 14});
      path.push({x: 14, y: 13});
      for (let y = 12; y >= 8; y--) path.push({x: 14, y: y});
      path.push({x: 13, y: 8});
      for (let x = 12; x >= 9; x--) path.push({x: x, y: 8});
      path.push({x: 8, y: 7});

      for (let x = 7; x >= 1; x--) path.push({x: x, y: 7});
      break;

    case 'YELLOW':
      for (let y = 13; y >= 9; y--) path.push({x: 8, y: y});
      path.push({x: 9, y: 8});
      for (let x = 10; x <= 14; x++) path.push({x: x, y: 8});
      path.push({x: 14, y: 7});
      for (let y = 6; y >= 0; y--) path.push({x: 14, y: y});
      path.push({x: 13, y: 0});
      for (let x = 12; x >= 8; x--) path.push({x: x, y: 0});
      path.push({x: 8, y: 1});
      for (let y = 2; y <= 5; y++) path.push({x: 8, y: y});
      path.push({x: 7, y: 6});

      for (let y = 7; y <= 13; y++) path.push({x: 7, y: y});
      break;

    case 'GREEN':
      for (let x = 13; x >= 9; x--) path.push({x: x, y: 6});
      path.push({x: 8, y: 5});
      for (let y = 4; y >= 0; y--) path.push({x: 8, y: y});
      path.push({x: 7, y: 0});
      for (let x = 6; x >= 0; x--) path.push({x: x, y: 0});
      path.push({x: 0, y: 1});
      for (let y = 2; y <= 6; y++) path.push({x: 0, y: y});
      path.push({x: 1, y: 6});
      for (let x = 2; x <= 5; x++) path.push({x: x, y: 6});
      path.push({x: 6, y: 7});

      for (let x = 7; x <= 13; x++) path.push({x: x, y: 7});
      break;

    default:
      console.warn(`Unknown color: ${color}, using RED path instead`);
      return calculatePath('RED', boardSize);
  }

  path.push({x: 7, y: 7});

  return path;
};

export const validateBoardPosition = (position, maxPosId) => {
  if (position === undefined || position === null) return false;

  if (typeof position === 'number') {
    const maxPossibleId = maxPosId !== undefined ? maxPosId : 60;
    return position >= 0 && position <= maxPossibleId;
  }

  const {x, y} = position;
  if (x === undefined || y === undefined) return false;
  const boardSize = GAME_CONSTANTS.BOARD_SIZE || 15;
  return x >= 0 && x < boardSize && y >= 0 && y < boardSize;
};

export const calculateDistance = (pos1, pos2, path) => {
  if (!pos1 || !pos2 || !path) return 0;

  if (typeof pos1 === 'number' && typeof pos2 === 'number') {
    console.warn(
      'calculateDistance called with numerical IDs, requires path context.',
    );
    return 0;
  }

  const x1 = pos1.x || 0;
  const y1 = pos1.y || 0;
  const x2 = pos2.x || 0;
  const y2 = pos2.y || 0;
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

export const isSafeCell = positionId => {
  if (positionId === undefined || positionId === null) return false;

  if (typeof positionId === 'number' && Array.isArray(SafeSpots)) {
    return SafeSpots.includes(positionId);
  }

  console.warn('isSafeCell called with invalid input. Requires numerical ID.');
  return false;
};

export const normalizeColor = color => {
  if (!color || typeof color !== 'string') {
    return 'RED';
  }

  const upperColor = color.toUpperCase();
  if (['RED', 'BLUE', 'GREEN', 'YELLOW'].includes(upperColor)) {
    return upperColor;
  }

  if (upperColor.includes('RED')) return 'RED';
  if (upperColor.includes('BLUE')) return 'BLUE';
  if (upperColor.includes('GREEN')) return 'GREEN';
  if (upperColor.includes('YELLOW')) return 'YELLOW';

  return 'RED';
};
