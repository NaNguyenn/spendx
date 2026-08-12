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

export default function SignUpScreen() {
  const { signUp } = useSession();
  const theme = useTheme();
  const router = useRouter();

  const [values, setValues] = useState<SignUpFormValues>(EMPTY_VALUES);
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');
  const [fieldErrors, setFieldErrors] = useState<SignUpFormErrors>({});
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
    const errors = validateSignUpForm(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

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
      const message = getErrorMessage(submitError);
      const target = classifySignUpError(message);
      if (target === 'email') {
        setFieldErrors((prev) => ({ ...prev, email: message }));
      } else if (target === 'username') {
        setFieldErrors((prev) => ({ ...prev, username: message }));
      } else {
        setFormError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Pick a @username — that is how friends find you. Everything you log starts Private."
    >
      <FieldGroup>
        <TextField
          label="Display name"
          value={values.displayName}
          onChangeText={setField('displayName')}
          autoCapitalize="words"
          textContentType="name"
          error={fieldErrors.displayName}
        />
        <TextField
          label="Username"
          value={values.username}
          onChangeText={setField('username')}
          autoCapitalize="none"
          autoCorrect={false}
          error={fieldErrors.username}
        />
        <TextField
          label="Email"
          value={values.email}
          onChangeText={setField('email')}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={fieldErrors.email}
        />
        <TextField
          label="Password"
          value={values.password}
          onChangeText={setField('password')}
          secureTextEntry
          autoComplete="password-new"
          textContentType="newPassword"
          error={fieldErrors.password}
        />
        <SelectField
          label="Preferred currency"
          value={currency}
          options={CURRENCY_OPTIONS}
          onChange={setCurrency}
        />
      </FieldGroup>

      <View
        style={[styles.privacyNote, { backgroundColor: theme.visPrivateSoft }]}
      >
        <ThemedText style={[styles.privacyText, { color: theme.visPrivate }]}>
          New expenses default to Private. You decide, per expense, what friends
          and the feed can see.
        </ThemedText>
      </View>

      <FormError message={formError} />

      <PrimaryButton
        label="Create account"
        onPress={onSubmit}
        loading={isSubmitting}
      />

      <OrDivider />

      <SecondaryButton
        label="Sign in instead"
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
