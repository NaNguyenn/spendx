import { SymbolView } from 'expo-symbols';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { VisibilityBadge } from '@/components/expenses/visibility-badge';
import { ThemedText } from '@/components/themed-text';
import { CATEGORY_META } from '@/constants/category';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { formatExpenseAmount } from '@/lib/amount-input';
import { formatDateTime } from '@/lib/format';
import type { ExpenseDto } from '@/api/expenses';

interface ExpenseRowProps {
  expense: ExpenseDto;
  /**
   * "Now", for `formatDateTime`'s Today/other-day split — a single `Date`
   * captured once per list render (ExpensesScreen), not `new Date()` here.
   * A fresh Date object per row per render would be a new reference every
   * time, defeating `memo` below for every row on every parent re-render
   * (see the vercel-react-native-skills list-performance-inline-objects rule).
   */
  now: Date;
  /**
   * Tap → the edit sheet (ticket #6). Takes the expense so the parent can
   * pass one stable callback for every row instead of a fresh closure per
   * row per render — the same memo-preserving rule as `now` above.
   */
  onPress: (expense: ExpenseDto) => void;
}

/**
 * One row of the Expenses list (design component `lauIM`, "Component —
 * Expense Row"): category tile, description + visibility/date meta, and the
 * Converted Amount over the Original Amount. `memo`d because the list this
 * renders in can grow over a Personal Spending History — see the
 * vercel-react-native-skills list-performance rules this file follows:
 * `expense` and `now` are the only props, both stable references from the
 * parent's state rather than rebuilt per render.
 */
export const ExpenseRow = memo(function ExpenseRow({
  expense,
  now,
  onPress,
}: ExpenseRowProps) {
  const theme = useTheme();
  const { locale } = useTranslation();
  const categoryMeta = CATEGORY_META[expense.category];

  // The mock omits the Original Amount line entirely when it would just
  // repeat the Converted Amount (an expense already logged in the owner's
  // Preferred Currency) — see designs/spendx-mock.pen's "Grab về nhà" row,
  // whose `elex0` (Original) descendant is `enabled: false`.
  const showOriginal = expense.originalCurrency !== expense.convertedCurrency;

  return (
    <Pressable
      onPress={() => onPress(expense)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View
        style={[styles.tile, { backgroundColor: theme[categoryMeta.soft] }]}
      >
        <SymbolView
          name={categoryMeta.icon}
          size={19}
          tintColor={theme[categoryMeta.color]}
        />
      </View>

      <View style={styles.middle}>
        <ThemedText numberOfLines={1} style={styles.description}>
          {expense.description}
        </ThemedText>
        <View style={styles.meta}>
          <VisibilityBadge visibility={expense.visibility} />
          <ThemedText themeColor="textTertiary" style={styles.date}>
            {formatDateTime(new Date(expense.loggedAt), locale, now)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.amounts}>
        <ThemedText style={styles.converted}>
          {formatExpenseAmount(
            expense.convertedAmount,
            expense.convertedCurrency,
            locale,
          )}
        </ThemedText>
        {showOriginal ? (
          <ThemedText themeColor="textTertiary" style={styles.original}>
            {formatExpenseAmount(
              expense.originalAmount,
              expense.originalCurrency,
              locale,
            )}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sp3,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.6,
  },
  tile: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    gap: 5,
  },
  description: {
    fontSize: 14,
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  date: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  amounts: {
    alignItems: 'flex-end',
    gap: 3,
  },
  converted: {
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  original: {
    fontSize: 11.5,
    fontWeight: '500',
  },
});
