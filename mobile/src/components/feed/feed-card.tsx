import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { FeedItemDto } from '@/api/feed';
import { VisibilityBadge } from '@/components/expenses/visibility-badge';
import { FriendAvatar } from '@/components/leaderboard/friend-avatar';
import { LikePill } from '@/components/like-pill';
import { ThemedText } from '@/components/themed-text';
import { CATEGORY_META } from '@/constants/category';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { formatExpenseAmount } from '@/lib/amount-input';
import { formatRelativeTime } from '@/lib/format';

// Design's `ban` (lucide) — SF Symbols' closest built-in equivalent is the
// "no entry" circle-slash, `nosign`; Material's is `block`, already the
// vocabulary this app uses for the concept (constants aren't shared with
// profile.tsx's own copy since each is a single-use module-local constant,
// same as every other icon in this file's sibling components).
const BLOCK_ICON: SymbolViewProps['name'] = {
  ios: 'nosign',
  android: 'block',
  web: 'block',
};

interface FeedCardProps {
  item: FeedItemDto;
  /**
   * "Now", for the handle line's relative stamp (`formatRelativeTime`) — a
   * single `Date` captured once per screen load/refresh (feed.tsx), not
   * `new Date()` here. Same memo-preserving reasoning as ExpenseRow's own
   * `now` prop: a fresh Date every render would be a new reference every
   * time, defeating `memo` below for every card on every parent re-render.
   */
  now: Date;
  /**
   * Tap the Like pill → toggle. Takes the item so the parent can pass one
   * stable callback for every card instead of a fresh closure per card per
   * render — the same memo-preserving rule as `onPress` in
   * expense-row.tsx. The optimistic flip and the API call both live in
   * feed.tsx; this component only renders whatever `item.likedByViewer`/
   * `likeCount` currently say.
   */
  onToggleLike: (item: FeedItemDto) => void;
  /**
   * Tap the Block circle → the parent confirms and calls `POST /blocks`
   * (issue #15). Takes the item for the same "one stable callback, not a
   * closure per card" reason as `onToggleLike`; the confirmation dialog and
   * the API call both live in feed.tsx, not here.
   */
  onBlock: (item: FeedItemDto) => void;
}

/**
 * One card of the Feed (design component `pfaWO`, "Component — Feed Card"):
 * owner header (avatar, display name, "@handle · relative time",
 * Visibility badge), amount row (Converted Amount, Original Amount,
 * Category chip), description, then the Actions row. `memo`'d for the same
 * reason ExpenseRow is — an infinite-scroll list that only grows, never
 * shrinks.
 *
 * Two deliberate divergences from the mock (mobile/CONTEXT.md's "say which
 * one wins" rule):
 *  - The mock's Original line reads "$48.65 · rate 25.694"; the rate never
 *    crosses the wire (ADR-0008), so this shows the Original Amount only,
 *    and omits the line entirely when it would just repeat the Converted
 *    Amount (same currency both sides) — identical rule to expense-row.tsx.
 *  - The Actions row (`r6xr9`) ships with its Left/Like pill (`VI6RZ`) and
 *    Right/Block circle (`GiaGl`, issue #15). Report (`AnppS`) is issue #16,
 *    still left out entirely, not stubbed — so the Right group here holds
 *    only Block, not Report+Block side by side as the mock draws. The
 *    Attachment image slot is issue #10, same left-out treatment.
 *  - The Like pill itself (`VI6RZ`, including its unliked-state
 *    extrapolation) is `components/like-pill.tsx` — see that file's doc
 *    comment.
 */
export const FeedCard = memo(function FeedCard({
  item,
  now,
  onToggleLike,
  onBlock,
}: FeedCardProps) {
  const theme = useTheme();
  const { t, locale } = useTranslation();
  const categoryMeta = CATEGORY_META[item.category];

  const showOriginal = item.originalCurrency !== item.convertedCurrency;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.header}>
        <FriendAvatar displayName={item.owner.displayName} size={36} />
        <View style={styles.who}>
          <ThemedText numberOfLines={1} style={styles.displayName}>
            {item.owner.displayName}
          </ThemedText>
          <ThemedText
            numberOfLines={1}
            themeColor="textTertiary"
            style={styles.handle}
          >
            {`@${item.owner.username} · ${formatRelativeTime(new Date(item.loggedAt), locale, now)}`}
          </ThemedText>
        </View>
        <VisibilityBadge visibility={item.visibility} />
      </View>

      <View style={styles.amountRow}>
        <View style={styles.amounts}>
          <ThemedText numberOfLines={1} style={styles.converted}>
            {formatExpenseAmount(
              item.convertedAmount,
              item.convertedCurrency,
              locale,
            )}
          </ThemedText>
          {showOriginal ? (
            <ThemedText
              numberOfLines={1}
              themeColor="textTertiary"
              style={styles.original}
            >
              {formatExpenseAmount(
                item.originalAmount,
                item.originalCurrency,
                locale,
              )}
            </ThemedText>
          ) : null}
        </View>
        <View
          style={[
            styles.categoryChip,
            { backgroundColor: theme[categoryMeta.soft] },
          ]}
        >
          <SymbolView
            name={categoryMeta.icon}
            size={14}
            tintColor={theme[categoryMeta.color]}
          />
          {/*
            numberOfLines keeps the label on the pill's single line: Android
            measures this bold text a fraction narrower than it paints, so
            without it a two-word label ("Giải trí", "Đầu tư") wraps and the
            second word lands outside the pill, invisible.
          */}
          <ThemedText
            numberOfLines={1}
            style={[styles.categoryLabel, { color: theme[categoryMeta.color] }]}
          >
            {t(categoryMeta.labelKey)}
          </ThemedText>
        </View>
      </View>

      <ThemedText themeColor="textSecondary" style={styles.description}>
        {item.description}
      </ThemedText>

      <View style={styles.actions}>
        <LikePill
          likeCount={item.likeCount}
          likedByViewer={item.likedByViewer}
          onPress={() => onToggleLike(item)}
        />
        <Pressable
          onPress={() => onBlock(item)}
          accessibilityRole="button"
          accessibilityLabel={t('block.action')}
          style={({ pressed }) => [
            styles.blockButton,
            { backgroundColor: theme.surface2 },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={BLOCK_ICON}
            size={15}
            tintColor={theme.textTertiary}
          />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  who: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  handle: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amounts: {
    flex: 1,
    gap: 2,
  },
  converted: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  original: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radii.full,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  categoryLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  description: {
    fontSize: 13.5,
    lineHeight: 19.6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
