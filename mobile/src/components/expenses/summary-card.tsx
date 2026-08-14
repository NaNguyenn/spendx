import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import type { PeriodStatistics } from '@/api/expenses';
import type { StatisticsPeriod } from '@/components/expenses/period-toggle';
import { ThemedText } from '@/components/themed-text';
import { CATEGORY_META } from '@/constants/category';
import type { SupportedCurrency } from '@/constants/currency';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import type { TranslationKey } from '@/i18n/en';
import { dateFromCalendarString } from '@/lib/expense-date';
import { formatExpenseAmount } from '@/lib/amount-input';
import { formatPercent, formatPeriodRange } from '@/lib/format';
import {
  categoryShare,
  computeStatisticsDelta,
  nonzeroCategories,
} from '@/lib/statistics';

interface SummaryCardProps {
  period: PeriodStatistics;
  /** Which of `StatisticsDto`'s two periods `period` is — only matters for the delta note's "…last week"/"…last month" wording. */
  periodKind: StatisticsPeriod;
  currency: SupportedCurrency;
}

const TRENDING_UP_ICON: SymbolViewProps['name'] = {
  // Same glyph CATEGORY_META's `investment` entry uses — the nearest
  // SF Symbol / Material Symbol pair to lucide's `trending-up` (design
  // component `t2gNS`'s Chip icon), so this doesn't pull in a new icon
  // dependency (the app has no lucide package — expo-symbols is the
  // established mechanism, see expense-row.tsx's `SymbolView` usage).
  ios: 'chart.line.uptrend.xyaxis',
  android: 'trending_up',
  web: 'trending_up',
};

const TRENDING_DOWN_ICON: SymbolViewProps['name'] = {
  ios: 'chart.line.downtrend.xyaxis',
  android: 'trending_down',
  web: 'trending_down',
};

const DELTA_NOTE_KEY: Record<
  'up' | 'down',
  Record<StatisticsPeriod, TranslationKey>
> = {
  down: {
    week: 'statistics.delta.lessThanWeek',
    month: 'statistics.delta.lessThanMonth',
  },
  up: {
    week: 'statistics.delta.moreThanWeek',
    month: 'statistics.delta.moreThanMonth',
  },
};

/**
 * Design component `p5iJB`, "Summary Card": overline + total amount + delta
 * chip, then a per-Category breakdown (component `gezzC`, spec `ysVpf`).
 * Pure presentation over an already-fetched `PeriodStatistics` — the
 * period's own arithmetic (share, delta) is `lib/statistics.ts`'s pure
 * helpers, unit-tested there rather than through this component (mobile's
 * component-test policy, see mobile/CLAUDE.md).
 */
export function SummaryCard({
  period,
  periodKind,
  currency,
}: SummaryCardProps) {
  const theme = useTheme();
  const { t, locale } = useTranslation();

  // Hide-cases (zero current total, no baseline, no change) are
  // `computeStatisticsDelta`'s policy (lib/statistics.ts) — this only
  // renders whatever it returns.
  const delta = computeStatisticsDelta(period.total, period.previousTotal);
  const rows = nonzeroCategories(period.categories);

  const start = dateFromCalendarString(period.start);
  const end = dateFromCalendarString(period.end);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <ThemedText themeColor="textTertiary" style={styles.overline}>
        {t('statistics.overline.total')} ·{' '}
        {formatPeriodRange(start, end, locale)}
      </ThemedText>

      <ThemedText style={styles.amount}>
        {formatExpenseAmount(period.total, currency, locale)}
      </ThemedText>

      {delta ? (
        <View style={styles.deltaRow}>
          <View
            style={[
              styles.chip,
              {
                backgroundColor:
                  delta.direction === 'down'
                    ? theme.successSoft
                    : theme.dangerSoft,
              },
            ]}
          >
            <SymbolView
              name={
                delta.direction === 'down'
                  ? TRENDING_DOWN_ICON
                  : TRENDING_UP_ICON
              }
              size={13}
              tintColor={
                delta.direction === 'down' ? theme.success : theme.danger
              }
            />
            <ThemedText
              themeColor={delta.direction === 'down' ? 'success' : 'danger'}
              style={styles.chipLabel}
            >
              {formatPercent(delta.fraction, locale)}
            </ThemedText>
          </View>
          <ThemedText themeColor="textSecondary" style={styles.deltaNote}>
            {t(DELTA_NOTE_KEY[delta.direction][periodKind])}
          </ThemedText>
        </View>
      ) : null}

      {rows.length > 0 ? (
        <>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.breakdown}>
            {rows.map((row) => (
              <BreakdownRow
                key={row.category}
                category={row.category}
                total={row.total}
                share={categoryShare(row.total, period.total)}
                currency={currency}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

interface BreakdownRowProps {
  category: PeriodStatistics['categories'][number]['category'];
  total: string;
  share: number;
  currency: SupportedCurrency;
}

/** Design component `gezzC`, "Component — Breakdown Row" (spec `ysVpf`). */
function BreakdownRow({ category, total, share, currency }: BreakdownRowProps) {
  const theme = useTheme();
  const { t, locale } = useTranslation();
  const meta = CATEGORY_META[category];

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.rowLeft}>
          <View style={[styles.dot, { backgroundColor: theme[meta.color] }]} />
          <ThemedText style={styles.rowName}>{t(meta.labelKey)}</ThemedText>
          <ThemedText themeColor="textTertiary" style={styles.rowPct}>
            {formatPercent(share, locale)}
          </ThemedText>
        </View>
        <ThemedText style={styles.rowAmount}>
          {formatExpenseAmount(total, currency, locale)}
        </ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.surface3 }]}>
        <View
          style={[
            styles.bar,
            {
              backgroundColor: theme[meta.color],
              width: `${Math.min(share, 1) * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 14,
  },
  overline: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  amount: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 41,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radii.full,
    paddingTop: 4,
    paddingRight: 9,
    paddingBottom: 4,
    paddingLeft: 7,
  },
  chipLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  deltaNote: {
    fontSize: 11.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  breakdown: {
    gap: 11,
  },
  row: {
    gap: 7,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowPct: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  rowAmount: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  track: {
    height: 8,
    borderRadius: Radii.full,
    overflow: 'hidden',
  },
  bar: {
    height: 8,
    borderRadius: Radii.full,
  },
});
