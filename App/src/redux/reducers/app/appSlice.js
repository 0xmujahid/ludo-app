import {createSlice} from '@reduxjs/toolkit';
import {initialState} from './initialState';

export const appSlice = createSlice({
  name: 'user',
  initialState: initialState,
  reducers: {
    logout: () => initialState,
    setUserInfo: (state, action) => {
      state.userInfo = action.payload.info;
    },
    updateAuthToken: (state, action) => {
      state.token = action.payload.token;
    },
  },
});

export const {logout, setUserInfo, updateAuthToken} = appSlice.actions;

export default appSlice.reducer;
