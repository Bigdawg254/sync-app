import * as SecureStore from 'expo-secure-store';

export const storage = {
  set: async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, String(value));
    } catch {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, String(value));
      } catch {}
    }
  },
  get: async (key) => {
    try {
      const val = await SecureStore.getItemAsync(key);
      if (val !== null) return val;
    } catch {}
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch {}
    return null;
  },
  del: async (key) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch {}
  }
};