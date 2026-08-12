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
import { getErrorMessage } from '@/lib/api-error-message';

export default function SignInScreen() {
  const { signIn } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Log your spending, compare only what you choose to share."
    >
      <FieldGroup>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
        />
      </FieldGroup>

      <FormError message={error} />

      <PrimaryButton
        label="Sign in"
        onPress={onSubmit}
        loading={isSubmitting}
      />

      <OrDivider />

      <SecondaryButton
        label="Create an account"
        onPress={() => router.push('/sign-up')}
      />
    </AuthScreen>
  );
}
