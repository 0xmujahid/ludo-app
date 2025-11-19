import axios from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';
import { Platform } from 'react-native';

// Use the emulator host mapping when running on Android in development.
// 10.0.2.2 -> host machine from Android emulator
const devBase = Platform.OS === 'android' ? 'http://192.168.100.7:3000' : 'http://localhost:3000';
const baseURL = __DEV__ ? devBase : 'https://api.ludovip.win';

const apiClient = axios.create({
  baseURL,
  timeout: 100000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
apiClient.interceptors.request.use(
  async config => {
    try {
      const token = await EncryptedStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching token:', error);
    }
    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor to handle token expiration globally
apiClient.interceptors.response.use(
  response => response,
  async error => {
    console.log('statusCode', error.response);
    if (error.response?.status === 401) {
      // Handle token expiration: Clear storage and redirect to login
      console.error('Token expired, redirecting to login');
    }
    return Promise.reject(error);
  },
);

export default apiClient;
