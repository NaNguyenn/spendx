import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';

const LIKED_ICON: SymbolViewProps['name'] = {
  ios: 'heart.fill',
  android: 'favorite',
  web: 'favorite',
};

const UNLIKED_ICON: SymbolViewProps['name'] = {
  ios: 'heart',
  android: 'favorite_border',
  web: 'favorite_border',
};

interface LikePillProps {
  likeCount: number;
  likedByViewer: boolean;
  onPress: () => void;
  /**
   * FeedCard's Actions-row sizing (icon 16, count 12.5, pill padding 7/12)
   * is the default. ExpenseRow's meta-row sizing — the pill sits after the
   * date rather than under the right-aligned amounts column, sized down to
   * fit — opts in with `compact` (icon 12, count 10.5, pill padding 3/7).
   */
  compact?: boolean;
}

/**
 * The Like pill (design component `VI6RZ`, part of the Feed Card Actions
 * row `r6xr9`): heart icon + like count, filled/danger when liked,
 * surface-2/outline when not. Shared by FeedCard (regular) and ExpenseRow's
 * friend-drill-down row (compact) — issue #14's two surfaces — so the
 * anatomy, the accessibility props, and the mock provenance below live once.
 *
 * The mock only draws the pill's liked state (danger/danger-soft, filled
 * heart). The unliked state isn't in the mock at all, so it's extrapolated
 * from the Actions row's own Report/Block circles right next to it —
 * surface-2 fill, text-3 (textTertiary) icon/count, outline heart — the same
 * "unselected" treatment the mock already uses for that row.
 */
export const LikePill = memo(function LikePill({
  likeCount,
  likedByViewer,
  onPress,
  compact = false,
}: LikePillProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: likedByViewer }}
      accessibilityLabel={t(likedByViewer ? 'like.unlike' : 'like.like')}
      style={({ pressed }) => [
        compact ? styles.pillCompact : styles.pill,
        {
          backgroundColor: likedByViewer ? theme.dangerSoft : theme.surface2,
        },
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={likedByViewer ? LIKED_ICON : UNLIKED_ICON}
        size={compact ? 12 : 16}
        tintColor={likedByViewer ? theme.danger : theme.textTertiary}
      />
      <ThemedText
        style={[
          compact ? styles.countCompact : styles.count,
          { color: likedByViewer ? theme.danger : theme.textTertiary },
        ]}
      >
        {likeCount}
      </ThemedText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radii.full,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  pillCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radii.full,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  pressed: {
    opacity: 0.6,
  },
  count: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  countCompact: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
