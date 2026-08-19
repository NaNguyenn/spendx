import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createBlock } from '@/api/blocks';
import { ApiError } from '@/api/client';
import type { ExpenseDto } from '@/api/expenses';
import { fetchFriendExpenses, unfriend } from '@/api/friends';
import { useSession } from '@/auth/session-context';
import { ExpenseRow } from '@/components/expenses/expense-row';
import { PrimaryButton } from '@/components/form/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useLikeToggle } from '@/hooks/use-like-toggle';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';
import { dateFromCalendarString } from '@/lib/expense-date';
import { formatPeriodRangeWithYear } from '@/lib/format';
import { toggleLike } from '@/lib/likes';

const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'chevron_left',
  web: 'chevron_left',
};

const UNFRIEND_ICON: SymbolViewProps['name'] = {
  ios: 'person.badge.minus',
  android: 'person_remove',
  web: 'person_remove',
};

// Same icon choice as feed-card.tsx's Block circle — see that file's own
// comment on the lucide `ban` → SF Symbols/Material mapping.
const BLOCK_ICON: SymbolViewProps['name'] = {
  ios: 'nosign',
  android: 'block',
  web: 'block',
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; expenses: ExpenseDto[] };

const keyExtractor = (expense: ExpenseDto) => expense.id;

/**
 * A Friend's Shareable Expenses for one Period — where the Leaderboard's
 * "View expenses" affordance (components/leaderboard/rank-row.tsx) leads.
 * Undesigned (mobile ticket #12's mock has no frame for this screen);
 * extrapolated from the Expenses tab's own list/empty/retry treatment,
 * reusing `ExpenseRow` and the same bordered-row-box list pattern.
 *
 * A root-Stack sibling of `(app)` inside the same `Stack.Protected` block —
 * see app/log-expense.tsx's header comment for why a pushed screen can't
 * live inside `(app)/` (every route there becomes a tab slot instead).
 *
 * `username`/`start`/`end` ride in as route params from the Rank Row that
 * was expanded (same "list already has what we need" reasoning as
 * app/edit-expense/[id].tsx) — no second Leaderboard fetch just to learn
 * the Period bounds this screen already needs. `displayName` rides along
 * too, purely so the header has a name to show before the Expenses fetch
 * resolves; it is never sent back to the API.
 *
 * The header's second circle is Block (issue #15, backend/CONTEXT.md's
 * Block) — undesigned here same as the rest of this screen; styled to match
 * Unfriend's own danger circle since both are destructive, header-level
 * actions on the same person. Unlike Unfriend (which keeps this screen open
 * so the now-friendless drill-down can still show what was Shareable), a
 * successful Block makes the account invisible outright — `GET
 * /users/{username}/expenses` would 404 on the next load — so this navigates
 * back immediately instead.
 */
