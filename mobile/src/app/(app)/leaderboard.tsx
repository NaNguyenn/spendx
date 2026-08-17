import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  acceptFriendRequest,
  fetchFriendRequests,
  fetchFriends,
  removeFriendRequest,
  sendFriendRequest,
  unfriend,
  type FriendRequestsDto,
  type PublicUserDto,
} from '@/api/friends';
import { useSession } from '@/auth/session-context';
import { TAB_BAR_INSET } from '@/components/app-tabs';
import { PrimaryButton } from '@/components/form/primary-button';
import { AddFriendForm } from '@/components/leaderboard/add-friend-form';
import { FriendRequestRow } from '@/components/leaderboard/friend-request-row';
import { FriendRow } from '@/components/leaderboard/friend-row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; requests: FriendRequestsDto; friends: PublicUserDto[] };

const keyExtractor = (friend: PublicUserDto) => friend.username;

/**
 * The Leaderboard tab's Friends surface (mobile ticket #11): the
 * exact-Username add-friend lookup, pending Friend Requests in both
 * directions, and the Friends list. The Shareable-Spend ranking itself is
 * mobile ticket #12 — this screen only ever shows the social graph, never
 * an amount.
 *
 * Refetches on focus, same reasoning as the Expenses tab (index.tsx):
 * every mutation here happens inline on this screen (no sibling sheet to
 * return from), so those call `load()` directly instead of relying on a
 * focus event that wouldn't fire.
 */
export default function LeaderboardScreen() {
  const { token } = useSession();
  const theme = useTheme();
  const { t } = useTranslation();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // The row currently being acted on — a Friend Request id, or a Username
  // for unfriending — disables just that row's buttons rather than the
  // whole screen, and guards against a second tap racing the first.
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    // Only the first load (or an error retry) shows the full-screen spinner.
    // Refreshes after a mutation keep the loaded list on screen — flipping
    // to 'loading' would unmount the list header and lose AddFriendForm's
    // "sent" confirmation along with the acting row's busy spinner.
    setState((prev) =>
      prev.status === 'loaded' ? prev : { status: 'loading' },
    );
    try {
      const [requests, friends] = await Promise.all([
        fetchFriendRequests(token),
        fetchFriends(token),
      ]);
      setState({ status: 'loaded', requests, friends });
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

  const confirmUnfriend = useCallback(
    (friend: PublicUserDto) => {
      Alert.alert(
        t('leaderboard.friends.unfriendConfirmTitle'),
        t('leaderboard.friends.unfriendConfirmMessage', {
          name: friend.displayName,
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('leaderboard.friends.unfriendConfirm'),
            style: 'destructive',
            onPress: () => {
              if (!token) return;
              void runAction(friend.username, () =>
                unfriend(token, friend.username),
              );
            },
          },
        ],
      );
    },
    [token, runAction, t],
  );

  const listHeader = useMemo(() => {
    if (state.status !== 'loaded') return null;
    const { incoming, outgoing } = state.requests;

    return (
      <View style={styles.headerSection}>
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

        <ThemedText style={styles.sectionTitle}>
          {t('leaderboard.friends.overline', {
            count: String(state.friends.length),
          })}
        </ThemedText>
      </View>
    );
  }, [state, busyKey, actionError, onSend, onAccept, onRemoveRequest, t]);

  if (!token) return null;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <ThemedText type="title">{t('tab.leaderboard')}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {t('leaderboard.comingSoon')}
        </ThemedText>
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
          data={state.friends}
          keyExtractor={keyExtractor}
          renderItem={({ item, index }) => {
            const isFirst = index === 0;
            const isLast = index === state.friends.length - 1;
            return (
              <View
                style={[
                  styles.rowWrapper,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  isFirst && styles.rowWrapperFirst,
                  isLast && styles.rowWrapperLast,
                ]}
              >
                <FriendRow
                  friend={item}
                  busy={busyKey === item.username}
                  onUnfriend={confirmUnfriend}
                />
              </View>
            );
          }}
          ListHeaderComponent={listHeader}
          style={styles.list}
          contentContainerStyle={[
            state.friends.length === 0 && styles.emptyContent,
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
                {t('leaderboard.friends.empty.title')}
              </ThemedText>
              <ThemedText themeColor="textTertiary" style={styles.emptyNote}>
                {t('leaderboard.friends.empty.note')}
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
    gap: 2,
    paddingHorizontal: Spacing.sp4,
    paddingTop: Spacing.sp1,
    paddingBottom: Spacing.sp2,
  },
  subtitle: {
    fontSize: 12.5,
  },
  headerSection: {
    gap: Spacing.sp5,
    paddingHorizontal: Spacing.sp4,
    paddingBottom: Spacing.sp5,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  // Same bordered-row-box pattern as the Expenses tab (index.tsx) — see that
  // file's `rowWrapper` doc comment for why each row wraps itself instead of
  // one shared container.
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
