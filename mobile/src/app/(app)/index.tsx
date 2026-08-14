import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchExpenses,
  fetchStatistics,
  type ExpenseDto,
  type StatisticsDto,
} from '@/api/expenses';
import { useSession } from '@/auth/session-context';
import { TAB_BAR_INSET } from '@/components/app-tabs';
import { CurrencyPill } from '@/components/currency-pill';
import { ExpenseRow } from '@/components/expenses/expense-row';
import {
  PeriodToggle,
  type StatisticsPeriod,
} from '@/components/expenses/period-toggle';
import { SummaryCard } from '@/components/expenses/summary-card';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/form/primary-button';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; expenses: ExpenseDto[]; statistics: StatisticsDto };

const keyExtractor = (expense: ExpenseDto) => expense.id;

/**
 * The Expenses tab: the caller's own log, every Visibility, newest first
 * (mobile ticket #5), plus the Summary Card — this Period's total, delta vs
 * the previous Period, and a per-Category breakdown (mobile ticket #7).
 *
 * Refetches on focus rather than holding a shared "expenses changed"
 * context: dismissing the Log Expense sheet (app/log-expense.tsx) always
 * refocuses this tab, so `useFocusEffect` is sufficient for "the newly
 * logged expense appears, and the statistics reflect it" without wiring
 * cross-screen state.
 */
