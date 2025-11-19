import {createSlice} from '@reduxjs/toolkit';
import {initialState} from './initialState';

export const walletSlice = createSlice({
  name: 'wallet',
  initialState: initialState,
  reducers: {
    updateWallet: (state, action) => {
      state.balance = action.payload.balance;
      state.winningAmount = action.payload.winningAmount;
    },
  },
});

export const {updateWallet} = walletSlice.actions;

export default walletSlice.reducer;
