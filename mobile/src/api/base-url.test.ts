import { resolveApiBaseUrl } from './base-url';

const API_PORT = 3000;

describe('resolveApiBaseUrl', () => {
  it('prefers an explicit EXPO_PUBLIC_API_URL over anything derived', () => {
    const url = resolveApiBaseUrl({
      explicitUrl: 'https://api.spendx.example',
      hostUri: '192.168.1.20:8081',
    });

    expect(url).toBe('https://api.spendx.example');
  });

  it('strips a trailing slash from the explicit url so paths join cleanly', () => {
    const url = resolveApiBaseUrl({
      explicitUrl: 'https://api.spendx.example/',
      hostUri: undefined,
    });

    expect(url).toBe('https://api.spendx.example');
  });

  it('derives the host from the Metro host so a physical device reaches the laptop', () => {
    const url = resolveApiBaseUrl({
      explicitUrl: undefined,
      hostUri: '192.168.1.20:8081',
    });

    expect(url).toBe(`http://192.168.1.20:${API_PORT}`);
  });

  it('accepts a Metro host with no port', () => {
    const url = resolveApiBaseUrl({
      explicitUrl: undefined,
      hostUri: '192.168.1.20',
    });

    expect(url).toBe(`http://192.168.1.20:${API_PORT}`);
  });

  // The Android emulator reaches the host machine through 10.0.2.2 — its own
  // localhost is the emulated device, where nothing is listening.
  it('rewrites localhost to 10.0.2.2 on Android', () => {
    const url = resolveApiBaseUrl({
      explicitUrl: undefined,
      hostUri: 'localhost:8081',
      platform: 'android',
    });

    expect(url).toBe(`http://10.0.2.2:${API_PORT}`);
  });

  it('rewrites 127.0.0.1 to 10.0.2.2 on Android', () => {
    const url = resolveApiBaseUrl({
      explicitUrl: undefined,
      hostUri: '127.0.0.1:8081',
      platform: 'android',
    });

    expect(url).toBe(`http://10.0.2.2:${API_PORT}`);
  });

  it('leaves localhost alone on iOS, where the simulator shares the host network', () => {
    const url = resolveApiBaseUrl({
      explicitUrl: undefined,
      hostUri: 'localhost:8081',
      platform: 'ios',
    });

    expect(url).toBe(`http://localhost:${API_PORT}`);
  });

  it('falls back to localhost when Metro reports no host at all', () => {
    const url = resolveApiBaseUrl({
      explicitUrl: undefined,
      hostUri: undefined,
    });

    expect(url).toBe(`http://localhost:${API_PORT}`);
  });

  it('falls back to 10.0.2.2 on Android when Metro reports no host', () => {
    const url = resolveApiBaseUrl({
      explicitUrl: undefined,
      hostUri: undefined,
      platform: 'android',
    });

    expect(url).toBe(`http://10.0.2.2:${API_PORT}`);
  });

  it('ignores an empty EXPO_PUBLIC_API_URL, which is how an unset var arrives', () => {
    const url = resolveApiBaseUrl({
      explicitUrl: '',
      hostUri: '192.168.1.20:8081',
    });

    expect(url).toBe(`http://192.168.1.20:${API_PORT}`);
  });
});
