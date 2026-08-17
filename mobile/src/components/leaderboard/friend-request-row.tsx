import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { FriendRequestDto } from '@/api/friends';
import { FriendAvatar } from '@/components/leaderboard/friend-avatar';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { otherParty, type FriendRequestDirection } from '@/lib/friend-requests';

const DECLINE_ICON: SymbolViewProps['name'] = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
};

interface FriendRequestRowProps {
  request: FriendRequestDto;
  direction: FriendRequestDirection;
  /** True while this row's own action is in flight — disables both buttons so a second tap can't race the first. */
  busy: boolean;
  /** Present for incoming requests only — outgoing rows render no Accept button. */
  onAccept?: (id: string) => void;
  /** Decline (incoming) or cancel (outgoing) — the same endpoint either way, see api/friends.ts's removeFriendRequest. */
  onRemove: (id: string) => void;
}

/**
 * Design component `XKE4U`, "Component — Friend Request": avatar, name +
 * a direction-specific subline, Accept pill (incoming only), Decline/Cancel
 * circle. Which User this row names is the request's sender for an
 * incoming request, its recipient for an outgoing one — see
 * `lib/friend-requests.ts`'s `otherParty`.
 */
export const FriendRequestRow = memo(function FriendRequestRow({
  request,
  direction,
  busy,
  onAccept,
  onRemove,
}: FriendRequestRowProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const person = otherParty(request, direction);

  return (
    <View style={[styles.row, { backgroundColor: theme.accentSoft }]}>
      <FriendAvatar displayName={person.displayName} size={38} />

      <View style={styles.middle}>
        <ThemedText numberOfLines={1} style={styles.name}>
          {person.displayName}
        </ThemedText>
        <ThemedText
          numberOfLines={1}
          themeColor="textSecondary"
          style={styles.sub}
        >
          {t(
            direction === 'incoming'
              ? 'leaderboard.request.incomingSubtitle'
              : 'leaderboard.request.outgoingSubtitle',
            { username: person.username },
          )}
        </ThemedText>
      </View>

      {direction === 'incoming' ? (
        <Pressable
          onPress={() => onAccept?.(request.id)}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.acceptButton,
            { backgroundColor: theme.accent },
            (pressed || busy) && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={theme.onAccent} />
          ) : (
            <ThemedText
              type="button"
              themeColor="onAccent"
              style={styles.acceptLabel}
            >
              {t('leaderboard.request.accept')}
            </ThemedText>
          )}
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => onRemove(request.id)}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t(
          direction === 'incoming'
            ? 'leaderboard.request.decline'
            : 'leaderboard.request.cancel',
        )}
        style={({ pressed }) => [
          styles.declineButton,
          { backgroundColor: theme.surface },
          (pressed || busy) && styles.pressed,
        ]}
      >
        <SymbolView
          name={DECLINE_ICON}
          size={16}
          tintColor={theme.textSecondary}
        />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sp3,
    borderRadius: Radii.lg,
    padding: Spacing.sp3,
  },
  middle: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  sub: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  acceptButton: {
    borderRadius: Radii.full,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptLabel: {
    fontSize: 12.5,
  },
  declineButton: {
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
