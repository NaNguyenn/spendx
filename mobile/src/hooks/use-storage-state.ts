import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useReducer } from 'react';
import { Platform } from 'react-native';

/**
 * Persists a single string value across app restarts — used for the session's
 * access token, which is a credential and so belongs in expo-secure-store,
 * not AsyncStorage. SecureStore has no web implementation
 * (https://docs.expo.dev/versions/v57.0.0/sdk/securestore/#web-limitations),
 * so web degrades to localStorage rather than crashing the web bundle.
 *
 * Pattern follows Expo Router's documented authentication guide:
 * https://docs.expo.dev/router/advanced/authentication/
 */

type UseStateHook<T> = [[boolean, T | null], (value: T | null) => void];

function useAsyncState<T>(
  initialValue: [boolean, T | null] = [true, null],
): UseStateHook<T> {
  return useReducer(
    (
      _state: [boolean, T | null],
      action: T | null = null,
    ): [boolean, T | null] => [false, action],
    initialValue,
  ) as UseStateHook<T>;
}

export async function setStorageItemAsync(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Local storage is unavailable:', error);
    }
  } else if (value == null) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export function useStorageState(key: string): UseStateHook<string> {
  const [state, setState] = useAsyncState<string>();

  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        setState(
          typeof localStorage !== 'undefined'
            ? localStorage.getItem(key)
            : null,
        );
      } catch (error) {
        console.error('Local storage is unavailable:', error);
        setState(null);
      }
    } else {
      SecureStore.getItemAsync(key).then(setState);
    }
  }, [key, setState]);

  const setValue = useCallback(
    (value: string | null) => {
      setState(value);
      setStorageItemAsync(key, value);
    },
    [key, setState],
  );

  return [state, setValue];
}
