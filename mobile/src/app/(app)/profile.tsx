import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchBlockedUsers } from '@/api/blocks';
import { useSession } from '@/auth/session-context';
import { TAB_BAR_INSET } from '@/components/app-tabs';
import { FormError } from '@/components/auth/auth-screen';
import { CurrencyPickerSheet } from '@/components/currency-picker-sheet';
import { LocalePickerSheet } from '@/components/profile/locale-picker-sheet';
import {
  ProfileSection,
  type ProfileRowItem,
} from '@/components/profile/profile-section';
import { ThemedText } from '@/components/themed-text';
import type { SupportedCurrency } from '@/constants/currency';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';
import { currencySymbol } from '@/lib/format';
import { localeDisplayName, type SupportedLocale } from '@/lib/locale';

export default function ProfileScreen() {
  const { user, token, signOut, updateMe } = useSession();
  const theme = useTheme();
  const router = useRouter();
  const { locale: activeLocale, t } = useTranslation();

  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);
  const [currencyError, setCurrencyError] = useState<string | null>(null);

  const [isLocalePickerOpen, setIsLocalePickerOpen] = useState(false);
  const [isUpdatingLocale, setIsUpdatingLocale] = useState(false);
  const [localeError, setLocaleError] = useState<string | null>(null);

  // The SAFETY row's own count (design's `R4sJ3j`, "V" = "2") — fetched on
  // every focus, same as every other data-loading screen's `useFocusEffect`,
  // so it's current again the moment a Block/Unblock made elsewhere (Feed,
  // the friend drill-down, or Blocked Accounts itself) brings this tab back
  // into view. `null` until the first load resolves; the row shows "…"
  // rather than a wrong number in that gap.
  const [blockedCount, setBlockedCount] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      void (async () => {
        try {
          const blocked = await fetchBlockedUsers(token);
          setBlockedCount(blocked.length);
        } catch {
          // Silent — this is a secondary count, not the screen's own load;
          // a stale/missing number here isn't worth an error banner over
          // the rest of a working Profile tab. It corrects itself next focus.
        }
      })();
    }, [token]),
  );

  // Stack.Protected only mounts this route while signed in, but the type
  // stays nullable — guard defensively for the moment of sign-out itself.
  if (!user) return null;

  const onSelectCurrency = async (currency: SupportedCurrency) => {
    setIsCurrencyPickerOpen(false);
    if (currency === user.preferredCurrency) return;

    setCurrencyError(null);
    setIsUpdatingCurrency(true);
    try {
      // A pure read-path switch (ADR-0008): only the User row changes, and
      // every amount-showing screen refetches on focus — so once `user`
      // updates, no other client state needs touching.
      await updateMe({ preferredCurrency: currency });
    } catch (error) {
      // Same shape as onSelectLocale below: the row still shows the currency
      // the server actually has, and the error says why, not what.
      const result = getErrorMessage(error);
      setCurrencyError(result.kind === 'server' ? result.text : t(result.key));
    } finally {
      setIsUpdatingCurrency(false);
    }
  };

  const onSelectLocale = async (locale: SupportedLocale) => {
    setIsLocalePickerOpen(false);
    if (locale === user.locale) return;

    setLocaleError(null);
    setIsUpdatingLocale(true);
    try {
      await updateMe({ locale });
    } catch (error) {
      // Don't leave the row showing a Locale the server rejected — `user`
      // (and so the row's displayed value) never changed, since updateMe
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
      // Code + symbol ("VND ₫"), per the Profile mock's PREFERENCES row.
      value: `${user.preferredCurrency} ${currencySymbol(
        user.preferredCurrency,
        activeLocale,
      )}`,
      onPress: () => setIsCurrencyPickerOpen(true),
      disabled: isUpdatingCurrency,
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
    {
      key: 'emailVerification',
      icon: { ios: 'checkmark.seal', android: 'verified', web: 'verified' },
      label: t('profile.emailVerification'),
      value: user.emailVerified
        ? t('profile.verified')
        : t('profile.unverified'),
      // Verified is inert — nothing to do once confirmed (Email Verification
      // gates nothing, backend/CONTEXT.md's Email Verification). Unverified
      // opens the code-entry screen (app/verify-email.tsx, issue #20).
      onPress: user.emailVerified
        ? undefined
        : () => router.push('/verify-email'),
    },
  ];

  const safetyRows: ProfileRowItem[] = [
    {
      key: 'blockedAccounts',
      icon: { ios: 'nosign', android: 'block', web: 'block' },
      label: t('profile.blockedAccounts'),
      value: blockedCount === null ? '…' : String(blockedCount),
      onPress: () => router.push('/blocked-accounts'),
      tone: 'danger',
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
        <FormError message={currencyError} />
        <FormError message={localeError} />
        <ProfileSection caption={t('profile.account')} rows={accountRows} />
        <ProfileSection caption={t('profile.safety')} rows={safetyRows} />

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

      <CurrencyPickerSheet
        visible={isCurrencyPickerOpen}
        value={user.preferredCurrency}
        onSelect={onSelectCurrency}
        onClose={() => setIsCurrencyPickerOpen(false)}
      />
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
