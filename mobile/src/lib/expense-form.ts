import { parseAmountInput } from '@/lib/amount-input';
import type { SupportedLocale } from '@/lib/locale';

import type { TranslationKey } from '@/i18n/en';

/**
 * The client-side mirror of the rules `POST /expenses` enforces (see
 * backend/src/expenses/dto/create-expense.dto.ts), in the shape and style of
 * `validateSignUpForm` (lib/validation.ts): pure, returns `TranslationKey`s
 * rather than strings, and only covers the two free-text fields — Category
 * and Visibility are always one of a fixed, always-valid set chosen from a
 * selector, and the Amount's currency comes from the same closed set, so
 * none of those can be invalid input the way typed text can.
 */

/** 1–500 characters after trimming — mirrors `@Length(1, 500)` on `CreateExpenseDto.description`. */
export function isValidExpenseDescription(description: string): boolean {
  const trimmed = description.trim();
  return trimmed.length >= 1 && trimmed.length <= 500;
}

export interface ExpenseFormValues {
  description: string;
  /** Raw, as typed — locale-aware parsing happens here via `parseAmountInput`. */
  amount: string;
  locale: SupportedLocale;
}

export interface ExpenseFormErrors {
  description?: TranslationKey;
  amount?: TranslationKey;
}

export function validateExpenseForm(
  values: ExpenseFormValues,
): ExpenseFormErrors {
  const errors: ExpenseFormErrors = {};

  if (!isValidExpenseDescription(values.description)) {
    errors.description = 'validation.expenseDescription';
  }
  if (parseAmountInput(values.amount, values.locale) === null) {
    errors.amount = 'validation.expenseAmount';
  }

  return errors;
}
