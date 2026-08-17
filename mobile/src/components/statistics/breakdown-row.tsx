import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CATEGORY_META, type Category } from '@/constants/category';
import type { SupportedCurrency } from '@/constants/currency';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { formatExpenseAmount } from '@/lib/amount-input';
import { formatPercent } from '@/lib/format';

export interface BreakdownRowProps {
  /** Every `CategoryTotalDto`-shaped row (Summary Card, Leaderboard Rank Row) shares this same value set. */
  category: Category;
  total: string;
  share: number;
  currency: SupportedCurrency;
}

/**
 * Design component `gezzC`, "Component — Breakdown Row" (spec `ysVpf`): a
 * Category dot + name + share, its amount, and a proportional bar. Lifted
 * out of the Summary Card (mobile ticket #7) so the Leaderboard's expanded
 * Rank Row (mobile ticket #12, components/leaderboard/rank-row.tsx) can
 * reuse the exact same row instead of a second near-duplicate.
 */
export function BreakdownRow({
  category,
  total,
  share,
  currency,
}: BreakdownRowProps) {
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
