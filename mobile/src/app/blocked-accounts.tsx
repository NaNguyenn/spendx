import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchBlockedUsers,
  removeBlock,
  type PublicUserDto,
} from '@/api/blocks';
import { useSession } from '@/auth/session-context';
import { BackPill } from '@/components/back-pill';
import { FriendAvatar } from '@/components/leaderboard/friend-avatar';
import { PrimaryButton } from '@/components/form/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';

// Same icon choice as feed-card.tsx's Block circle — see that file's own
// comment on the lucide `ban` → SF Symbols/Material mapping.
const BAN_ICON: SymbolViewProps['name'] = {
  ios: 'nosign',
  android: 'block',
  web: 'block',
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; users: PublicUserDto[] };

const keyExtractor = (user: PublicUserDto) => user.id;

/**
 * The Blocked Accounts screen (design frames `jIh67`/`GU8Ki`, issue #15):
 * Profile's "Blocked accounts" row (app/(app)/profile.tsx) opens this —
 * everyone the caller has Blocked (backend/CONTEXT.md's Block), from
 * `GET /blocks`, newest first. A root-Stack sibling of `(app)`, pushed
 * rather than a tab slot — same reasoning as log-expense.tsx and
 * friend/[username].tsx's own header comments.
 *
 * Two deliberate divergences from the mock (mobile/CONTEXT.md's "say which
 * one wins" rule):
 *  - Each row's "Meta" line there reads "@handle · Blocked 2 Aug", but
 *    `GET /blocks` answers `PublicUserDto[]` — username + displayName only,
 *    no block timestamp (unlike the single-Block `BlockDto` `POST /blocks`
 *    itself returns, which does have `createdAt`). The API wins: this shows
 *    "@handle" alone rather than inventing a date the list endpoint never
 *    sends.
 *  - The mock draws the list as one clipped card with no visible dividers
 *    between rows; this instead reuses the friend drill-down screen's own
 *    individually-bordered-row convention (app/friend/[username].tsx) for
 *    consistency with the rest of the app rather than introducing a second
 *    list-card pattern for one screen.
 *
 * The mock's Report-vs-Block footer note (`V3dmio`) is deliberately left out:
 * its copy ("Reports go to moderation") describes the Report feature, which
 * is issue #16 and doesn't exist yet — it returns with that issue, when the
 * design wins again. The info banner (`b41C8`) is Block-only copy and ships.
 *
 * Unblock is immediate, not confirmed: the mock's Unblock pill has no dialog
 * frame anywhere in the file (unlike Block, which is destructive — severs a
 * Friendship and needs `POST /blocks` freshly re-sent to undo, hence
 * feed-card.tsx/friend/[username].tsx's confirm step). Unblock only restores
 * visibility, so this ships as a per-row busy guard instead of an Alert, per
 * that same "follow the design" rule.
 */
export default function BlockedAccountsScreen() {
  const { token } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [busyUsername, setBusyUsername] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setState((prev) =>
      prev.status === 'loaded' ? prev : { status: 'loading' },
    );
    try {
      const users = await fetchBlockedUsers(token);
      setState({ status: 'loaded', users });
    } catch (error) {
      const result = getErrorMessage(error);
      setState({
        status: 'error',
        message: result.kind === 'server' ? result.text : t(result.key),
      });
    }
  }, [token, t]);

  // Same `useFocusEffect`-fires-once-on-mount usage as every other
  // data-loading screen in this app (index.tsx, leaderboard.tsx,
  // friend/[username].tsx) — see those files' own comments on why.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onUnblock = useCallback(
    (user: PublicUserDto) => {
      if (!token) return;
      setActionError(null);
      setBusyUsername(user.username);
      void (async () => {
        try {
          await removeBlock(token, user.username);
          // No refetch — this caller's own list is exactly one row shorter,
          // and nothing else on screen depends on the removed row.
          setState((prev) =>
            prev.status === 'loaded'
              ? {
                  ...prev,
                  users: prev.users.filter(
                    (entry) => entry.username !== user.username,
                  ),
                }
              : prev,
          );
        } catch (error) {
          const result = getErrorMessage(error);
          setActionError(
            result.kind === 'server' ? result.text : t(result.key),
          );
        } finally {
          setBusyUsername(null);
        }
      })();
    },
    [token, t],
  );

  if (!token) return null;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <BackPill onPress={() => router.back()} />
        <View style={styles.titles}>
          <ThemedText numberOfLines={1} style={styles.title}>
            {t('blockedAccounts.title')}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            {state.status === 'loaded'
              ? t('blockedAccounts.count', {
                  count: String(state.users.length),
                })
              : ' '}
          </ThemedText>
        </View>
      </View>

      {actionError ? (
        <ThemedText themeColor="danger" style={styles.actionError}>
          {actionError}
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
          <PrimaryButton label={t('blockedAccounts.retry')} onPress={load} />
        </View>
      ) : (
        <FlatList
          data={state.users}
          keyExtractor={keyExtractor}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            state.users.length === 0 && styles.emptyContent,
          ]}
          ListHeaderComponent={
            <View
              style={[styles.infoBanner, { backgroundColor: theme.dangerSoft }]}
            >
              <SymbolView name={BAN_ICON} size={17} tintColor={theme.danger} />
              <ThemedText themeColor="danger" style={styles.infoText}>
                {t('blockedAccounts.info')}
              </ThemedText>
            </View>
          }
          renderItem={({ item, index }) => {
            const isFirst = index === 0;
            const isLast = index === state.users.length - 1;
            const busy = busyUsername === item.username;
            return (
              <View
                style={[
                  styles.row,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  isFirst && styles.rowFirst,
                  isLast && styles.rowLast,
                ]}
              >
                <FriendAvatar displayName={item.displayName} size={40} />
                <View style={styles.who}>
                  <ThemedText numberOfLines={1} style={styles.name}>
                    {item.displayName}
                  </ThemedText>
                  <ThemedText
                    numberOfLines={1}
                    themeColor="textTertiary"
                    style={styles.handle}
                  >
                    {`@${item.username}`}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => onUnblock(item)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t('blockedAccounts.unblock')}
                  style={[
                    styles.unblockButton,
                    {
                      backgroundColor: theme.surface2,
                      borderColor: theme.borderStrong,
                    },
                    busy && styles.pressed,
                  ]}
                >
                  <ThemedText style={styles.unblockLabel}>
                    {t('blockedAccounts.unblock')}
                  </ThemedText>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <View
              style={[
                styles.empty,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <ThemedText style={styles.emptyTitle}>
                {t('blockedAccounts.empty.title')}
              </ThemedText>
              <ThemedText themeColor="textTertiary" style={styles.emptyNote}>
                {t('blockedAccounts.empty.note')}
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
    paddingBottom: Spacing.sp2,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12.5,
  },
  actionError: {
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
  listContent: {
    paddingHorizontal: Spacing.sp4,
    paddingBottom: Spacing.sp6,
    gap: Spacing.sp4,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radii.md,
    padding: Spacing.sp3,
    marginBottom: Spacing.sp3,
  },
  infoText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sp3,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  rowFirst: {
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
  },
  rowLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: Radii.lg,
    borderBottomRightRadius: Radii.lg,
  },
  who: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
  },
  handle: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  unblockButton: {
    borderRadius: Radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  unblockLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
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
