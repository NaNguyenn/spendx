import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';

export type StatisticsPeriod = 'week' | 'month';

interface PeriodToggleProps {
  value: StatisticsPeriod;
  onChange: (period: StatisticsPeriod) => void;
}

/**
 * Design component `emkM8`, "Component — Period Toggle" (spec `ipJbc`): a
 * full-width, two-segment control that switches which of the already-fetched
 * `StatisticsDto.week` / `.month` the Summary Card renders — never a
 * refetch, since the server returns both in one call.
 */
export function PeriodToggle({ value, onChange }: PeriodToggleProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.track, { backgroundColor: theme.surface2 }]}>
      <Segment
        active={value === 'week'}
        label={t('statistics.periodToggle.week')}
        onPress={() => onChange('week')}
      />
      <Segment
        active={value === 'month'}
        label={t('statistics.periodToggle.month')}
        onPress={() => onChange('month')}
      />
    </View>
  );
}

interface SegmentProps {
  active: boolean;
  label: string;
  onPress: () => void;
}

function Segment({ active, label, onPress }: SegmentProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.segment,
        active && [styles.segmentActive, { backgroundColor: theme.surface }],
      ]}
    >
      <ThemedText
        themeColor={active ? 'text' : 'textSecondary'}
        style={styles.label}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radii.full,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
  },
  segmentActive: {
    // Design's stacked e-1 shadow (#0A0F1E14 y1 blur2, #0A0F1E1F y4 blur10
    // spread-3) — RN doesn't support multiple shadow layers on one view, so
    // this is one shadow approximating both.
    shadowColor: '#0A0F1E',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    // Deterministic layout instead of shrink-to-fit: Android under-measures
    // a bare inline Text at this size/weight (the ThemedText `default` type
    // ships fontSize 15/lineHeight 21, and only `fontSize` was overridden
    // here), so "This week" wrapped into a clipped second line rather than
    // staying on one. `width: '100%'` + `textAlign: 'center'` gives the
    // label the segment's actual measured width instead of guessing it, and
    // the explicit `lineHeight` (rather than the inherited 21) matches this
    // 13px size so a single line isn't clipped by a too-short line box.
    width: '100%',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
});
