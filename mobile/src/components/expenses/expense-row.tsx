import { SymbolView } from 'expo-symbols';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { VisibilityBadge } from '@/components/expenses/visibility-badge';
import { LikePill } from '@/components/like-pill';
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
  /**
   * Tap the Like pill → toggle (issue #14). Optional, and deliberately not
   * defaulted to a no-op: when absent, the Like pill doesn't render at all
   * rather than rendering inert — the owner's own Expenses tab (index.tsx)
   * passes no like props and stays pixel-identical to before this ticket,
   * since liking your own Expense isn't a feature this ticket adds there.
   * The friend drill-down (app/friend/[username].tsx) is the one caller
   * that passes this. Same memo-preserving "one stable parent callback"
   * rule as `onPress`.
   */
  onToggleLike?: (expense: ExpenseDto) => void;
}

/**
 * One row of the Expenses list (design component `lauIM`, "Component —
 * Expense Row"): category tile, description + visibility/date meta, and the
 * Converted Amount over the Original Amount. `memo`d because the list this
 * renders in can grow over a Personal Spending History — see the
 * vercel-react-native-skills list-performance rules this file follows:
 * `expense`, `now`, and `onPress` are stable references from the parent's
 * state rather than rebuilt per render; `onToggleLike` is the one prop this
 * file adds later than the rest (issue #14) and follows the same rule.
 *
 * The Like pill (undesigned for this row — the mock's Like pill only
 * appears on the Feed Card, `pfaWO`/`VI6RZ`) sits in the meta row, after the
 * date, rather than under the amounts column: the amounts column is
 * right-aligned and already exactly as wide as its two lines of digits, so
 * a pill there would either force it wider or wrap; the meta row is a
 * left-aligned flex row built to hold a growing set of small badges
 * (Visibility, date) and takes a third with no layout changes. Renders
 * `components/like-pill.tsx`'s `compact` size — see that file for the
 * liked/unliked anatomy shared with FeedCard's pill.
 */
export const ExpenseRow = memo(function ExpenseRow({
  expense,
  now,
  onPress,
  onToggleLike,
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
          {onToggleLike ? (
            <LikePill
              likeCount={expense.likeCount}
              likedByViewer={expense.likedByViewer}
              onPress={() => onToggleLike(expense)}
              compact
            />
          ) : null}
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
