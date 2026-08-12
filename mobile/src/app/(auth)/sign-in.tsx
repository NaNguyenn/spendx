import { useRouter } from 'expo-router';
import { useState } from 'react';

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
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';

export default function SignInScreen() {
  const { signIn } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
