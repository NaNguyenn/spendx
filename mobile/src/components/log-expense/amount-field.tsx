import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { CurrencyPickerSheet } from '@/components/log-expense/currency-picker-sheet';
import { CurrencyPill } from '@/components/currency-pill';
import { fieldStyles } from '@/components/form/field-styles';
import { ThemedText } from '@/components/themed-text';
import type { SupportedCurrency } from '@/constants/currency';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/translation-context';

interface AmountFieldProps {
  /** Raw, as typed — locale-aware canonicalization happens at submit time via `parseAmountInput`. */
  value: string;
  onChangeText: (text: string) => void;
  /** The Original Currency — what the picker changes. */
  currency: SupportedCurrency;
  onCurrencyChange: (currency: SupportedCurrency) => void;
  /**
   * The signed-in user's Preferred Currency — what the hint says this
   * converts *to*. Deliberately a separate prop from `currency` (which is
   * the Original Currency, freely chosen per expense): the two are the same
   * value only when the user hasn't touched the picker.
   */
  targetCurrency: SupportedCurrency;
  /**
   * True on the edit form: the Original Amount is immutable after logging
   * (backend ADR-0008), so the input and the currency picker are inert and
   * the hint explains the delete-and-relog escape hatch instead.
   */
  locked?: boolean;
  error?: string;
}

/**
 * Design component `jhpK1`, "Component — Amount Input": a large numeric
 * value on the left, the Currency Pill as a picker trigger on the right, and
 * a hint line below. The mock's richer variant shows a live "≈ 1.250.000 ₫
 * · rate 25.694" preview computed from a rate the app doesn't fetch
 * anywhere else — there is no rates endpoint (`GET /expenses` and
 * `POST /expenses` are the whole surface, api/schema.d.ts), and adding one
 * is out of this ticket's scope. This renders the plain hint instead, with
 * the signed-in Preferred Currency (`targetCurrency`) interpolated in — not
 * `currency`, the Original Currency the picker changes, which is what this
 * converts *from*.
 */
export function AmountField({
  value,
  onChangeText,
  currency,
  onCurrencyChange,
  targetCurrency,
  locked = false,
  error,
}: AmountFieldProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <View style={fieldStyles.field}>
      <ThemedText type="label" themeColor="textTertiary">
        {t('expenseForm.amountLabel')}
      </ThemedText>
      <View
        style={[
          fieldStyles.box,
          {
            backgroundColor: theme.surface2,
            borderColor: error ? theme.danger : theme.border,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          // "decimal-pad" (not "numeric") is what surfaces the locale's own
          // decimal separator key on iOS/Android — the amount-input.ts
          // parser reads either "." or "," depending on `locale`.
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={theme.textTertiary}
          editable={!locked}
          style={[
            styles.input,
            { color: locked ? theme.textTertiary : theme.text },
          ]}
        />
        <CurrencyPill
          currency={currency}
          onPress={locked ? undefined : () => setIsPickerOpen(true)}
        />
      </View>
      {error ? (
        <ThemedText themeColor="danger" style={fieldStyles.error}>
          {error}
        </ThemedText>
      ) : (
        <ThemedText themeColor="textTertiary" style={styles.hint}>
          {locked
            ? t('expenseForm.amountLockedHint')
            : t('expenseForm.amountHint', { currency: targetCurrency })}
        </ThemedText>
      )}

      <CurrencyPickerSheet
        visible={isPickerOpen}
        value={currency}
        onSelect={(next) => {
          onCurrencyChange(next);
          setIsPickerOpen(false);
        }}
        onClose={() => setIsPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
    padding: 0,
  },
  hint: {
    fontSize: 11.5,
    lineHeight: 16,
  },
});
