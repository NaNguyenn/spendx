import type { SupportedCurrency } from '@/constants/currency';
import type { SupportedLocale } from '@/lib/locale';

/**
 * Pure, locale-aware number/currency/date formatting for the amounts every
 * screen after this ticket renders (Expenses totals, Leaderboard ranges,
 * Profile stats, …). Locale is always an explicit argument — nothing here
 * reads the active session, so these compose with any later caching layer
 * and are trivial to unit test without a component harness.
 *
 * **Amounts are major units** — 4850000 is ₫4,850,000, and 12.5 is $12.50.
 * Issue #4 settles how the API stores an Original Amount; if it lands on
 * minor units, the conversion belongs in the caller, not in here. Pinned now,
 * while there are no callers to correct.
 *
 * `Intl` constructors are expensive (they parse locale data), so instances
 * are cached by their `(locale, options)` key rather than rebuilt per call —
 * a cache is module state that never changes a function's output for a given
 * input, so it doesn't cost these functions their purity (see the
 * `js-hoist-intl` rule).
 */

const numberFormatters = new Map<string, Intl.NumberFormat>();

function getNumberFormatter(
  locale: SupportedLocale,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options ?? {})}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

function getTimeFormatter(locale: SupportedLocale): Intl.DateTimeFormat {
  let formatter = timeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    timeFormatters.set(locale, formatter);
  }
  return formatter;
}

/**
 * `Intl`'s locale-default short month ("Aug" in en, but the full "Tháng 8" in
 * vi — ICU has no abbreviated form for Vietnamese) doesn't match the mock's
 * "9 thg 8" / "5–11 THG 8". Hand-rolling both tables sidesteps that gap and,
 * as a side effect, keeps every locale/date pairing spelled out identically
 * whether the JS engine is Node's ICU (tests) or Hermes's (the app) — the
 * other `Intl` gotcha this file has to design around.
 */
const MONTH_ABBREVIATIONS: Record<SupportedLocale, readonly string[]> = {
  en: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
  vi: [
    'thg 1',
    'thg 2',
    'thg 3',
    'thg 4',
    'thg 5',
    'thg 6',
    'thg 7',
    'thg 8',
    'thg 9',
    'thg 10',
    'thg 11',
    'thg 12',
  ],
};

const TODAY_LABEL: Record<SupportedLocale, string> = {
  en: 'Today',
  vi: 'Hôm nay',
};

/** Grouped, locale-aware plain number — "1,234,567" (en) vs "1.234.567" (vi). */
export function formatNumber(value: number, locale: SupportedLocale): string {
  return getNumberFormatter(locale).format(value);
}

/**
 * A whole amount in its own currency — "₫4,850,000" (en) vs "4.850.000 ₫"
 * (vi). Fraction digits follow the currency (VND has none, USD has two);
 * symbol position and digit grouping follow the locale.
 */
