import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/** Hydration never "changes" after it happens, so there is nothing to subscribe to. */
const subscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  // The server snapshot is false and the client snapshot is true, so this reads
  // as false through the static render and true once hydrated — the same effect
  // as a setState-in-effect flag, without the cascading render it caused.
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
