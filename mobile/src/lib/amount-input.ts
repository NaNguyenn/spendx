import type { SupportedCurrency } from '@/constants/currency';
import { formatAmount } from '@/lib/format';
import type { SupportedLocale } from '@/lib/locale';

/**
 * Turns what a user typed into the Amount field into the canonical decimal
 * string `POST /expenses` wants, and turns what the API sends back into a
 * display string. Two directions of the same money-as-string boundary
 * format.ts already formats major-unit `number`s for (see its header
 * comment) — this is the layer below that, where the value is still text the
 * user is mid-typing or a decimal string the server returned.
 *
 * The validation half mirrors backend/src/domain/money.ts's
 * `MONEY_AMOUNT_PATTERN` exactly (own copy, not imported — mobile and
 * backend are deliberately separate npm projects, see README's Layout): a
 * positive decimal string, at most 16 integer digits, at most 4 decimal
 * places. Keeping the two patterns textually identical is what makes "the
 * client accepted it" a reliable predictor of "the server will too".
 */

const MONEY_AMOUNT_PATTERN = /^\d{1,16}(\.\d{1,4})?$/;
const ALL_ZERO_PATTERN = /^0+(\.0+)?$/;

/**
 * Which character each locale uses for the decimal point and for thousands
 * grouping — the two are always swapped between the pair the app supports
 * (`48.65` in en is `48,65` in vi), never independently.
 */
const AMOUNT_SEPARATORS: Record<
  SupportedLocale,
  { decimal: string; group: string }
> = {
  en: { decimal: '.', group: ',' },
  vi: { decimal: ',', group: '.' },
};

/**
 * Parses a locale-formatted amount as typed (grouping separators, a
 * locale-specific decimal mark, leading zeros, all of it) into the canonical
 * `"48.65"` decimal string the API accepts, or `null` when the input can't
 * be read as one positive, boundedly-precise amount.
 *
 * Deliberately never throws and never guesses: a second decimal-like
 * character left over after stripping the locale's grouping separator (e.g.
 * two commas typed in vi) fails the final pattern check rather than picking
 * one arbitrarily.
 */
export function parseAmountInput(
  raw: string,
  locale: SupportedLocale,
): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const { decimal, group } = AMOUNT_SEPARATORS[locale];

  // Strip grouping separators, then fold the locale's decimal mark to '.' —
  // order matters, since in vi the grouping mark is itself '.'.
  const withoutGrouping = trimmed.split(group).join('');
  const normalized =
    decimal === '.'
      ? withoutGrouping
      : withoutGrouping.split(decimal).join('.');

  const parts = normalized.split('.');
  // More than one '.' left over means more than one decimal separator was
  // typed (or a stray grouping character survived) — not decidable, reject.
  if (parts.length > 2) return null;

  let integerPart = parts[0] ?? '';
  const fractionPart = parts[1];

  // A leading decimal mark ("." typed alone, ".5") has no digits before it —
  // treat that as an implicit zero rather than rejecting.
  if (integerPart === '') integerPart = '0';

  // Cosmetic *and* load-bearing: "00000000000000123" has 17 raw digits but
  // only 3 significant ones, and the 16-digit cap below is meant to bound
  // magnitude, not keystrokes — so the cap is checked after this strip.
  integerPart = integerPart.replace(/^0+(?=\d)/, '');

  const candidate =
    fractionPart === undefined ? integerPart : `${integerPart}.${fractionPart}`;

  if (!MONEY_AMOUNT_PATTERN.test(candidate)) return null;
  if (ALL_ZERO_PATTERN.test(candidate)) return null;

  return candidate;
}

/**
 * Renders an `ExpenseDto` amount — a fixed-scale decimal *string*, e.g.
 * `"45000.0000"` — for display, bridging it to `format.ts`'s `formatAmount`
 * (which takes a `number`).
 *
 * Precision caveat: this goes through `Number(...)`, so a value at the
 * extreme end of what the API allows (16 integer digits) can exceed
 * `Number.MAX_SAFE_INTEGER` and lose precision in the last digit or two.
 * Acceptable here because this function is presentation-only — the decimal
 * string itself, never this `number`, is what's ever sent back to the API or
 * used in arithmetic.
 */
export function formatExpenseAmount(
  decimalAmount: string,
  currency: SupportedCurrency,
  locale: SupportedLocale,
): string {
  return formatAmount(Number(decimalAmount), currency, locale);
}
