// src/constants/matchmaking.js
export const QueueState = {
  IDLE: 'IDLE',
  JOINING: 'JOINING',
  IN_QUEUE: 'IN_QUEUE',
  MATCH_FOUND: 'MATCH_FOUND',
  ERROR: 'ERROR',
};

export const SkillLevel = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
};

// src/types/matchmaking.js
import PropTypes from 'prop-types';

export const QueuePositionPropType = PropTypes.shape({
  position: PropTypes.number.isRequired,
  estimatedWaitTime: PropTypes.number.isRequired,
  totalPlayers: PropTypes.number.isRequired,
});

export const MatchmakingPreferencesPropType = PropTypes.shape({
  variant: PropTypes.string.isRequired,
  region: PropTypes.string.isRequired,
  gameTypeId: PropTypes.string.isRequired,
  skillLevel: PropTypes.oneOf(Object.values(SkillLevel)),
});

export const MatchmakingStatsPropType = PropTypes.shape({
  averageWaitTime: PropTypes.number.isRequired,
  playersInQueue: PropTypes.number.isRequired,
  activeGames: PropTypes.number.isRequired,
  regionStats: PropTypes.objectOf(
    PropTypes.shape({
      playersInQueue: PropTypes.number.isRequired,
      averageWaitTime: PropTypes.number.isRequired,
    }),
  ).isRequired,
});

export const MatchFoundEventPropType = PropTypes.shape({
  gameId: PropTypes.string.isRequired,
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
      skillRating: PropTypes.number.isRequired,
    }),
  ).isRequired,
  variant: PropTypes.string.isRequired,
  serverRegion: PropTypes.string.isRequired,
  startTime: PropTypes.instanceOf(Date).isRequired,
});
