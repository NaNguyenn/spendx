import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useSession } from '@/auth/session-context';
import {
  AuthScreen,
  FieldGroup,
  FormError,
  OrDivider,
} from '@/components/auth/auth-screen';
import { PrimaryButton } from '@/components/form/primary-button';
import { SecondaryButton } from '@/components/form/secondary-button';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';

export default function SignInScreen() {
  const { signIn } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  // Set by reset-password.tsx's dismissTo after a completed Password Reset,
  // so signing in with the new password starts from the right email.
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // This screen stays mounted at the bottom of the auth stack while the
  // reset screens sit on top, so a completed reset delivers its email via
  // navigation params, not a fresh mount — the useState seed above only
  // covers the cold-start case. Adjusting state during render (rather than
  // in an effect) is React's own pattern for reacting to a prop change on a
  // mounted component.
  const [seenParamEmail, setSeenParamEmail] = useState(params.email);
  if (params.email !== seenParamEmail) {
    setSeenParamEmail(params.email);
    if (params.email) setEmail(params.email);
  }

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError(t('auth.signIn.missingFields'));
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (submitError) {
      const result = getErrorMessage(submitError);
      setError(result.kind === 'server' ? result.text : t(result.key));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title={t('auth.signIn.title')}
      subtitle={t('auth.signIn.subtitle')}
    >
      <FieldGroup>
        <TextField
          label={t('auth.signIn.emailLabel')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label={t('auth.signIn.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
        />
      </FieldGroup>

      <Pressable
        onPress={() => router.push('/forgot-password')}
        hitSlop={8}
        style={styles.forgotPassword}
      >
        <ThemedText themeColor="accent">
          {t('auth.signIn.forgotPassword')}
        </ThemedText>
      </Pressable>

      <FormError message={error} />

      <PrimaryButton
        label={t('auth.signIn.submit')}
        onPress={onSubmit}
        loading={isSubmitting}
      />

      <OrDivider />

      <SecondaryButton
        label={t('auth.signIn.createAccount')}
        onPress={() => router.push('/sign-up')}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: Spacing.sp2,
  },
});
