import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchFeedPage, type FeedItemDto } from '@/api/feed';
import { useSession } from '@/auth/session-context';
import { TAB_BAR_INSET } from '@/components/app-tabs';
import { FeedCard } from '@/components/feed/feed-card';
import { PrimaryButton } from '@/components/form/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useLikeToggle } from '@/hooks/use-like-toggle';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';
import { appendFeedPage, resetFeedState, type FeedLoadState } from '@/lib/feed';
import { toggleLike } from '@/lib/likes';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | ({ status: 'loaded'; isLoadingMore: boolean } & FeedLoadState);

const keyExtractor = (item: FeedItemDto) => item.id;

/**
 * The Feed tab (mobile ticket #13): every Public Expense app-wide, newest
 * first by Logged At — including the viewer's own and their Friends' — with
 * cursor-paginated infinite scroll (backend/CONTEXT.md's Feed entry). No
 * client-side re-sorting: order is exactly whatever `GET /feed` returns.
 *
 * Loads on first focus only — deliberately NOT the Expenses tab's
 * refetch-on-every-focus (index.tsx). That refetch is lossless there (the
 * whole list arrives every time); here it would replace however many pages
 * the viewer has scrolled with page 1 while FlatList keeps the old scroll
 * offset — truncating the feed under them on every tab switch. Freshness is
 * pull-to-refresh's job instead. No in-flight-request cleanup on blur, since
 * a load finishing after this tab loses focus just sets state for a screen
 * that isn't visible — harmless, and cheaper than an AbortController for a
 * screen with no mutating action of its own to race against.
 *
 * DESIGN DECISION: the mock's Screen Header (`I4sUjf`) also carries a
 * `sliders-horizontal` icon button next to the title. Neither this issue nor
 * #1's spec describes a Feed filter, and no filter endpoint exists on
 * `GET /feed` (schema.d.ts) — a button that opens nothing would be worse
 * than no button, so it's left out entirely rather than stubbed inert. Flag
 * per mobile/CONTEXT.md's "say which one wins" rule.
 */
export default function FeedScreen() {
  const { user, token } = useSession();
  const theme = useTheme();
  const { t } = useTranslation();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Captured once per successful first-page load, not `new Date()` per card
  // render — see FeedCard's `now` prop doc comment.
  const [now, setNow] = useState(() => new Date());
  // Synchronous guard against a second `onEndReached` firing (e.g. two
  // frames scrolled past the threshold) while a "load more" is already in
  // flight — `state.isLoadingMore` alone isn't enough, since the state
  // update that flips it true hasn't necessarily committed yet when the
  // second call happens.
  const loadingMoreRef = useRef(false);
  // True once the first-focus load has been kicked off — a ref, not state,
  // because the focus callback must not re-run when it flips (a state dep
  // would recreate the callback and re-fire useFocusEffect).
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!token) return;
    // Only the first load (or an error retry) shows the full-screen spinner
    // — a pull-to-refresh reload while already showing a page keeps the list
    // up, same "don't flash away what's already on screen" rule
    // leaderboard.tsx's own `load` documents.
    setState((prev) =>
      prev.status === 'loaded' ? prev : { status: 'loading' },
    );
    try {
      const page = await fetchFeedPage(token, {});
      setNow(new Date());
      setState({
        status: 'loaded',
        isLoadingMore: false,
        ...resetFeedState(page),
      });
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
      // First focus only — see the component doc comment. Guarded on `token`
      // so a focus that lands before the session hydrates doesn't burn the
      // one load on `load`'s early return.
      if (token && !hasLoadedRef.current) {
        hasLoadedRef.current = true;
        load();
      }
    }, [token, load]),
  );

  // Pull-to-refresh: the same first-page fetch as `load`, wrapped only to
  // drive `RefreshControl`'s own spinner instead of the full-screen one.
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!token) return;
    if (state.status !== 'loaded') return;
    if (state.nextCursor === null) return;
    if (loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    setState((prev) =>
      prev.status === 'loaded' ? { ...prev, isLoadingMore: true } : prev,
    );
    try {
      const page = await fetchFeedPage(token, { cursor: state.nextCursor });
      setState((prev) =>
        prev.status === 'loaded'
          ? {
              status: 'loaded',
              isLoadingMore: false,
              ...appendFeedPage(prev, page),
            }
          : prev,
      );
    } catch {
      // A failed "load more" shouldn't blank the page already showing —
      // just stop the footer spinner. The next scroll past the threshold
      // (or a pull-to-refresh) retries; surfacing `status: 'error'` here
      // would wipe out everything already loaded over a page-2+ hiccup.
      setState((prev) =>
        prev.status === 'loaded' ? { ...prev, isLoadingMore: false } : prev,
      );
    } finally {
      loadingMoreRef.current = false;
    }
  }, [token, state]);

  // Optimistic Like toggle (issue #14) — the double-tap guard, the
  // pre-toggle branch, and the silent-revert-on-failure all live in
  // `useLikeToggle`; this screen only supplies how to apply one flip to its
  // own `{ items }` state shape.
  const applyLikeToggle = useCallback((expenseId: string) => {
    setState((prev) =>
      prev.status === 'loaded'
        ? { ...prev, items: toggleLike(prev.items, expenseId) }
        : prev,
    );
  }, []);
  const handleToggleLike = useLikeToggle(token, applyLikeToggle);

  if (!user || !token) return null;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          <ThemedText type="title">{t('tab.feed')}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            {t('feed.subtitle')}
          </ThemedText>
        </View>
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
          <PrimaryButton label={t('feed.retry')} onPress={load} />
        </View>
      ) : (
        <FlatList
          data={state.items}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => (
            <View style={styles.rowSpacing}>
              <FeedCard item={item} now={now} onToggleLike={handleToggleLike} />
            </View>
          )}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            state.items.length === 0 && styles.emptyContent,
            { paddingBottom: TAB_BAR_INSET },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.textTertiary}
              colors={[theme.accent]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            state.isLoadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={theme.textTertiary} />
                <ThemedText
                  themeColor="textTertiary"
                  style={styles.loadingMoreLabel}
                >
                  {t('feed.loadingMore')}
                </ThemedText>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View
              style={[
                styles.empty,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <ThemedText style={styles.emptyTitle}>
                {t('feed.empty.title')}
              </ThemedText>
              <ThemedText themeColor="textTertiary" style={styles.emptyNote}>
                {t('feed.empty.note')}
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.sp4,
    paddingTop: Spacing.sp4,
  },
  rowSpacing: {
    paddingBottom: Spacing.sp3,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sp2,
    paddingVertical: Spacing.sp3,
  },
  loadingMoreLabel: {
    fontSize: 12,
    fontWeight: '600',
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
