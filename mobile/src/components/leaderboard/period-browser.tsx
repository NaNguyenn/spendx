import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import type { StatisticsPeriod } from '@/components/expenses/period-toggle';
import { ThemedText } from '@/components/themed-text';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { dateFromCalendarString } from '@/lib/expense-date';
import { formatPeriodRangeWithYear } from '@/lib/format';
import { isNextDisabled, periodBrowserSubtitleKey } from '@/lib/leaderboard';

const PREV_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'chevron_left',
  web: 'chevron_left',
};

const NEXT_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
};

interface PeriodBrowserProps {
  period: StatisticsPeriod;
  start: string;
  end: string;
  /** 0 at the current Period, negative further into the past — see lib/leaderboard.ts's `PeriodBrowseState`. */
  offset: number;
  onPrevious: () => void;
  onNext: () => void;
}

/**
 * Design component `umxjF`, "Period Browser": two 32×32 circular chevrons
 * around a centred range label ("5 – 11 Aug 2026") over a "current week" /
 * "past month" subtitle. Next is disabled — surface-2 fill, 0.45 opacity —
 * once the current Period is displayed, since there's nothing further
 * forward to browse to (mobile ticket #12).
 */
export function PeriodBrowser({
  period,
  start,
  end,
  offset,
  onPrevious,
  onNext,
}: PeriodBrowserProps) {
  const theme = useTheme();
  const { t, locale } = useTranslation();
  const nextDisabled = isNextDisabled(offset);

  const rangeLabel = formatPeriodRangeWithYear(
    dateFromCalendarString(start),
    dateFromCalendarString(end),
    locale,
  );
  const subtitle = t(periodBrowserSubtitleKey(period, offset));

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPrevious}
        accessibilityRole="button"
        accessibilityLabel={t('leaderboard.periodBrowser.previous')}
        style={({ pressed }) => [
          styles.chevron,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && styles.pressed,
        ]}
      >
        <SymbolView name={PREV_ICON} size={16} tintColor={theme.text} />
      </Pressable>

      <View style={styles.label}>
        <ThemedText style={styles.range}>{rangeLabel}</ThemedText>
        <ThemedText themeColor="textTertiary" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      </View>

      <Pressable
        onPress={onNext}
        disabled={nextDisabled}
        accessibilityRole="button"
        accessibilityLabel={t('leaderboard.periodBrowser.next')}
        accessibilityState={{ disabled: nextDisabled }}
        style={({ pressed }) => [
          styles.chevron,
          nextDisabled
            ? [styles.chevronDisabled, { backgroundColor: theme.surface2 }]
            : { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && !nextDisabled && styles.pressed,
        ]}
      >
        <SymbolView
          name={NEXT_ICON}
          size={16}
          tintColor={nextDisabled ? theme.textSecondary : theme.text}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 2,
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronDisabled: {
    borderWidth: 0,
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  range: {
    fontSize: 13.5, // design's own Period Browser label size
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11, // design's own Period Browser subtitle size
    fontWeight: '500',
  },
});
