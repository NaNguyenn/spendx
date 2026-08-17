import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  acceptFriendRequest,
  fetchFriendRequests,
  removeFriendRequest,
  sendFriendRequest,
  type FriendRequestsDto,
} from '@/api/friends';
import {
  fetchLeaderboard,
  type LeaderboardDto,
  type LeaderboardRowDto,
} from '@/api/leaderboard';
import { useSession } from '@/auth/session-context';
import { TAB_BAR_INSET } from '@/components/app-tabs';
import { CurrencyPill } from '@/components/currency-pill';
import {
  PeriodToggle,
  type StatisticsPeriod,
} from '@/components/expenses/period-toggle';
import { PrimaryButton } from '@/components/form/primary-button';
import { AddFriendForm } from '@/components/leaderboard/add-friend-form';
import { FriendRequestRow } from '@/components/leaderboard/friend-request-row';
import { PeriodBrowser } from '@/components/leaderboard/period-browser';
import { RankRow } from '@/components/leaderboard/rank-row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';
import {
  browseNext,
  browsePrevious,
  CURRENT_PERIOD_BROWSE_STATE,
  friendCount,
  rankingOverlineKey,
  type PeriodBrowseState,
} from '@/lib/leaderboard';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'loaded';
      requests: FriendRequestsDto;
      leaderboard: LeaderboardDto;
    };

const keyExtractor = (row: LeaderboardRowDto) => row.user.username;

/**
 * The Leaderboard tab (mobile ticket #12): the exact-Username add-friend
 * lookup and pending Friend Requests (ticket #11, unchanged), a Period
 * Browser for browsing weeks/months, and the Shareable-Spend ranking.
 *
 * DESIGN DECISION: the plain Friends list ticket #11 shipped (`FriendRow`,
 * now deleted) is fully absorbed into the ranking below — every Friend
 * already has a Rank Row, so a second roster naming the same people would
 * be pure duplication. The Unfriend affordance that lived on that list
 * moves to the friend drill-down screen (app/friend/[username].tsx),
 * reachable from an expanded Rank Row's "View expenses" — flagged here as a
 * scope call this ticket made past its own written spec, not something the
 * design frame (`BNS3w` in designs/spendx-mock.pen) explicitly shows.
 *
 * `period` and `browse` (lib/leaderboard.ts's `PeriodBrowseState`) live
 * outside `LoadState`, same as the Expenses tab's own `period` — but unlike
 * that screen (both Periods come back in one `fetchStatistics` call), a
 * change to either one here *does* change the query
 * (`GET /leaderboard?period&anchor`), so `load`'s own dependency array
 * includes them: changing `period` or `browse.anchor` gives `load` a new
 * identity, which re-fires the focus effect below even while this tab stays
 * focused (see useFocusEffect's own dependency-change behavior).
 */
