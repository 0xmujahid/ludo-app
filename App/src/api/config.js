import apiClient from './apiClient';

export const getActiveConfig = async (successCallback, failureCallback) => {
  try {
    const response = await apiClient.get('/api/admin/configs/active');
    console.log(response);
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to fetch active games:', error);
    failureCallback(error);
    throw error;
  }
};
