import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** The port the NestJS API listens on. Matches backend/.env.example. */
export const API_PORT = 3000;

/** The address of the host machine from inside the Android emulator. */
const ANDROID_EMULATOR_HOST = '10.0.2.2';

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '::1'];

export interface BaseUrlInputs {
  /** EXPO_PUBLIC_API_URL, when the build sets one. */
  explicitUrl: string | undefined;
  /** `host:port` Metro is being served from, per Constants.expoConfig.hostUri. */
  hostUri: string | undefined;
  platform?: string;
}

/**
 * Works out which address this app should call.
 *
 * In development the API runs on the same machine as Metro, so Metro's own host
 * is the right answer: a physical device gets the laptop's LAN address, and a
 * simulator gets loopback — without anyone editing a constant when the network
 * changes. Android is the exception the whole function exists for: its emulator
 * reaches the host through 10.0.2.2, and calling `localhost` there quietly
 * addresses the emulated device itself.
 *
 * Released builds set EXPO_PUBLIC_API_URL, which always wins.
 */
export function resolveApiBaseUrl({
  explicitUrl,
  hostUri,
  platform = Platform.OS,
}: BaseUrlInputs): string {
  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, '');
  }

  const host = hostUri?.split(':')[0] || 'localhost';
  const reachable =
    platform === 'android' && LOOPBACK_HOSTS.includes(host)
      ? ANDROID_EMULATOR_HOST
      : host;

  return `http://${reachable}:${API_PORT}`;
}

/** The base URL for this running app. */
export const API_BASE_URL = resolveApiBaseUrl({
  explicitUrl: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri,
});