export default function ExpensesScreen() {
  const { user, token } = useSession();
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // Captured once per successful load, not `new Date()` per row render — see
  // ExpenseRow's `now` prop doc comment.
  const [now, setNow] = useState(() => new Date());
  // Which of the already-fetched `StatisticsDto.week` / `.month` the Summary
  // Card shows. Toggling never refetches — both periods come back in the one
  // `fetchStatistics` call — and this survives a focus-triggered `load()`
  // (it's separate state, not reset by it), so switching to "This month" and
  // then logging another expense doesn't silently flip back to "This week".
  const [period, setPeriod] = useState<StatisticsPeriod>('week');

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    try {
      const [expenses, statistics] = await Promise.all([
        fetchExpenses(token),
        fetchStatistics(token),
      ]);
      setNow(new Date());
      setState({ status: 'loaded', expenses, statistics });
    } catch (error) {
      const result = getErrorMessage(error);
      setState({
        status: 'error',
        message: result.kind === 'server' ? result.text : t(result.key),
      });
    }
  }, [token, t]);

  useFocusEffect(
    useCallback(() => {
      load();
      // No cleanup: an in-flight load finishing after the tab loses focus
      // just sets state for a screen that isn't visible, which is harmless
      // and cheaper than plumbing an AbortController through for a
      // personal, small-N list.
    }, [load]),
  );

  // One stable callback for every row (see ExpenseRow's `onPress` doc
  // comment). The row's fields ride along as params — the edit sheet
  // prefills from them instead of refetching (app/edit-expense/[id].tsx).
  const openEditSheet = useCallback(
    (expense: ExpenseDto) => {
      router.push({
        pathname: '/edit-expense/[id]',
        params: {
          id: expense.id,
          description: expense.description,
          originalAmount: expense.originalAmount,
          originalCurrency: expense.originalCurrency,
          category: expense.category,
          visibility: expense.visibility,
          expenseDate: expense.expenseDate,
        },
      });
    },
    [router],
  );

  // Period Toggle + Summary Card + the "Recent" section title, all above the
  // row list but *inside* the FlatList's own scroll (ListHeaderComponent) so
  // they scroll away with it rather than staying pinned like the screen
  // header above — designs/spendx-mock.pen's Expenses frame stacks them in
  // this order (Period Toggle → Summary Card → Section Row → Expense List).
  // They sit on the page background, not the row list's surface box — see
  // the `rowWrapper` styles below for where that box actually lives now.
  const listHeader = useMemo(() => {
    if (state.status !== 'loaded') return null;
    return (
      <View style={styles.summarySection}>
        <PeriodToggle value={period} onChange={setPeriod} />
        <SummaryCard
          period={state.statistics[period]}
          periodKind={period}
          currency={state.statistics.currency}
        />
        <ThemedText style={styles.sectionTitle}>
          {t('expenses.recent')}
        </ThemedText>
      </View>
    );
  }, [state, period, t]);

  if (!user) return null;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          <ThemedText type="title">{t('tab.expenses')}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            {t('expenses.subtitle')}
          </ThemedText>
        </View>
        <CurrencyPill currency={user.preferredCurrency} />
      </View>

      {state.status === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : state.status === 'error' ? (
        <View style={[styles.centered, styles.errorState]}>
          <ThemedText themeColor="textSecondary" style={styles.errorText}>
            {state.message}
          </ThemedText>
          <PrimaryButton label={t('expenses.retry')} onPress={load} />
        </View>
      ) : (
        <FlatList
          data={state.expenses}
          keyExtractor={keyExtractor}
          renderItem={({ item, index }) => {
            const isFirst = index === 0;
            const isLast = index === state.expenses.length - 1;
            return (
              <View
                style={[
                  styles.rowWrapper,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  isFirst && styles.rowWrapperFirst,
                  isLast && styles.rowWrapperLast,
                ]}
              >
                <ExpenseRow expense={item} now={now} onPress={openEditSheet} />
              </View>
            );
          }}
          ListHeaderComponent={listHeader}
          style={styles.list}
          contentContainerStyle={[
            state.expenses.length === 0 && styles.emptyContent,
            { paddingBottom: TAB_BAR_INSET },
          ]}
          ListEmptyComponent={
            <View
              style={[
                styles.empty,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <ThemedText style={styles.emptyTitle}>
                {t('expenses.empty.title')}
              </ThemedText>
              <ThemedText themeColor="textTertiary" style={styles.emptyNote}>
                {t('expenses.empty.note')}
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sp3,
    paddingHorizontal: Spacing.sp4,
    paddingTop: Spacing.sp1,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    fontSize: 12.5,
  },
  summarySection: {
    gap: Spacing.sp5,
    paddingHorizontal: Spacing.sp4,
    paddingTop: Spacing.sp4,
    // The gap to the row box below — the mock's "Content" frame uses a
    // uniform 18 between every top-level child (design source of truth,
    // mobile/CONTEXT.md); sp5 (20) is the closest spacing token.
    paddingBottom: Spacing.sp5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  // The design's Expense List box (`Q69fz6` in designs/spendx-mock.pen) is
  // scoped to the rows only — Period Toggle and Summary Card sit on the page
  // background above it (`p5iJB`'s parent is `Content`, not `Q69fz6`). A
  // single `FlatList` can't nest a bordered container around only *some* of
  // its items, so each row wraps itself: hairline top/left/right borders on
  // every row double as both the box's edges and the separator between rows,
  // and only the first/last row round their outer corners and (for the
  // last) add the bottom border — see `rowWrapperFirst`/`rowWrapperLast`.
  rowWrapper: {
    marginHorizontal: Spacing.sp4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  rowWrapperFirst: {
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    // Rounded corners only clip children on Android when the container also
    // clips its own overflow — same gotcha as the tab bar's focused pill
    // (app-tabs.tsx).
    overflow: 'hidden',
  },
  rowWrapperLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: Radii.lg,
    borderBottomRightRadius: Radii.lg,
    overflow: 'hidden',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sp4,
  },
  errorState: {
    paddingHorizontal: Spacing.sp6,
  },
  errorText: {
    textAlign: 'center',
  },
  empty: {
    marginHorizontal: Spacing.sp4,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: Spacing.sp6,
    alignItems: 'center',
    gap: Spacing.sp1,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyNote: {
    fontSize: 13,
    textAlign: 'center',
  },
});
