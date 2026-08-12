import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session-context';
import { TAB_BAR_INSET } from '@/components/app-tabs';
import { FormError } from '@/components/auth/auth-screen';
import { LocalePickerSheet } from '@/components/profile/locale-picker-sheet';
import {
  ProfileSection,
  type ProfileRowItem,
} from '@/components/profile/profile-section';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';
import { localeDisplayName, type SupportedLocale } from '@/lib/locale';

export default function ProfileScreen() {
  const { user, signOut, updateLocale } = useSession();
  const theme = useTheme();
  const { t } = useTranslation();

  const [isLocalePickerOpen, setIsLocalePickerOpen] = useState(false);
  const [isUpdatingLocale, setIsUpdatingLocale] = useState(false);
  const [localeError, setLocaleError] = useState<string | null>(null);

  // Stack.Protected only mounts this route while signed in, but the type
  // stays nullable — guard defensively for the moment of sign-out itself.
  if (!user) return null;

  const onSelectLocale = async (locale: SupportedLocale) => {
    setIsLocalePickerOpen(false);
    if (locale === user.locale) return;

    setLocaleError(null);
    setIsUpdatingLocale(true);
    try {
      await updateLocale(locale);
    } catch (error) {
      // Don't leave the row showing a Locale the server rejected — `user`
      // (and so the row's displayed value) never changed, since updateLocale
      // only calls setUser after a successful response.
      // `apiError.network` ("couldn't reach the server") is more actionable
      // than a locale-specific "couldn't update your language" would be — the
      // user just tapped Language, so what failed is already obvious; why it
      // failed is the part worth saying.
      const result = getErrorMessage(error);
      setLocaleError(result.kind === 'server' ? result.text : t(result.key));
    } finally {
      setIsUpdatingLocale(false);
    }
  };

  const preferencesRows: ProfileRowItem[] = [
    {
      key: 'currency',
      icon: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
      label: t('profile.preferredCurrency'),
      value: user.preferredCurrency,
    },
    {
      key: 'language',
      icon: { ios: 'globe', android: 'globe', web: 'globe' },
      label: t('profile.language'),
      value: localeDisplayName(user.locale),
      onPress: () => setIsLocalePickerOpen(true),
      disabled: isUpdatingLocale,
    },
  ];

  const accountRows: ProfileRowItem[] = [
    {
      key: 'displayName',
      icon: { ios: 'person', android: 'person', web: 'person' },
      label: t('profile.displayName'),
      value: user.displayName,
    },
    {
      key: 'username',
      icon: { ios: 'at', android: 'alternate_email', web: 'alternate_email' },
      label: t('profile.username'),
      value: `@${user.username}`,
    },
    {
      key: 'email',
      icon: { ios: 'envelope', android: 'mail', web: 'mail' },
      label: t('profile.email'),
      value: user.email,
    },
  ];

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_INSET },
        ]}
      >
        <ThemedText type="title">{t('tab.profile')}</ThemedText>

        <View style={[styles.identityCard, { backgroundColor: theme.surface }]}>
          <ThemedText style={styles.displayName}>{user.displayName}</ThemedText>
          <ThemedText themeColor="textTertiary" style={styles.username}>
            @{user.username}
          </ThemedText>
        </View>

        <ProfileSection
          caption={t('profile.preferences')}
          rows={preferencesRows}
        />
        <FormError message={localeError} />
        <ProfileSection caption={t('profile.account')} rows={accountRows} />

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
            {t('profile.signOut')}
          </ThemedText>
        </Pressable>
      </ScrollView>

      <LocalePickerSheet
        visible={isLocalePickerOpen}
        value={user.locale}
        onSelect={onSelectLocale}
        onClose={() => setIsLocalePickerOpen(false)}
      />
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
