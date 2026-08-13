import {
  currencySymbol,
  formatAmount,
  formatCompactAmount,
  formatDateTime,
  formatExpenseDateLabel,
  formatFullDate,
  formatNumber,
  formatPercent,
  formatPeriodRange,
  formatShortDate,
} from './format';

// Pin the process to a fixed zone so "today" comparisons and the local-time
// getters format.ts reads from `Date` don't depend on the machine running the
// suite (see mobile ticket #3's TDD note on clock-dependent tests). Must be
// set before any Date/Intl call below, not just before importing format.ts.
process.env.TZ = 'Asia/Ho_Chi_Minh';

/**
 * ICU inserts non-breaking / narrow-no-break spaces around currency symbols
 * and grouped compact units, and the exact character can differ between
 * Node's ICU (this test runner) and Hermes's (the app runtime) — collapse
 * every whitespace-ish character to a plain space before asserting.
 */
function normalizeSpaces(input: string): string {
  return input.replace(/[\s  ]+/g, ' ').trim();
}

describe('formatNumber', () => {
  it('groups with commas in en', () => {
    expect(normalizeSpaces(formatNumber(1234567, 'en'))).toBe('1,234,567');
  });

  it('groups with periods in vi', () => {
    expect(normalizeSpaces(formatNumber(1234567, 'vi'))).toBe('1.234.567');
  });
});

describe('formatAmount', () => {
  it('formats a zero-decimal currency (VND) in en with a leading symbol', () => {
    expect(normalizeSpaces(formatAmount(4850000, 'VND', 'en'))).toBe(
      '₫4,850,000',
    );
  });

  it('formats the same VND amount in vi with a trailing symbol and dot grouping', () => {
    expect(normalizeSpaces(formatAmount(4850000, 'VND', 'vi'))).toBe(
      '4.850.000 ₫',
    );
  });

  it('formats a two-decimal currency (USD) in en', () => {
    expect(normalizeSpaces(formatAmount(12.5, 'USD', 'en'))).toBe('$12.50');
  });

  it('formats the same USD amount in vi with comma decimals', () => {
    expect(normalizeSpaces(formatAmount(12.5, 'USD', 'vi'))).toBe('12,50 US$');
  });
});

describe('formatCompactAmount', () => {
  it('abbreviates VND to millions in en, matching the mock digits', () => {
    expect(normalizeSpaces(formatCompactAmount(4850000, 'VND', 'en'))).toBe(
      '₫4.85M',
    );
  });

  it('abbreviates the same VND amount in vi using "Tr" (triệu)', () => {
    expect(normalizeSpaces(formatCompactAmount(4850000, 'VND', 'vi'))).toBe(
      '4,85 Tr ₫',
    );
  });
});

describe('currencySymbol', () => {
  it('returns the dollar sign for USD in en', () => {
    expect(currencySymbol('USD', 'en')).toBe('$');
  });

  it('returns the đồng sign for VND in both locales', () => {
    expect(currencySymbol('VND', 'en')).toBe('₫');
    expect(currencySymbol('VND', 'vi')).toBe('₫');
  });
});

describe('formatPercent', () => {
  it('renders a fraction as a whole-number percent in en', () => {
    expect(normalizeSpaces(formatPercent(0.12, 'en'))).toBe('12%');
  });

  it('renders the same fraction in vi', () => {
    expect(normalizeSpaces(formatPercent(0.12, 'vi'))).toBe('12%');
  });

  it('rounds rather than truncating', () => {
    expect(normalizeSpaces(formatPercent(0.505, 'en'))).toBe('51%');
  });
});

describe('formatShortDate', () => {
  it('renders day-then-month in en, per the mock ("9 Aug")', () => {
    expect(formatShortDate(new Date(2026, 7, 9), 'en')).toBe('9 Aug');
  });

  it('renders the Vietnamese abbreviation, per the mock ("9 thg 8")', () => {
    expect(formatShortDate(new Date(2026, 7, 9), 'vi')).toBe('9 thg 8');
  });

  it('does not zero-pad the day', () => {
    expect(formatShortDate(new Date(2026, 0, 3), 'en')).toBe('3 Jan');
  });
});

