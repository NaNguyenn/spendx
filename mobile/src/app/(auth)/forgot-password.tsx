import { useRouter } from 'expo-router';
import { useState } from 'react';

import { requestPasswordReset } from '@/api/password-reset';
import {
  AuthScreen,
  FieldGroup,
  FormError,
} from '@/components/auth/auth-screen';
import { PrimaryButton } from '@/components/form/primary-button';
import { TextField } from '@/components/form/text-field';
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';
import { isValidEmail, normalizeEmail } from '@/lib/validation';

/**
 * The email-entry half of Password Reset (backend/CONTEXT.md, issue #21),
 * pushed from sign-in's "Forgot password?" link. Submitting always moves on
 * to the code screen: the request endpoint answers 204 identically for
 * known, unknown, and cooldown-suppressed emails — deliberately, so this
 * screen couldn't branch on "does that email have an account" even if it
 * wanted to. The only failure it can show is not reaching the server at all.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!isValidEmail(email)) {
      setError(t('validation.email'));
      return;
    }

    const normalized = normalizeEmail(email);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(normalized);
      router.push({
        pathname: '/reset-password',
        params: { email: normalized },
      });
    } catch (submitError) {
      const result = getErrorMessage(submitError);
      setError(result.kind === 'server' ? result.text : t(result.key));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title={t('forgotPassword.title')}
      subtitle={t('forgotPassword.subtitle')}
      onBack={() => router.back()}
    >
      <FieldGroup>
        <TextField
          label={t('forgotPassword.emailLabel')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
      </FieldGroup>

      <FormError message={error} />

      <PrimaryButton
        label={t('forgotPassword.submit')}
        onPress={onSubmit}
        loading={isSubmitting}
      />
    </AuthScreen>
  );
}
