import apiClient from './apiClient';

export const getActiveGame = async (successCallback, failureCallback) => {
  try {
    const response = await apiClient.get('/api/game-types');
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to fetch active games:', error);
    failureCallback(error);
    throw error;
  }
};

export const getGameDetailsById = async (
  gameId,
  successCallback,
  failureCallback,
) => {
  try {
    const response = await apiClient.get(`/api/game-types/details/${gameId}`);
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to fetch active games:', error);
    failureCallback(error);
    throw error;
  }
};

export const gameMatchmakingApiCall = async (
  payload,
  successCallback,
  failureCallback,
) => {
  try {
    const response = await apiClient.post('/api/games/matchmaking', payload);
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to matchmaking games:', error);
    failureCallback(error);
    throw error;
  }
};

export const joinGameRoomApiCall = async (
  gameId,
  successCallback,
  failureCallback,
) => {
  try {
    const response = await apiClient.post(`/api/games/${gameId}/join`);
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to matchmaking games:', error);
    failureCallback(error);
    throw error;
  }
};

export const getLeaderBoard = async (successCallback, failureCallback) => {
  try {
    const response = await apiClient.get('/api/leaderboard');
    console.log(response.data);
    successCallback(response.data);
  } catch (error) {
    console?.error('Failed to fetch LeaderBoard:', error);
    failureCallback(error);
    throw error;
  }
};