export function formatAmount(
  amount: number,
  currency: SupportedCurrency,
  locale: SupportedLocale,
): string {
  return getNumberFormatter(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * The abbreviated form used for stat tiles — "₫4.85M" (en) vs "4,85 Tr ₫"
 * (vi, "Tr" = triệu). `maximumFractionDigits: 2` is what keeps the mock's two
 * significant digits ("4.85M") instead of `Intl`'s default one ("4.9M").
 */
export function formatCompactAmount(
  amount: number,
  currency: SupportedCurrency,
  locale: SupportedLocale,
): string {
  return getNumberFormatter(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * The bare currency symbol — "$" (USD/en), "₫" (VND, either locale) — for
 * compact chips like the Currency Pill (design component `gkLbq`) where a
 * full formatted amount doesn't fit. Reuses the same cached formatter as
 * `formatAmount` via `formatToParts`, so this never duplicates ICU's own
 * idea of which symbol a currency/locale pair uses.
 */
export function currencySymbol(
  currency: SupportedCurrency,
  locale: SupportedLocale,
): string {
  const parts = getNumberFormatter(locale, {
    style: 'currency',
    currency,
  }).formatToParts(0);
  return parts.find((part) => part.type === 'currency')?.value ?? currency;
}

/** A 0–1 fraction as a whole-number percent — `formatPercent(0.12, 'en')` → "12%". */
export function formatPercent(
  fraction: number,
  locale: SupportedLocale,
): string {
  return getNumberFormatter(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(fraction);
}

/** Day-then-month, no year — "9 Aug" (en) vs "9 thg 8" (vi). */
export function formatShortDate(date: Date, locale: SupportedLocale): string {
  const day = getNumberFormatter(locale).format(date.getDate());
  const month = MONTH_ABBREVIATIONS[locale][date.getMonth()];
  return `${day} ${month}`;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * "Today · 14:20" when `date` falls on `now`'s calendar day, else
 * "9 Aug · 14:20". `now` is a caller-supplied argument rather than an
 * implicit `Date.now()` read, so the function stays pure and testable
 * without mocking the clock.
 */
export function formatDateTime(
  date: Date,
  locale: SupportedLocale,
  now: Date,
): string {
  const day = isSameCalendarDay(date, now)
    ? TODAY_LABEL[locale]
    : formatShortDate(date, locale);
  return `${day} · ${getTimeFormatter(locale).format(date)}`;
}

/** Day, month and year — "11 Aug 2026" (en) vs "11 thg 8 2026" (vi). */
export function formatFullDate(date: Date, locale: SupportedLocale): string {
  return `${formatShortDate(date, locale)} ${date.getFullYear()}`;
}

/**
 * The Expense Date field's display value: "Today · 11 Aug 2026" while the
 * date is still today (the create form's default), else the plain
 * "9 Aug 2026" once the user has picked a different day — no "Today · "
 * prefix reappears just because that other day happens to be today by the
 * time it's rendered again, since `date` and `now` are compared as given.
 * Same `now`-as-argument shape as `formatDateTime`, for the same reason.
 */
export function formatExpenseDateLabel(
  date: Date,
  locale: SupportedLocale,
  now: Date,
): string {
  const full = formatFullDate(date, locale);
  return isSameCalendarDay(date, now)
    ? `${TODAY_LABEL[locale]} · ${full}`
    : full;
}

/**
 * A Leaderboard-style period range — "5–11 AUG" (en) vs "5–11 THG 8" (vi)
 * within one month; "29 Jul – 4 Aug" style when it crosses one. Uppercasing
 * the same month table `formatShortDate` uses is what keeps "thg 8" and
 * "THG 8" in sync instead of maintaining a second table.
 */
export function formatPeriodRange(
  start: Date,
  end: Date,
  locale: SupportedLocale,
): string {
  const startDay = getNumberFormatter(locale).format(start.getDate());
  const endDay = getNumberFormatter(locale).format(end.getDate());

  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (sameMonth) {
    const month = MONTH_ABBREVIATIONS[locale][end.getMonth()].toUpperCase();
    return `${startDay}–${endDay} ${month}`;
  }

  return `${formatShortDate(start, locale)} – ${formatShortDate(end, locale)}`;
}

/**
 * `formatPeriodRange`'s sibling for the Leaderboard's Period Browser (design
 * component `umxjF`, mobile ticket #12), which spells the year out and
 * spaces the en dash — "5 – 11 Aug 2026" (en) / "5 – 11 thg 8 2026" (vi) —
 * unlike the Summary Card's compact, uppercased, year-less "5–11 AUG". Two
 * renderings of the same range because they're read in different contexts:
 * the Summary Card is always "this Period" (the year is implied), while the
 * Period Browser exists specifically to browse *other* years' Periods.
 */
export function formatPeriodRangeWithYear(
  start: Date,
  end: Date,
  locale: SupportedLocale,
): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    const startDay = getNumberFormatter(locale).format(start.getDate());
    const endDay = getNumberFormatter(locale).format(end.getDate());
    const month = MONTH_ABBREVIATIONS[locale][end.getMonth()];
    return `${startDay} – ${endDay} ${month} ${end.getFullYear()}`;
  }

  if (sameYear) {
    return `${formatShortDate(start, locale)} – ${formatShortDate(end, locale)} ${end.getFullYear()}`;
  }

  return `${formatFullDate(start, locale)} – ${formatFullDate(end, locale)}`;
}
