import {MMKV} from 'react-native-mmkv';

const storage = new MMKV();

const reduxStorage = {
  setItem: (key, value) => {
    storage.set(key, value);
    return Promise.resolve(true);
  },
  getItem: key => {
    const value = storage.getString(key);
    try {
      // Attempt to parse the value as JSON
      return Promise.resolve(JSON.parse(value));
    } catch (error) {
      // If parsing fails, return the original string value
      return Promise.resolve(value);
    }
  },
  removeItem: key => {
    storage.delete(key);
    return Promise.resolve();
  },
};

export default reduxStorage;
