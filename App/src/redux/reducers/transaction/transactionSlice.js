import {createSlice} from '@reduxjs/toolkit';
import {initialState} from './initialState';

export const transactionSlice = createSlice({
  name: 'transactions',
  initialState: initialState,
  reducers: {
    updateTransaction: (state, action) => {
      state.transaction = action.payload;
    },
  },
});

export const {updateTransaction} = transactionSlice.actions;

export default transactionSlice.reducer;
