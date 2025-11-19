import apiClient from './apiClient';

export const getTransaction = async (successCallback, failureCallback) => {
  try {
    const response = await apiClient.get('/api/crypto/transactions');
    const transactions = response.data?.data ?? [];
    successCallback({ transactions });
  } catch (error) {
    console?.error('Failed to fetch transaction:', error);
    failureCallback?.(error);
    throw error;
  }
};

export const getTransactionFilterList = async (status, successCallback, failureCallback) => {
  try {
    const response = await apiClient.get('/api/crypto/transactions');
    const transactions = response.data?.data ?? [];
    const normalizedStatus = status ? String(status).toLowerCase() : 'all';
    const filtered = normalizedStatus !== 'all'
      ? transactions.filter((item) => {
          const txStatus = (item.status || '').toLowerCase();
          const payStatus = (item.paymentStatus || '').toLowerCase();
          return txStatus === normalizedStatus || payStatus === normalizedStatus;
        })
      : transactions;
    successCallback({ transactions: filtered });
  } catch (error) {
    console?.error('Failed to fetch transaction:', error);
    failureCallback?.(error);
    throw error;
  }
};
