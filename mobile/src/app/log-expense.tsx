import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createExpense, type CreateExpenseInput } from '@/api/expenses';
import { useSession } from '@/auth/session-context';
import { FormError } from '@/components/auth/auth-screen';
import { AmountField } from '@/components/log-expense/amount-field';
import { CategorySelector } from '@/components/log-expense/category-selector';
import { ExpenseDateField } from '@/components/log-expense/expense-date-field';
import { VisibilitySelector } from '@/components/log-expense/visibility-selector';
import { PrimaryButton } from '@/components/form/primary-button';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import type { Category } from '@/constants/category';
import { Radii, Spacing } from '@/constants/theme';
import type { Visibility } from '@/constants/visibility';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';
import { parseAmountInput } from '@/lib/amount-input';
import { getErrorMessage } from '@/lib/api-error-message';
import { calendarDateString } from '@/lib/expense-date';
import {
  validateExpenseForm,
  type ExpenseFormErrors,
} from '@/lib/expense-form';

const CLOSE_ICON: SymbolViewProps['name'] = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
};

// Neutral, not implying anything about how the user spends — "other" is the
// one Category that never nudges a guess the way defaulting to, say, "food"
// would. Visibility defaults to "private" per the account-level promise
// auth/sign-up makes at signup ("Everything you log starts Private").
const DEFAULT_CATEGORY: Category = 'other';
const DEFAULT_VISIBILITY: Visibility = 'private';

/**
 * The Log Button's destination (mobile ticket #5). A root-stack route, not a
 * screen inside `(app)/` — the tab bar is `expo-router/ui`
 * (components/app-tabs.tsx), where every route under `(app)/` becomes a tab
 * slot, so this lives as a sibling of `(app)` in app/_layout.tsx's root
 * Stack, inside the same `Stack.Protected guard={!!user}` block, presented
 * with `presentation: 'formSheet'`.
 *
 * Dismissing (Close, or a successful save) is `router.back()`, which returns
 * focus to whichever `(app)` tab was active — for the Expenses tab that
 * triggers its own `useFocusEffect` refetch (app/(app)/index.tsx), so the
 * newly logged expense just appears rather than this screen needing to push
 * data back itself.
 */
export default function LogExpenseScreen() {
  const { user, token } = useSession();
  const theme = useTheme();
  const router = useRouter();
  const { locale, t } = useTranslation();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(user?.preferredCurrency ?? 'USD');
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
  const [visibility, setVisibility] = useState<Visibility>(DEFAULT_VISIBILITY);

  // `now` is captured once (not read fresh per render) so the Expense Date
  // field's "Today · …" default and the picker's own value stay consistent
  // across this screen's lifetime — see expense-date.ts's file header.
  const [now] = useState(() => new Date());
  const [pickedDate, setPickedDate] = useState<Date | null>(null);

  const [fieldErrors, setFieldErrors] = useState<ExpenseFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stack.Protected only mounts this route while signed in, but the type
  // stays nullable — guard defensively the same way profile.tsx does.
  if (!user || !token) return null;

  const onSubmit = async () => {
    setFormError(null);
    const errors = validateExpenseForm({ description, amount, locale });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const originalAmount = parseAmountInput(amount, locale);
    // Unreachable: validateExpenseForm above already confirmed this parses.
    // Narrowing this way (instead of a `!` assertion) keeps the type honest
    // without asserting past what the compiler can actually see.
    if (originalAmount === null) return;

    const input: CreateExpenseInput = {
      description: description.trim(),
      originalAmount,
      originalCurrency: currency,
      category,
      visibility,
      // Omitted (not this device's "today") unless the user actively
      // picked a day — see expense-date.ts's file header for why.
      ...(pickedDate ? { expenseDate: calendarDateString(pickedDate) } : {}),
    };

    setIsSubmitting(true);
    try {
      await createExpense(token, input);
      router.back();
    } catch (submitError) {
      const result = getErrorMessage(submitError);
      setFormError(result.kind === 'server' ? result.text : t(result.key));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: 'padding', default: undefined })}
    >
      <SafeAreaView
        edges={['bottom']}
        style={[styles.flex, { backgroundColor: theme.surface }]}
      >
        <View style={styles.grabberRow}>
          <View
            style={[styles.grabberBar, { backgroundColor: theme.borderStrong }]}
          />
        </View>

        <View style={styles.headerRow}>
          <ThemedText style={styles.title}>{t('expenseForm.title')}</ThemedText>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('expenseForm.close')}
            style={[styles.closeButton, { backgroundColor: theme.surface2 }]}
          >
            <SymbolView
              name={CLOSE_ICON}
              size={16}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TextField
            label={t('expenseForm.descriptionLabel')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('expenseForm.descriptionPlaceholder')}
            error={
              fieldErrors.description ? t(fieldErrors.description) : undefined
            }
          />

          <AmountField
            value={amount}
            onChangeText={setAmount}
            currency={currency}
            onCurrencyChange={setCurrency}
            targetCurrency={user.preferredCurrency}
            error={fieldErrors.amount ? t(fieldErrors.amount) : undefined}
          />

          <View style={styles.fieldGroup}>
            <ThemedText type="label" themeColor="textTertiary">
              {t('expenseForm.categoryLabel')}
            </ThemedText>
            <CategorySelector value={category} onChange={setCategory} />
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="label" themeColor="textTertiary">
              {t('expenseForm.visibilityLabel')}
            </ThemedText>
            <VisibilitySelector
              value={visibility}
              onChange={setVisibility}
              username={user.username}
            />
          </View>

          <ExpenseDateField
            value={pickedDate ?? now}
            onChange={setPickedDate}
            now={now}
          />

          <FormError message={formError} />

          <PrimaryButton
            label={t('expenseForm.submit')}
            onPress={onSubmit}
            loading={isSubmitting}
          />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  grabberRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  grabberBar: {
    width: 38,
    height: 4,
    borderRadius: Radii.full,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sp4,
    paddingBottom: Spacing.sp3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.sp4,
    paddingBottom: Spacing.sp6,
    gap: 15,
  },
  fieldGroup: {
    gap: 9,
  },
});