export default function LeaderboardScreen() {
  const { user, token } = useSession();
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [period, setPeriod] = useState<StatisticsPeriod>('week');
  const [browse, setBrowse] = useState<PeriodBrowseState>(
    CURRENT_PERIOD_BROWSE_STATE,
  );
  // One Rank Row open at a time — an accordion, not a checklist, per the
  // design's expanded state (`WuHB2`).
  const [expandedUsername, setExpandedUsername] = useState<string | null>(null);
  // The row currently being acted on — a Friend Request id — disables just
  // that row's buttons rather than the whole screen, and guards against a
  // second tap racing the first. Unfriend no longer happens on this screen
  // (see the header comment), so this is Friend Request ids only now.
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    // Only the first load (or an error retry) shows the full-screen spinner
    // — see index.tsx's `load` for the same reasoning applied there to a
    // mutation refresh; here it also covers a period/browse change so the
    // Period Toggle and Period Browser never flash away mid-browse.
    setState((prev) =>
      prev.status === 'loaded' ? prev : { status: 'loading' },
    );
    try {
      const [requests, leaderboard] = await Promise.all([
        fetchFriendRequests(token),
        fetchLeaderboard(token, { period, anchor: browse.anchor ?? undefined }),
      ]);
      setState({ status: 'loaded', requests, leaderboard });
    } catch (error) {
      const result = getErrorMessage(error);
      setState({
        status: 'error',
        message: result.kind === 'server' ? result.text : t(result.key),
      });
    }
  }, [token, period, browse.anchor, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const runAction = useCallback(
    async (id: string, action: () => Promise<void>) => {
      if (!token) return;
      setActionError(null);
      setBusyKey(id);
      try {
        await action();
        await load();
      } catch (error) {
        const result = getErrorMessage(error);
        setActionError(result.kind === 'server' ? result.text : t(result.key));
      } finally {
        setBusyKey(null);
      }
    },
    [token, load, t],
  );

  const onSend = useCallback(
    async (username: string) => {
      if (!token) return;
      await sendFriendRequest(token, { username });
      await load();
    },
    [token, load],
  );

  const onAccept = useCallback(
    (id: string) => {
      if (!token) return;
      void runAction(id, async () => {
        await acceptFriendRequest(token, id);
      });
    },
    [token, runAction],
  );

  const onRemoveRequest = useCallback(
    (id: string) => {
      if (!token) return;
      void runAction(id, () => removeFriendRequest(token, id));
    },
    [token, runAction],
  );

  const onChangePeriod = useCallback((next: StatisticsPeriod) => {
    setPeriod(next);
    // A new `period` starts back at the current one — browsing a past week
    // doesn't imply anything about which month to land on, and vice versa.
    setBrowse(CURRENT_PERIOD_BROWSE_STATE);
    setExpandedUsername(null);
  }, []);

  const onPressPrevious = useCallback(() => {
    if (state.status !== 'loaded') return;
    setBrowse((prev) => browsePrevious(prev, state.leaderboard.start));
    setExpandedUsername(null);
  }, [state]);

  const onPressNext = useCallback(() => {
    if (state.status !== 'loaded') return;
    setBrowse((prev) => browseNext(prev, state.leaderboard.end));
    setExpandedUsername(null);
  }, [state]);

  const onToggleExpand = useCallback((username: string) => {
    setExpandedUsername((prev) => (prev === username ? null : username));
  }, []);

  const onViewExpenses = useCallback(
    (row: LeaderboardRowDto) => {
      if (state.status !== 'loaded') return;
      router.push({
        pathname: '/friend/[username]',
        params: {
          username: row.user.username,
          displayName: row.user.displayName,
          start: state.leaderboard.start,
          end: state.leaderboard.end,
        },
      });
    },
    [state, router],
  );

  const listHeader = useMemo(() => {
    if (state.status !== 'loaded') return null;
    const { incoming, outgoing } = state.requests;
    const { start, end, rows } = state.leaderboard;
    const friends = friendCount(rows);

    return (
      <View style={styles.headerSection}>
        <PeriodToggle value={period} onChange={onChangePeriod} />
        <PeriodBrowser
          period={period}
          start={start}
          end={end}
          offset={browse.offset}
          onPrevious={onPressPrevious}
          onNext={onPressNext}
        />

        <AddFriendForm onSend={onSend} />

        {incoming.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="label" themeColor="textTertiary">
              {t('leaderboard.requests.incomingOverline', {
                count: String(incoming.length),
              })}
            </ThemedText>
            <View style={styles.requestList}>
              {incoming.map((request) => (
                <FriendRequestRow
                  key={request.id}
                  request={request}
                  direction="incoming"
                  busy={busyKey === request.id}
                  onAccept={onAccept}
                  onRemove={onRemoveRequest}
                />
              ))}
            </View>
          </View>
        ) : null}

        {outgoing.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="label" themeColor="textTertiary">
              {t('leaderboard.requests.outgoingOverline', {
                count: String(outgoing.length),
              })}
            </ThemedText>
            <View style={styles.requestList}>
              {outgoing.map((request) => (
                <FriendRequestRow
                  key={request.id}
                  request={request}
                  direction="outgoing"
                  busy={busyKey === request.id}
                  onRemove={onRemoveRequest}
                />
              ))}
            </View>
          </View>
        ) : null}

        {actionError ? (
          <ThemedText themeColor="danger" style={styles.actionError}>
            {actionError}
          </ThemedText>
        ) : null}

        <View style={styles.section}>
          <ThemedText type="label" themeColor="textTertiary">
            {t(rankingOverlineKey(period, browse.offset), {
              count: String(friends),
            })}
          </ThemedText>

          {/* The ranking still lists the viewer's own row below — this only
              covers the "0 Friends yet" case, same copy the old Friends
              list used for its own empty state. */}
          {friends === 0 ? (
            <View
              style={[
                styles.empty,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <ThemedText style={styles.emptyTitle}>
                {t('leaderboard.friends.empty.title')}
              </ThemedText>
              <ThemedText themeColor="textTertiary" style={styles.emptyNote}>
                {t('leaderboard.friends.empty.note')}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    );
  }, [
    state,
    period,
    browse.offset,
    busyKey,
    actionError,
    onSend,
    onAccept,
    onRemoveRequest,
    onChangePeriod,
    onPressPrevious,
    onPressNext,
    theme,
    t,
  ]);

  if (!user || !token) return null;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          <ThemedText type="title">{t('tab.leaderboard')}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            {t('leaderboard.subtitle')}
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
          <PrimaryButton label={t('leaderboard.retry')} onPress={load} />
        </View>
      ) : (
        <FlatList
          data={state.leaderboard.rows}
          keyExtractor={keyExtractor}
          renderItem={({ item, index }) => (
            <View style={styles.rowSpacing}>
              <RankRow
                row={item}
                rank={index + 1}
                currency={state.leaderboard.currency}
                isExpanded={expandedUsername === item.user.username}
                onToggleExpand={onToggleExpand}
                onViewExpenses={onViewExpenses}
              />
            </View>
          )}
          ListHeaderComponent={listHeader}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: TAB_BAR_INSET },
          ]}
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
  headerSection: {
    gap: Spacing.sp5,
    paddingHorizontal: Spacing.sp4,
    paddingTop: Spacing.sp4,
    paddingBottom: Spacing.sp2,
  },
  section: {
    gap: Spacing.sp2,
  },
  requestList: {
    gap: Spacing.sp2,
  },
  actionError: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.sp4,
  },
  // Rank Row cards carry their own surface/border (rank-row.tsx) — unlike
  // the Expenses/old Friends lists, there is no shared bordered box to wrap
  // rows in, just breathing room between one card and the next.
  rowSpacing: {
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
  empty: {
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: Spacing.sp6,
    alignItems: 'center',
    gap: Spacing.sp1,
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
