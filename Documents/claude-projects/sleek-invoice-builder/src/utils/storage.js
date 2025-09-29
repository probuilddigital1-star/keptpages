// Platform-agnostic storage utility
// Uses localStorage for web and AsyncStorage for React Native

const isWeb = typeof window !== 'undefined' && window.localStorage;

const storage = {
  async setItem(key, value) {
    if (isWeb) {
      localStorage.setItem(key, value);
    } else {
      // For React Native, would use AsyncStorage
      // But since we're running on web, this won't execute
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(key, value);
    }
  },

  async getItem(key) {
    if (isWeb) {
      return localStorage.getItem(key);
    } else {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      return await AsyncStorage.getItem(key);
    }
  },

  async removeItem(key) {
    if (isWeb) {
      localStorage.removeItem(key);
    } else {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.removeItem(key);
    }
  }
};

export default storage;