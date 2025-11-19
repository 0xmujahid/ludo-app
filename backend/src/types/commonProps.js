import PropTypes from 'prop-types';

// Game related PropTypes
export const GameColorType = PropTypes.oneOf(['red', 'green', 'yellow', 'blue']);

export const PlayerStatePropType = PropTypes.shape({
  pieces: PropTypes.arrayOf(PropTypes.number).isRequired,
  color: GameColorType.isRequired
});

export const GameStatePropType = PropTypes.shape({
  players: PropTypes.objectOf(PlayerStatePropType).isRequired,
  currentPlayer: PropTypes.string.isRequired,
  diceRoll: PropTypes.number.isRequired,
  winner: PropTypes.string,
  maxMoves: PropTypes.number,
  timeLimit: PropTypes.number,
  timeRemaining: PropTypes.objectOf(PropTypes.number)
});

// Tournament related PropTypes
export const TournamentDataPropType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  startTime: PropTypes.instanceOf(Date).isRequired,
  maxParticipants: PropTypes.number.isRequired,
  entryFee: PropTypes.number.isRequired,
  variant: PropTypes.string.isRequired
});

// User related PropTypes
export const UserDataPropType = PropTypes.shape({
  username: PropTypes.string.isRequired,
  phoneNumber: PropTypes.string.isRequired,
  email: PropTypes.string,
  password: PropTypes.string
});

// Wallet related PropTypes
export const WalletTransactionPropType = PropTypes.shape({
  amount: PropTypes.number.isRequired,
  type: PropTypes.oneOf(['deposit', 'withdrawal']).isRequired,
  userId: PropTypes.string.isRequired
});

// Request handler types
export const RequestHandlerPropType = PropTypes.func;

// Common helper types
export const EntityIdPropType = PropTypes.string;
export const GameStatusPropType = PropTypes.oneOf(['waiting', 'in_progress', 'completed']);
