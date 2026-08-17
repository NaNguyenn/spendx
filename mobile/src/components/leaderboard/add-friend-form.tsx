import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/form/primary-button';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n/translation-context';
import { getErrorMessage } from '@/lib/api-error-message';
import { isValidUsername, normalizeUsername } from '@/lib/validation';

interface AddFriendFormProps {
  /**
   * Sends the Friend Request; resolving clears and confirms the field,
   * throwing surfaces the rejection (404 unknown Username, 400 self, 409
   * already Friends/pending — backend/CONTEXT.md's Friend Request) via
   * `getErrorMessage`, same contract as ExpenseFormSheet's `onSubmit`.
   */
  onSend: (username: string) => Promise<void>;
}

/**
 * The exact-Username lookup (backend/CONTEXT.md's Username: "the only way
 * to look someone up ... no fuzzy search"): one field, one action, rather
 * than a results list this ticket has no search endpoint to back.
 */
export function AddFriendForm({ onSend }: AddFriendFormProps) {
  const { t } = useTranslation();

  const [username, setUsername] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Cleared as soon as the field changes again, so it can't linger next to
  // a since-edited, not-yet-sent Username.
  const [sent, setSent] = useState(false);

  const onChangeText = (value: string) => {
    setUsername(value);
    setFieldError(null);
    setSent(false);
  };

  const submit = async () => {
    setSent(false);
    const normalized = normalizeUsername(username);
    if (!isValidUsername(normalized)) {
      setFieldError(t('validation.username'));
      return;
    }

    setFieldError(null);
    setIsSubmitting(true);
    try {
      await onSend(normalized);
      setUsername('');
      setSent(true);
    } catch (error) {
      const result = getErrorMessage(error);
      setFieldError(result.kind === 'server' ? result.text : t(result.key));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <ThemedText style={styles.title}>
        {t('leaderboard.addFriend.title')}
      </ThemedText>
      <TextField
        label={t('leaderboard.addFriend.label')}
        value={username}
        onChangeText={onChangeText}
        placeholder={t('leaderboard.addFriend.placeholder')}
        autoCapitalize="none"
        autoCorrect={false}
        error={fieldError ?? undefined}
      />
      {sent ? (
        <ThemedText themeColor="success" style={styles.sent}>
          {t('leaderboard.addFriend.sent')}
        </ThemedText>
      ) : null}
      <PrimaryButton
        label={t('leaderboard.addFriend.submit')}
        onPress={submit}
        loading={isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.sp3,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  sent: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