export default function FriendExpensesScreen() {
  const { token } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const { t, locale } = useTranslation();
  const params = useLocalSearchParams<{
    username: string;
    start: string;
    end: string;
    displayName?: string;
  }>();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [now] = useState(() => new Date());
  const [unfriendBusy, setUnfriendBusy] = useState(false);
  const [unfriendError, setUnfriendError] = useState<string | null>(null);
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !params.username) return;
    setState({ status: 'loading' });
    try {
      const expenses = await fetchFriendExpenses(token, params.username, {
        start: params.start,
        end: params.end,
      });
      setState({ status: 'loaded', expenses });
    } catch (error) {
      // 403/404 get their own friendly copy — everything else falls through
      // to getErrorMessage's generic handling, same split as
      // lib/api-error-message.ts's daily-rate 503 special case.
      if (error instanceof ApiError && error.status === 403) {
        setState({ status: 'error', message: t('friendExpenses.notFriends') });
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        setState({ status: 'error', message: t('friendExpenses.notFound') });
        return;
      }
      const result = getErrorMessage(error);
      setState({
        status: 'error',
        message: result.kind === 'server' ? result.text : t(result.key),
      });
    }
  }, [token, params.username, params.start, params.end, t]);

  // `useFocusEffect` over a plain `useEffect` for the same reason every
  // other data-loading screen in this app uses it (index.tsx,
  // (app)/leaderboard.tsx): it's the established way to run a load on
  // mount without eslint's `react-hooks/set-state-in-effect` flagging a
  // `setState` reachable from a bare `useEffect` body. This screen is
  // pushed, not tab-focused, but `useFocusEffect` still fires once on
  // mount, which is all this needs.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const confirmUnfriend = useCallback(() => {
    if (!token || !params.username) return;
    const name = params.displayName ?? `@${params.username}`;
    Alert.alert(
      t('leaderboard.friends.unfriendConfirmTitle', { name }),
      t('leaderboard.friends.unfriendConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('leaderboard.friends.unfriendConfirm'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setUnfriendError(null);
              setUnfriendBusy(true);
              try {
                await unfriend(token, params.username);
                // The Leaderboard tab refetches on focus (its own
                // useFocusEffect), so it drops this Friend's row without
                // this screen having to push any state back itself.
                router.back();
              } catch (error) {
                const result = getErrorMessage(error);
                setUnfriendError(
                  result.kind === 'server' ? result.text : t(result.key),
                );
              } finally {
                setUnfriendBusy(false);
              }
            })();
          },
        },
      ],
    );
  }, [token, params.username, params.displayName, router, t]);

  const confirmBlock = useCallback(() => {
    if (!token || !params.username) return;
    const name = params.displayName ?? `@${params.username}`;
    Alert.alert(t('block.confirmTitle', { name }), t('block.confirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('block.confirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBlockError(null);
            setBlockBusy(true);
            try {
              await createBlock(token, { username: params.username });
              // Full mutual invisibility (backend/CONTEXT.md's Block) — the
              // account is gone from here on, so there is nothing left for
              // this screen to show; back out rather than reload.
              router.back();
            } catch (error) {
              const result = getErrorMessage(error);
              setBlockError(
                result.kind === 'server' ? result.text : t(result.key),
              );
            } finally {
              setBlockBusy(false);
            }
          })();
        },
      },
    ]);
  }, [token, params.username, params.displayName, router, t]);

  // Optimistic Like toggle (issue #14) — the double-tap guard, the
  // pre-toggle branch, and the silent-revert-on-failure (including the 404
  // case: the Expense went invisible mid-view, e.g. the owner changed its
  // Visibility or unfriended back) all live in `useLikeToggle`; this screen
  // only supplies how to apply one flip to its own `{ expenses }` state
  // shape.
  const applyLikeToggle = useCallback((expenseId: string) => {
    setState((prev) =>
      prev.status === 'loaded'
        ? { ...prev, expenses: toggleLike(prev.expenses, expenseId) }
        : prev,
    );
  }, []);
  const handleToggleLike = useLikeToggle(token, applyLikeToggle);

  if (!token || !params.username) return null;

  const periodLabel =
    params.start && params.end
      ? formatPeriodRangeWithYear(
          dateFromCalendarString(params.start),
          dateFromCalendarString(params.end),
          locale,
        )
      : null;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={[styles.backButton, { backgroundColor: theme.surface2 }]}
        >
          <SymbolView name={BACK_ICON} size={16} tintColor={theme.text} />
        </Pressable>

        <View style={styles.titles}>
          <ThemedText numberOfLines={1} style={styles.name}>
            {params.displayName ?? `@${params.username}`}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            {t('friendExpenses.subtitle')}
            {periodLabel ? ` · ${periodLabel}` : ''}
          </ThemedText>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={confirmUnfriend}
            disabled={unfriendBusy}
            accessibilityRole="button"
            accessibilityLabel={t('leaderboard.friends.unfriend')}
            style={[
              styles.unfriendButton,
              { backgroundColor: theme.dangerSoft },
              unfriendBusy && styles.pressed,
            ]}
          >
            <SymbolView
              name={UNFRIEND_ICON}
              size={16}
              tintColor={theme.danger}
            />
          </Pressable>
          <Pressable
            onPress={confirmBlock}
            disabled={blockBusy}
            accessibilityRole="button"
            accessibilityLabel={t('block.action')}
            style={[
              styles.unfriendButton,
              { backgroundColor: theme.dangerSoft },
              blockBusy && styles.pressed,
            ]}
          >
            <SymbolView name={BLOCK_ICON} size={16} tintColor={theme.danger} />
          </Pressable>
        </View>
      </View>

      {unfriendError ? (
        <ThemedText themeColor="danger" style={styles.unfriendError}>
          {unfriendError}
        </ThemedText>
      ) : null}
      {blockError ? (
        <ThemedText themeColor="danger" style={styles.unfriendError}>
          {blockError}
        </ThemedText>
      ) : null}

      {state.status === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : state.status === 'error' ? (
        <View style={[styles.centered, styles.errorState]}>
          <ThemedText themeColor="textSecondary" style={styles.errorText}>
            {state.message}
          </ThemedText>
          <PrimaryButton label={t('friendExpenses.retry')} onPress={load} />
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
                <ExpenseRow
                  expense={item}
                  now={now}
                  onPress={noop}
                  onToggleLike={handleToggleLike}
                />
              </View>
            );
          }}
          style={styles.list}
          contentContainerStyle={
            state.expenses.length === 0 ? styles.emptyContent : undefined
          }
          ListEmptyComponent={
            <View
              style={[
                styles.empty,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <ThemedText style={styles.emptyTitle}>
                {t('friendExpenses.empty.title')}
              </ThemedText>
              <ThemedText themeColor="textTertiary" style={styles.emptyNote}>
                {t('friendExpenses.empty.note')}
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ExpenseRow's `onPress` opens the owner's edit sheet (index.tsx) — there is
// no equivalent here, since a Friend's Expense isn't the viewer's to edit.
// A stable no-op (rather than `() => {}` inline) keeps ExpenseRow's `memo`
// meaningful across this screen's own re-renders.
function noop() {}

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
    paddingBottom: Spacing.sp2,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sp2,
  },
  unfriendButton: {
    width: 34,
    height: 34,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  unfriendError: {
    fontSize: 12.5,
    fontWeight: '600',
    paddingHorizontal: Spacing.sp4,
    paddingBottom: Spacing.sp2,
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
  list: {
    flex: 1,
  },
  rowWrapper: {
    marginHorizontal: Spacing.sp4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  rowWrapperFirst: {
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    overflow: 'hidden',
  },
  rowWrapperLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: Radii.lg,
    borderBottomRightRadius: Radii.lg,
    overflow: 'hidden',
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
