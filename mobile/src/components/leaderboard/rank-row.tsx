import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { LeaderboardRowDto } from '@/api/leaderboard';
import { FriendAvatar } from '@/components/leaderboard/friend-avatar';
import { BreakdownRow } from '@/components/statistics/breakdown-row';
import { ThemedText } from '@/components/themed-text';
import { CATEGORY_META } from '@/constants/category';
import type { SupportedCurrency } from '@/constants/currency';
import { Radii } from '@/constants/theme';
import { VISIBILITY_META } from '@/constants/visibility';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { formatExpenseAmount } from '@/lib/amount-input';
import { mixBarSegments, rankBadgeStyle } from '@/lib/leaderboard';
import { categoryShare, nonzeroCategories } from '@/lib/statistics';

const CHEVRON_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.down',
  android: 'expand_more',
  web: 'expand_more',
};

// "View expenses" has no mock frame — the drill-down screen it opens
// (app/friend/[username].tsx) is itself an extrapolation past the design
// (mobile ticket #12's scope note). Reuses the exact chevron triple
// components/profile/profile-section.tsx's row-with-a-destination uses, for
// the same "this row goes somewhere else" affordance.
const VIEW_EXPENSES_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
};

interface RankRowProps {
  row: LeaderboardRowDto;
  /** The row's 1-based position — the server already sorts `rows` by total descending (ADR-0003), so this is just the array index + 1. */
  rank: number;
  currency: SupportedCurrency;
  isExpanded: boolean;
  /** Toggles this row's accordion open/closed — stable across rows, takes the Username so the parent can track "which one row" itself. */
  onToggleExpand: (username: string) => void;
  /** Friend rows only — the parent never calls this for `row.isViewer`. */
  onViewExpenses: (row: LeaderboardRowDto) => void;
}

/**
 * Design component `bHVHh`, "Component — Rank Row", expanded state `WuHB2`
 * (mobile ticket #12): rank badge, avatar, name/@username/Mix Bar, total,
 * and a chevron that opens an inline per-Category breakdown. Replaces the
 * Friends list's plain `FriendRow` entirely — see leaderboard.tsx's header
 * comment for why the ranking now owns that surface too.
 *
 * `memo`d and given only stable-from-parent callbacks (`onToggleExpand`,
 * `onViewExpenses` take the row/username rather than being built per-row) so
 * expanding one row doesn't re-render every other one — same discipline as
 * ExpenseRow/FriendRow.
 */
export const RankRow = memo(function RankRow({
  row,
  rank,
  currency,
  isExpanded,
  onToggleExpand,
  onViewExpenses,
}: RankRowProps) {
  const theme = useTheme();
  const { t, locale } = useTranslation();
  const badge = rankBadgeStyle(rank);
  const privacyMeta = VISIBILITY_META.private;

  const mixSegments = useMemo(
    () => mixBarSegments(row.categories, row.total),
    [row.categories, row.total],
  );
  const breakdownEntries = useMemo(
    () => nonzeroCategories(row.categories),
    [row.categories],
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: isExpanded ? theme.accent : theme.border,
          borderWidth: isExpanded ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Pressable
        onPress={() => onToggleExpand(row.user.username)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        style={styles.row}
      >
        {/* 26/12.5/800 — the design's own Rank badge size and numeral weight, not a shared token. */}
        <View style={[styles.badge, { backgroundColor: theme[badge.fill] }]}>
          <ThemedText
            style={[
              styles.badgeNumeral,
              { color: badge.numeralColor ?? theme.textSecondary },
            ]}
          >
            {rank}
          </ThemedText>
        </View>

        <FriendAvatar displayName={row.user.displayName} size={42} />

        <View style={styles.middle}>
          <ThemedText numberOfLines={1} style={styles.name}>
            {row.user.displayName}
            {row.isViewer ? ` ${t('leaderboard.rankRow.viewerMarker')}` : ''}
          </ThemedText>
          <ThemedText
            numberOfLines={1}
            themeColor="textTertiary"
            style={styles.username}
          >
            @{row.user.username}
          </ThemedText>
          {/* 5px-high Mix Bar — clipped so each flex segment's straight edge
              never bleeds past the track's rounded corners. */}
          <View style={[styles.mixTrack, { backgroundColor: theme.surface3 }]}>
            {mixSegments.map((segment) => (
              <View
                key={segment.category}
                style={{
                  flex: segment.fraction,
                  backgroundColor: theme[CATEGORY_META[segment.category].color],
                }}
              />
            ))}
          </View>
        </View>

        <View style={styles.total}>
          <ThemedText style={styles.amount}>
            {formatExpenseAmount(row.total, currency, locale)}
          </ThemedText>
          <ThemedText themeColor="textTertiary" style={styles.caption}>
            {t('leaderboard.rankRow.shareableCaption')}
          </ThemedText>
        </View>

        <SymbolView
          name={CHEVRON_ICON}
          size={18}
          tintColor={theme.textTertiary}
          style={isExpanded ? styles.chevronExpanded : undefined}
        />
      </Pressable>

      {isExpanded ? (
        <View style={styles.breakdown}>
          {breakdownEntries.map((entry) => (
            <BreakdownRow
              key={entry.category}
              category={entry.category}
              total={entry.total}
              share={categoryShare(entry.total, row.total)}
              currency={currency}
            />
          ))}

          <View
            style={[
              styles.privacyNote,
              { backgroundColor: theme[privacyMeta.soft] },
            ]}
          >
            <SymbolView
              name={privacyMeta.icon}
              size={14}
              tintColor={theme[privacyMeta.color]}
            />
            <ThemedText
              style={[styles.privacyText, { color: theme[privacyMeta.color] }]}
            >
              {t('leaderboard.rankRow.privacyNote')}
            </ThemedText>
          </View>

          {!row.isViewer ? (
            <Pressable
              onPress={() => onViewExpenses(row)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.viewExpenses,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText themeColor="accent" style={styles.viewExpensesLabel}>
                {t('leaderboard.rankRow.viewExpenses')}
              </ThemedText>
              <SymbolView
                name={VIEW_EXPENSES_ICON}
                size={14}
                tintColor={theme.accent}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11, // design's own Rank Row gap, not a spacing token
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 10,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNumeral: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  middle: {
    flex: 1,
    gap: 5,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
  },
  username: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  mixTrack: {
    flexDirection: 'row',
    height: 5,
    borderRadius: Radii.full,
    overflow: 'hidden',
  },
  total: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amount: {
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  caption: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  breakdown: {
    gap: 11,
    paddingRight: 14,
    paddingBottom: 14,
    paddingLeft: 14,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: Radii.md,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  privacyText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '400',
    lineHeight: 15.5,
  },
  viewExpenses: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  viewExpensesLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
  },
});
