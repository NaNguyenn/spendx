import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { initials } from '@/lib/initials';

interface FriendAvatarProps {
  displayName: string;
  /** 44 in the design's Leaderboard rows (mobile ticket #12), 38 in Friend Request rows — this ticket's only caller. */
  size?: number;
}

/** Design component `j5xqGq`, "Component — Avatar": initials on accent-soft. */
export function FriendAvatar({ displayName, size = 38 }: FriendAvatarProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: Radii.full,
          backgroundColor: theme.accentSoft,
        },
      ]}
    >
      <ThemedText
        themeColor="accent"
        style={[styles.initials, { fontSize: size * 0.32 }]}
      >
        {initials(displayName)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
});
