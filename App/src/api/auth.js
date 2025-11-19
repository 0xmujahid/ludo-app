import apiClient from './apiClient';
import EncryptedStorage from 'react-native-encrypted-storage';
import {
  logout,
  setUserInfo,
  updateAuthToken,
} from '../redux/reducers/app/appSlice';
import {storeToken, removeToken} from '../utils/storageUtils';
import {navigate} from '../utils/navigationUtils';

export const loginByOtpCall = async (
  phoneNumber,
  successCallback,
  failureCallback,
) => {
  try {
    const response = await apiClient.post('/api/auth/request-otp', {
      phoneNumber,
    });
    successCallback(response.data);
  } catch (error) {
    console?.error('Login failed:', error);
    failureCallback(error);
    throw error;
  }
};

export const verifyOtpCall = async (
  payload,
  successCallback,
  failureCallback,
) => {
  try {
    const response = await apiClient.post('/api/auth/verify', {
      ...payload,
    });
    console.log(response);
    storeToken(response?.data?.token);
    successCallback(response.data);
  } catch (error) {
    console?.error('Verification failed:', error);
    failureCallback(error);
    throw error;
  }
};

export const registerUserCall = async (
  payload,
  successCallback,
  failureCallback,
) => {
  try {
    const response = await apiClient.post('/api/auth/register', {
      ...payload,
    });
    successCallback(response.data);
  } catch (error) {
    console?.error('Regisration failed', error);
    failureCallback(error);
    throw error;
  }
};

export const logoutCall = () => async dispatch => {
  try {
    const token = await EncryptedStorage.getItem('authToken');
    await dispatch(logout());
    if (token) {
      await removeToken();
    }
    navigate('SignIn');
    console.log('User logged out successfully.');
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

export const checkAndRefreshToken =
  (successCallback, failureCallback) => async dispatch => {
    try {
      const token = await EncryptedStorage.getItem('authToken');
      if (token) {
        const response = await apiClient.get('/api/auth/verify-token');
        console.log(response);
        if (response?.data?.status && response?.data?.user.id) {
          storeToken(response?.data?.token);
          await dispatch(updateAuthToken(response?.data?.token));
          await dispatch(setUserInfo({info: response?.data?.user}));
          navigate('MainTabs');
          if (successCallback) {
            successCallback(response.data);
          }
        } else {
          console.warn(
            'Token is invalid/User doesnt exist anymore. Logging out.',
          );
          console.log(response.data);
          await logoutCall();
          if (failureCallback) {
            failureCallback();
          }
        }
      } else {
        dispatch(logoutCall());
        if (failureCallback) {
          failureCallback();
        }
      }
    } catch (error) {
      console.error('Error checking token validity:', error);
      dispatch(logoutCall());
      if (failureCallback) {
        failureCallback();
      }
    }
  };

  export const getAppVersion = async (successCallback, failureCallback) => {
    try {
      const response = await apiClient.get('/api/version');
      successCallback(response.data);
    } catch (error) {
      console?.error('Failed to fetch active games:', error);
      failureCallback(error);
      throw error;
    }
  };
