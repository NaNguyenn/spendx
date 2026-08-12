import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TAB_BAR_INSET } from '@/components/app-tabs';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The shared shape for Expenses, Leaderboard and Feed until each gets its
 * own ticket: a localized title plus a one-line note. The content is centred
 * in what's left above the floating tab bar, hence the TAB_BAR_INSET padding
 * (see app-tabs.tsx) — these screens have no scroll view of their own to pad.
 */
export function PlaceholderScreen({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  const theme = useTheme();

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <View style={[styles.content, { paddingBottom: TAB_BAR_INSET }]}>
        <ThemedText type="title">{title}</ThemedText>
        <ThemedText themeColor="textSecondary" type="subtitle">
          {note}
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sp2,
    padding: Spacing.sp6,
  },
});
