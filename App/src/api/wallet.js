import apiClient from './apiClient';

export const getWalletBalance = async (successCallback, failureCallback) => {
  try {
    const response = await apiClient.get('/api/wallet/balance');
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to fetch balance:', error);
    failureCallback(error);
    throw error;
  }
};

export const addWalletBalance = async (
  payload,
  successCallback,
  failureCallback,
) => {
  try {
    const response = await apiClient.post('/api/wallet/add', payload);
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to fetch balance:', error);
    failureCallback(error);
    throw error;
  }
};


export const addWithdraw = async (
  payload,
  successCallback,
  failureCallback,
) => {
  try {
    const response = await apiClient.post('/api/wallet/withdraw', payload);
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to fetch balance:', error);
    failureCallback(error);
    throw error;
  }
};

