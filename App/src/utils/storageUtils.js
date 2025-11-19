import EncryptedStorage from 'react-native-encrypted-storage';

export const storeToken = async token => {
  try {
    await EncryptedStorage.setItem('authToken', token);
  } catch (error) {
    console.error('Error storing token:', error);
  }
};

export const getToken = async () => {
  try {
    return await EncryptedStorage.getItem('authToken');
  } catch (error) {
    console.error('Error retrieving token:', error);
  }
};

export const removeToken = async () => {
  try {
    await EncryptedStorage.removeItem('authToken');
  } catch (error) {
    console.error('Error removing token:', error);
  }
};
