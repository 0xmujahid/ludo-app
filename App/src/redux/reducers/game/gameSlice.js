import {createSlice} from '@reduxjs/toolkit';
import {initialState} from './initialState';

export const gameSlice = createSlice({
  name: 'game',
  initialState: initialState,
  reducers: {
    updatePlayers: (state, action) => {
      state.players = action.payload;
    },
  },
});

export const {updatePlayers} = gameSlice.actions;

export default gameSlice.reducer;
