import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  confirmEmailVerification,
  requestVerificationEmail,
} from '@/api/email-verification';
import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-context';
import {
  AuthScreen,
  FieldGroup,
  FormError,
} from '@/components/auth/auth-screen';
import { PrimaryButton } from '@/components/form/primary-button';
import { SecondaryButton } from '@/components/form/secondary-button';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCountdown } from '@/hooks/use-countdown';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';
import { resendCooldownSeconds } from '@/lib/email-verification';
import {
  RESEND_COOLDOWN_SECONDS,
  isValidOneTimeCode,
} from '@/lib/one-time-code';

// Same seal used on Profile's Email verification row (app/(app)/profile.tsx)
// for the confirmed state below — see that row's own icon-choice comment.
const VERIFIED_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark.seal.fill',
  android: 'verified',
  web: 'verified',
};

/**
 * Profile's "Email verification" row (app/(app)/profile.tsx) opens this when
 * unverified — entering the 6-digit One-Time Code emailed at sign-up
 * (backend/CONTEXT.md's Email Verification, issue #20). Gates nothing; this
 * screen exists purely so the Profile row can flip to Verified.
 *
 * A root-Stack sibling of `(app)`, pushed rather than a tab slot — same
 * reasoning as blocked-accounts.tsx's own header comment — but built on the
 * Auth screens' chrome (AuthScreen/FieldGroup/FormError) rather than
 * blocked-accounts' list-screen anatomy, since this is a single form, not a
 * list. AuthScreen's optional `onBack` (added for this screen) draws the
 * same back pill blocked-accounts.tsx does, just inside that chrome instead
 * of a second hand-rolled header.
 *
 * No separate "success" boolean: once `confirmEmailVerification` (or a
 * resend that turns out to answer "already verified") is followed by
 * `refreshMe()`, `user.emailVerified` itself flips true and this re-renders
 * straight into the verified view — one less piece of state to keep in sync
 * with the session.
 */
export default function VerifyEmailScreen() {
  const { user, token, refreshMe } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const [code, setCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useCountdown(0);

  // Stack.Protected only mounts this route while signed in, but the type
  // stays nullable — guard defensively for the moment of sign-out itself.
  if (!user || !token) return null;

  const onConfirm = async () => {
    if (!isValidOneTimeCode(code)) return;

    setConfirmError(null);
    setIsConfirming(true);
    try {
      await confirmEmailVerification(code, token);
      // `user.emailVerified` flipping true is what switches this screen to
      // the verified view below — see this file's own header comment.
      await refreshMe();
    } catch (error) {
      // Wrong, expired, superseded, or dead all report the same 400 — the
      // server's own message is what the field-less error banner shows.
      const result = getErrorMessage(error);
      setConfirmError(result.kind === 'server' ? result.text : t(result.key));
    } finally {
      setIsConfirming(false);
    }
  };

  const onResend = async () => {
    setResendError(null);
    setIsResending(true);
    try {
      await requestVerificationEmail(token);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Already verified — e.g. confirmed from another session while this
        // screen sat open. Same outcome as a successful confirm, not an
        // error the code screen can act on.
        try {
          await refreshMe();
        } catch {
          // Refreshing failing here isn't worth surfacing over the resend
          // action itself already having told the server what it needed —
          // the row on Profile corrects itself next time it loads `user`.
        }
      } else if (error instanceof ApiError && error.status === 429) {
        // The countdown IS the feedback for a cooldown 429 — no banner.
        setCooldown(resendCooldownSeconds(error));
      } else {
        const result = getErrorMessage(error);
        setResendError(result.kind === 'server' ? result.text : t(result.key));
      }
    } finally {
      setIsResending(false);
    }
  };

  if (user.emailVerified) {
    return (
      <AuthScreen
        title={t('verifyEmail.title')}
        subtitle={t('verifyEmail.subtitle', { email: user.email })}
        onBack={() => router.back()}
      >
        <View style={styles.verified}>
          <SymbolView name={VERIFIED_ICON} size={40} tintColor={theme.accent} />
          <ThemedText type="subtitle">
            {t('verifyEmail.verifiedTitle')}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.verifiedNote}>
            {t('verifyEmail.verifiedNote')}
          </ThemedText>
        </View>
        <PrimaryButton label={t('common.done')} onPress={() => router.back()} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title={t('verifyEmail.title')}
      subtitle={t('verifyEmail.subtitle', { email: user.email })}
      onBack={() => router.back()}
    >
      <FieldGroup>
        <TextField
          label={t('verifyEmail.codeLabel')}
          value={code}
          onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          maxLength={6}
        />
      </FieldGroup>

      <FormError message={confirmError} />

      <PrimaryButton
        label={t('verifyEmail.confirm')}
        onPress={onConfirm}
        loading={isConfirming}
        disabled={!isValidOneTimeCode(code)}
      />

      <FormError message={resendError} />

      <SecondaryButton
        label={
          cooldown > 0
            ? t('verifyEmail.resendCountdown', { seconds: String(cooldown) })
            : t('verifyEmail.resend')
        }
        onPress={onResend}
        disabled={cooldown > 0 || isResending}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  verified: {
    alignItems: 'center',
    gap: Spacing.sp2,
    paddingVertical: Spacing.sp4,
  },
  verifiedNote: {
    textAlign: 'center',
  },
});
