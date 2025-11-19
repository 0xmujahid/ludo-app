import {createSlice} from '@reduxjs/toolkit';
import {initialState} from './initialState';

export const leaderboardSlice = createSlice({
  name: 'leaderboard',
  initialState: initialState,
  reducers: {
    updateLeaderboard: (state, action) => {
      return [...action.payload];
    },
  },
});

export const {updateLeaderboard} = leaderboardSlice.actions;

export default leaderboardSlice.reducer;
