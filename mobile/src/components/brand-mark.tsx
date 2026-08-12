import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/** Accent square (radius 14) + "spendx" wordmark — the Auth screens' brand block. */
export function BrandMark() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.mark, { backgroundColor: theme.accent }]} />
      <ThemedText style={styles.wordmark}>spendx</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 14,
  },
  wordmark: {
    fontSize: 26,
    fontWeight: '800',
  },
});
