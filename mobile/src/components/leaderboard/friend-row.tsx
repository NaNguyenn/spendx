import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { PublicUserDto } from '@/api/friends';
import { FriendAvatar } from '@/components/leaderboard/friend-avatar';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';

const UNFRIEND_ICON: SymbolViewProps['name'] = {
  ios: 'person.badge.minus',
  android: 'person_remove',
  web: 'person_remove',
};

interface FriendRowProps {
  friend: PublicUserDto;
  /** True while this row's Unfriend is in flight — see leaderboard.tsx's confirmUnfriend. */
  busy: boolean;
  onUnfriend: (friend: PublicUserDto) => void;
}

/** One row of the Friends list: avatar, display name + @username, Unfriend. The caller confirms before calling `onUnfriend` — see leaderboard.tsx. */
export const FriendRow = memo(function FriendRow({
  friend,
  busy,
  onUnfriend,
}: FriendRowProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <FriendAvatar displayName={friend.displayName} size={38} />
      <View style={styles.middle}>
        <ThemedText numberOfLines={1} style={styles.name}>
          {friend.displayName}
        </ThemedText>
        <ThemedText
          numberOfLines={1}
          themeColor="textTertiary"
          style={styles.username}
        >
          @{friend.username}
        </ThemedText>
      </View>
      <Pressable
        onPress={() => onUnfriend(friend)}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t('leaderboard.friends.unfriend')}
        style={({ pressed }) => [
          styles.unfriendButton,
          { backgroundColor: theme.dangerSoft },
          (pressed || busy) && styles.pressed,
        ]}
      >
        <SymbolView name={UNFRIEND_ICON} size={16} tintColor={theme.danger} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sp3,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  middle: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  username: {
    fontSize: 12,
    fontWeight: '500',
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
});
