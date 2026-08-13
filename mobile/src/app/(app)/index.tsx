import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchExpenses, type ExpenseDto } from '@/api/expenses';
import { useSession } from '@/auth/session-context';
import { TAB_BAR_INSET } from '@/components/app-tabs';
import { CurrencyPill } from '@/components/currency-pill';
import { ExpenseRow } from '@/components/expenses/expense-row';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/form/primary-button';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; expenses: ExpenseDto[] };

const keyExtractor = (expense: ExpenseDto) => expense.id;

/**
 * The Expenses tab: the caller's own log, every Visibility, newest first
 * (mobile ticket #5). The Summary Card (total, delta chip, per-category
 * breakdown) in designs/spendx-mock.pen's Expenses frame is deliberately
 * not built here — that's ticket #7, personal statistics; this is the
 * screen header plus the list only.
 *
 * Refetches on focus rather than holding a shared "expenses changed"
 * context: dismissing the Log Expense sheet (app/log-expense.tsx) always
 * refocuses this tab, so `useFocusEffect` is sufficient for "the newly
 * logged expense appears" without wiring cross-screen state.
 */
export default function ExpensesScreen() {
  const { user, token } = useSession();
  const theme = useTheme();
  const { t } = useTranslation();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // Captured once per successful load, not `new Date()` per row render — see
  // ExpenseRow's `now` prop doc comment.
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    try {
      const expenses = await fetchExpenses(token);
      setNow(new Date());
      setState({ status: 'loaded', expenses });
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
        <>
          <ThemedText style={styles.sectionTitle}>
            {t('expenses.recent')}
          </ThemedText>
          <FlatList
            data={state.expenses}
            keyExtractor={keyExtractor}
            renderItem={({ item }) => <ExpenseRow expense={item} now={now} />}
            ItemSeparatorComponent={() => (
              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
              />
            )}
            style={[
              styles.list,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            contentContainerStyle={[
              state.expenses.length === 0 && styles.emptyContent,
              { paddingBottom: TAB_BAR_INSET },
            ]}
            ListEmptyComponent={
              <View style={styles.empty}>
                <ThemedText style={styles.emptyTitle}>
                  {t('expenses.empty.title')}
                </ThemedText>
                <ThemedText themeColor="textTertiary" style={styles.emptyNote}>
                  {t('expenses.empty.note')}
                </ThemedText>
              </View>
            }
          />
        </>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: Spacing.sp4,
    marginTop: Spacing.sp5,
    marginBottom: Spacing.sp2,
  },
  list: {
    flex: 1,
    marginHorizontal: Spacing.sp4,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    // Rounded corners only clip children on Android when the container also
    // clips its own overflow — same gotcha as the tab bar's focused pill
    // (app-tabs.tsx).
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
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
