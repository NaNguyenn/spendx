import { useRouter } from 'expo-router';
import { getLocales } from 'expo-localization';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-context';
import {
  AuthScreen,
  FieldGroup,
  FormError,
  OrDivider,
} from '@/components/auth/auth-screen';
import { PrimaryButton } from '@/components/form/primary-button';
import { SecondaryButton } from '@/components/form/secondary-button';
import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '@/constants/currency';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { classifySignUpError, getErrorMessage } from '@/lib/api-error-message';
import { resolveSignupLocale } from '@/lib/locale';
import {
  normalizeEmail,
  normalizeUsername,
  validateSignUpForm,
  type SignUpFormErrors,
  type SignUpFormValues,
} from '@/lib/validation';

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((code) => ({
  value: code,
  label: code,
}));

const EMPTY_VALUES: SignUpFormValues = {
  displayName: '',
  username: '',
  email: '',
  password: '',
};

/** Display-ready field errors — either a translated `validateSignUpForm` key or raw server text (see api-error-message.ts). */
type DisplayFieldErrors = Partial<Record<keyof SignUpFormValues, string>>;

export default function SignUpScreen() {
  const { signUp } = useSession();
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const [values, setValues] = useState<SignUpFormValues>(EMPTY_VALUES);
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');
  const [fieldErrors, setFieldErrors] = useState<DisplayFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detected once at mount, not user-editable — see mobile ticket #2's scope
  // note: no language switcher here, just a sane default sent at signup.
  const locale = useMemo(
    () => resolveSignupLocale(getLocales().map((entry) => entry.languageCode)),
    [],
  );

  const setField = (field: keyof SignUpFormValues) => (text: string) =>
    setValues((prev) => ({ ...prev, [field]: text }));

  const onSubmit = async () => {
    setFormError(null);
    const keyErrors: SignUpFormErrors = validateSignUpForm(values);
    if (Object.keys(keyErrors).length > 0) {
      setFieldErrors({
        displayName: keyErrors.displayName && t(keyErrors.displayName),
        username: keyErrors.username && t(keyErrors.username),
        email: keyErrors.email && t(keyErrors.email),
        password: keyErrors.password && t(keyErrors.password),
      });
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      await signUp({
        email: normalizeEmail(values.email),
        password: values.password,
        username: normalizeUsername(values.username),
        displayName: values.displayName.trim(),
        preferredCurrency: currency,
        locale,
      });
    } catch (submitError) {
      const result = getErrorMessage(submitError);
      if (result.kind === 'server') {
        const target = classifySignUpError(result.text);
        if (target === 'email') {
          setFieldErrors((prev) => ({ ...prev, email: result.text }));
        } else if (target === 'username') {
          setFieldErrors((prev) => ({ ...prev, username: result.text }));
        } else {
          setFormError(result.text);
        }
      } else {
        setFormError(t(result.key));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title={t('auth.signUp.title')}
      subtitle={t('auth.signUp.subtitle')}
    >
      <FieldGroup>
        <TextField
          label={t('auth.signUp.displayNameLabel')}
          value={values.displayName}
          onChangeText={setField('displayName')}
          autoCapitalize="words"
          textContentType="name"
          error={fieldErrors.displayName}
        />
        <TextField
          label={t('auth.signUp.usernameLabel')}
          value={values.username}
          onChangeText={setField('username')}
          autoCapitalize="none"
          autoCorrect={false}
          error={fieldErrors.username}
        />
        <TextField
          label={t('auth.signUp.emailLabel')}
          value={values.email}
          onChangeText={setField('email')}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={fieldErrors.email}
        />
        <TextField
          label={t('auth.signUp.passwordLabel')}
          value={values.password}
          onChangeText={setField('password')}
          secureTextEntry
          autoComplete="password-new"
          textContentType="newPassword"
          error={fieldErrors.password}
        />
        <SelectField
          label={t('auth.signUp.currencyLabel')}
          value={currency}
          options={CURRENCY_OPTIONS}
          onChange={setCurrency}
        />
      </FieldGroup>

      <View
        style={[styles.privacyNote, { backgroundColor: theme.visPrivateSoft }]}
      >
        <ThemedText style={[styles.privacyText, { color: theme.visPrivate }]}>
          {t('auth.signUp.privacyNote')}
        </ThemedText>
      </View>

      <FormError message={formError} />

      <PrimaryButton
        label={t('auth.signUp.submit')}
        onPress={onSubmit}
        loading={isSubmitting}
      />

      <OrDivider />

      <SecondaryButton
        label={t('auth.signUp.signInInstead')}
        onPress={() => router.replace('/sign-in')}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  privacyNote: {
    borderRadius: Radii.md,
    padding: Spacing.sp4,
  },
  privacyText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
});
