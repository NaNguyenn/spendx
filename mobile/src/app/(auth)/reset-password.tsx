import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import {
  requestPasswordReset,
  confirmPasswordReset,
} from '@/api/password-reset';
import {
  AuthScreen,
  FieldGroup,
  FormError,
} from '@/components/auth/auth-screen';
import { PrimaryButton } from '@/components/form/primary-button';
import { SecondaryButton } from '@/components/form/secondary-button';
import { TextField } from '@/components/form/text-field';
import { useCountdown } from '@/hooks/use-countdown';
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';
import {
  RESEND_COOLDOWN_SECONDS,
  isValidOneTimeCode,
} from '@/lib/one-time-code';
import { isValidPassword } from '@/lib/validation';

/**
 * The single code + new-password screen of Password Reset (issue #21),
 * pushed from forgot-password.tsx with the email it just requested a code
 * for. On success it lands back on sign-in with that email prefilled —
 * `dismissTo`, not `replace`, so the auth stack collapses to just sign-in
 * instead of leaving these two screens under it. No auto-sign-in: the
 * confirm endpoint issues no session, by design.
 *
 * The resend countdown starts full on mount (a code was requested seconds
 * ago on the previous screen) and is purely client-driven: the request
 * endpoint answers a cooldown-suppressed resend with the same 204 as a
 * fresh send, so there is no Retry-After to read — unlike verify-email.tsx,
 * whose signed-in endpoint can afford a real 429.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  // Starts full: forgot-password.tsx requested a code seconds ago.
  const [cooldown, setCooldown] = useCountdown(RESEND_COOLDOWN_SECONDS);

  // Only reachable in-flow with the email param; a bare deep link has no
  // email to reset, so restart the flow at its entry point.
  if (!email) {
    return <Redirect href="/forgot-password" />;
  }

  const onSubmit = async () => {
    setError(null);
    if (!isValidPassword(newPassword)) {
      setError(t('validation.password'));
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset({ email, code, newPassword });
      router.dismissTo({ pathname: '/sign-in', params: { email } });
    } catch (submitError) {
      // Unknown email, wrong, expired, superseded, and dead codes all answer
      // the same 400 — the banner shows the server's own generic message.
      const result = getErrorMessage(submitError);
      setError(result.kind === 'server' ? result.text : t(result.key));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResend = async () => {
    setResendError(null);
    setIsResending(true);
    try {
      await requestPasswordReset(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (requestError) {
      const result = getErrorMessage(requestError);
      setResendError(result.kind === 'server' ? result.text : t(result.key));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthScreen
      title={t('resetPassword.title')}
      subtitle={t('resetPassword.subtitle', { email })}
      onBack={() => router.back()}
    >
      <FieldGroup>
        <TextField
          label={t('resetPassword.codeLabel')}
          value={code}
          onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          maxLength={6}
        />
        <TextField
          label={t('resetPassword.newPasswordLabel')}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
      </FieldGroup>

      <FormError message={error} />

      <PrimaryButton
        label={t('resetPassword.submit')}
        onPress={onSubmit}
        loading={isSubmitting}
        disabled={!isValidOneTimeCode(code)}
      />

      <FormError message={resendError} />

      <SecondaryButton
        label={
          cooldown > 0
            ? t('resetPassword.resendCountdown', { seconds: String(cooldown) })
            : t('resetPassword.resend')
        }
        onPress={onResend}
        disabled={cooldown > 0 || isResending}
      />
    </AuthScreen>
  );
}
