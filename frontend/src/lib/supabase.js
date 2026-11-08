import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const CHUNK_SIZE = 1800;

const webStorage = {
  getItem: (key) => Promise.resolve(globalThis.localStorage?.getItem(key) ?? null),
  setItem: (key, value) => Promise.resolve(globalThis.localStorage?.setItem(key, value)),
  removeItem: (key) => Promise.resolve(globalThis.localStorage?.removeItem(key)),
};

// SecureStore values are limited on Android, so long Supabase sessions are chunked.
const secureStorage = {
  async getItem(key) {
    const chunks = Number((await SecureStore.getItemAsync(`${key}__chunks`)) || 0);
    if (!chunks) return SecureStore.getItemAsync(key);
    let value = '';
    for (let index = 0; index < chunks; index += 1) {
      value += (await SecureStore.getItemAsync(`${key}__${index}`)) || '';
    }
    return value;
  },
  async setItem(key, value) {
    const previous = Number((await SecureStore.getItemAsync(`${key}__chunks`)) || 0);
    for (let index = 0; index < previous; index += 1) {
      await SecureStore.deleteItemAsync(`${key}__${index}`);
    }
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.deleteItemAsync(`${key}__chunks`);
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const chunks = Math.ceil(value.length / CHUNK_SIZE);
    for (let index = 0; index < chunks; index += 1) {
      await SecureStore.setItemAsync(
        `${key}__${index}`,
        value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)
      );
    }
    await SecureStore.setItemAsync(`${key}__chunks`, String(chunks));
  },
  async removeItem(key) {
    const chunks = Number((await SecureStore.getItemAsync(`${key}__chunks`)) || 0);
    for (let index = 0; index < chunks; index += 1) {
      await SecureStore.deleteItemAsync(`${key}__${index}`);
    }
    await SecureStore.deleteItemAsync(`${key}__chunks`);
    await SecureStore.deleteItemAsync(key);
  },
};

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: Platform.OS === 'web' ? webStorage : secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
