import apiClient from './apiClient';

export const getSupportedCurrencies = async (successCallback, failureCallback) => {
  try {
    const response = await apiClient.get('/api/crypto/currencies');
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to fetch supported currencies:', error);
    failureCallback?.(error);
    throw error;
  }
};

export const getMinimumAmount = async (currency, successCallback, failureCallback) => {
  try {
    const response = await apiClient.get(`/api/crypto/minimum/${currency}`);
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to fetch minimum amount:', error);
    failureCallback?.(error);
    throw error;
  }
};

export const estimateDeposit = async (payload, successCallback, failureCallback) => {
  try {
    const response = await apiClient.post('/api/crypto/estimate', payload);
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to estimate deposit:', error);
    failureCallback?.(error);
    throw error;
  }
};

export const createDeposit = async (payload, successCallback, failureCallback) => {
  try {
    const response = await apiClient.post('/api/crypto/deposit', payload);
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to create deposit:', error);
    failureCallback?.(error);
    throw error;
  }
};

export const getCryptoTransactions = async (successCallback, failureCallback) => {
  try {
    const response = await apiClient.get('/api/crypto/transactions');
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to fetch crypto transactions:', error);
    failureCallback?.(error);
    throw error;
  }
};

export const getCryptoTransactionStatus = async (paymentId, successCallback, failureCallback) => {
  try {
    const response = await apiClient.get(`/api/crypto/transaction/${paymentId}`);
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to fetch crypto transaction status:', error);
    failureCallback?.(error);
    throw error;
  }
};

