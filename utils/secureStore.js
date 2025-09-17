import * as NativeSecureStore from 'expo-secure-store';

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

export async function setItemAsync(key, value) {
  if (isWeb) {
    window.localStorage.setItem(key, value ?? '');
    return;
  }
  return NativeSecureStore.setItemAsync(key, value);
}

export async function getItemAsync(key) {
  if (isWeb) {
    const v = window.localStorage.getItem(key);
    return v === null ? null : v;
  }
  return NativeSecureStore.getItemAsync(key);
}

export async function deleteItemAsync(key) {
  if (isWeb) {
    window.localStorage.removeItem(key);
    return;
  }
  return NativeSecureStore.deleteItemAsync(key);
}


