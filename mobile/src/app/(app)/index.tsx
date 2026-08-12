import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session-context';
import {
  ProfileSection,
  type ProfileRowItem,
} from '@/components/profile/profile-section';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { localeDisplayName } from '@/lib/locale';

export default function ProfileScreen() {
  const { user, signOut } = useSession();
  const theme = useTheme();

  // Stack.Protected only mounts this route while signed in, but the type
  // stays nullable — guard defensively for the moment of sign-out itself.
  if (!user) return null;

  const preferencesRows: ProfileRowItem[] = [
    {
      key: 'currency',
      icon: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
      label: 'Preferred currency',
      value: user.preferredCurrency,
    },
    {
      key: 'language',
      icon: { ios: 'globe', android: 'globe', web: 'globe' },
      label: 'Language',
      value: localeDisplayName(user.locale),
    },
  ];

  const accountRows: ProfileRowItem[] = [
    {
      key: 'displayName',
      icon: { ios: 'person', android: 'person', web: 'person' },
      label: 'Display name',
      value: user.displayName,
    },
    {
      key: 'username',
      icon: { ios: 'at', android: 'alternate_email', web: 'alternate_email' },
      label: 'Username',
      value: `@${user.username}`,
    },
    {
      key: 'email',
      icon: { ios: 'envelope', android: 'mail', web: 'mail' },
      label: 'Email',
      value: user.email,
    },
  ];

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Profile</ThemedText>

        <View style={[styles.identityCard, { backgroundColor: theme.surface }]}>
          <ThemedText style={styles.displayName}>{user.displayName}</ThemedText>
          <ThemedText themeColor="textTertiary" style={styles.username}>
            @{user.username}
          </ThemedText>
        </View>

        <ProfileSection caption="Preferences" rows={preferencesRows} />
        <ProfileSection caption="Account" rows={accountRows} />

        <Pressable
          onPress={signOut}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.signOutButton,
            { backgroundColor: theme.dangerSoft },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="button" themeColor="danger">
            Sign out
          </ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.sp6,
    gap: Spacing.sp5,
  },
  identityCard: {
    borderRadius: Radii.lg,
    padding: Spacing.sp4,
    gap: Spacing.sp1,
  },
  displayName: {
    fontSize: 19,
    fontWeight: '700',
  },
  username: {
    fontSize: 13,
    fontWeight: '500',
  },
  signOutButton: {
    height: 50,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
