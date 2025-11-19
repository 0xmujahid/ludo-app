import {combineReducers} from 'redux';
import gameSlice from './reducers/game/gameSlice';
import appSlice from './reducers/app/appSlice';
import walletSlice from './reducers/wallet/walletSlice';
import transactionSlice from './reducers/transaction/transactionSlice';
import leaderboardSlice from './reducers/leaderboard/leaderboardSlice';

const rootReducer = combineReducers({
  game: gameSlice,
  app: appSlice,
  wallet: walletSlice,
  transaction: transactionSlice,
  leaderboard: leaderboardSlice,
});
export default rootReducer;