describe('formatDateTime', () => {
  const now = new Date(2026, 7, 9, 20, 20, 0);

  it('labels same-calendar-day dates "Today" in en', () => {
    const loggedAt = new Date(2026, 7, 9, 14, 20, 0);
    expect(formatDateTime(loggedAt, 'en', now)).toBe('Today · 14:20');
  });

  it('labels same-calendar-day dates "Hôm nay" in vi', () => {
    const loggedAt = new Date(2026, 7, 9, 14, 20, 0);
    expect(formatDateTime(loggedAt, 'vi', now)).toBe('Hôm nay · 14:20');
  });

  it('falls back to the short date for a different calendar day', () => {
    const loggedAt = new Date(2026, 7, 8, 14, 20, 0);
    expect(formatDateTime(loggedAt, 'en', now)).toBe('8 Aug · 14:20');
  });

  it('falls back to the short date in vi too', () => {
    const loggedAt = new Date(2026, 7, 8, 14, 20, 0);
    expect(formatDateTime(loggedAt, 'vi', now)).toBe('8 thg 8 · 14:20');
  });

  it('treats "today" as a calendar date, not a rolling 24 hours', () => {
    // 20:20 "now" but 23:59 the night before — 20h ago, still a different day.
    const loggedAt = new Date(2026, 7, 8, 23, 59, 0);
    expect(formatDateTime(loggedAt, 'en', now)).toBe('8 Aug · 23:59');
  });
});

describe('formatFullDate', () => {
  it('renders day, month and year in en, per the mock ("11 Aug 2026")', () => {
    expect(formatFullDate(new Date(2026, 7, 11), 'en')).toBe('11 Aug 2026');
  });

  it('renders the Vietnamese abbreviation with year', () => {
    expect(formatFullDate(new Date(2026, 7, 11), 'vi')).toBe('11 thg 8 2026');
  });
});

describe('formatExpenseDateLabel', () => {
  const now = new Date(2026, 7, 11, 9, 0, 0);

  it('prefixes "Today" for the current calendar day in en, per the mock', () => {
    expect(formatExpenseDateLabel(now, 'en', now)).toBe('Today · 11 Aug 2026');
  });

  it('prefixes "Hôm nay" for the current calendar day in vi', () => {
    expect(formatExpenseDateLabel(now, 'vi', now)).toBe(
      'Hôm nay · 11 thg 8 2026',
    );
  });

  it('renders a plain date, no prefix, for a backdated day', () => {
    const backdated = new Date(2026, 7, 5, 9, 0, 0);
    expect(formatExpenseDateLabel(backdated, 'en', now)).toBe('5 Aug 2026');
  });

  it('treats "today" as a calendar date, not a rolling 24 hours', () => {
    const lateLastNight = new Date(2026, 7, 10, 23, 59, 0);
    expect(formatExpenseDateLabel(lateLastNight, 'en', now)).toBe(
      '10 Aug 2026',
    );
  });
});

describe('formatPeriodRange', () => {
  it('renders a same-month range uppercased in en, per the mock ("5–11 AUG")', () => {
    const start = new Date(2026, 7, 5);
    const end = new Date(2026, 7, 11);
    expect(formatPeriodRange(start, end, 'en')).toBe('5–11 AUG');
  });

  it('renders the same range in vi, per the mock ("5–11 THG 8")', () => {
    const start = new Date(2026, 7, 5);
    const end = new Date(2026, 7, 11);
    expect(formatPeriodRange(start, end, 'vi')).toBe('5–11 THG 8');
  });

  it('falls back to two short dates when the range crosses a month', () => {
    const start = new Date(2026, 6, 29);
    const end = new Date(2026, 7, 4);
    expect(formatPeriodRange(start, end, 'en')).toBe('29 Jul – 4 Aug');
  });
});
