import type { SupportedCurrency } from '../domain/currency';

export const DAILY_RATE_PROVIDER = Symbol('DAILY_RATE_PROVIDER');

/** One currency pair's rate on the date a `DailyRateProvider` was asked for. */
export interface DailyRateQuote {
  baseCurrency: SupportedCurrency;
  quoteCurrency: SupportedCurrency;
  /** Quote-per-base, as a decimal string — see `DailyRate.rate` in schema.prisma. */
  rate: string;
}

/**
 * Fetches Daily Rates from an external source, for a once-daily snapshot job
 * to write into our own Daily Rate table (see `DailyRateSnapshotService`) —
 * one of the project's two internal seams (issue #1, "Testing Decisions";
 * docs/adr/0001).
 *
 * Per ADR-0001, **conversion never calls this live** — it reads only the
 * Daily Rate table. This interface exists solely to feed that table; nothing
 * on the request path may depend on it.
 *
 * A Symbol injection token because the interface is erased at compile time
 * (rules/di-use-interfaces-tokens.md).
 */
export interface DailyRateProvider {
  /** This calendar date's (`YYYY-MM-DD`) rates, for whichever pairs the provider covers. */
  fetchRates(date: string): Promise<DailyRateQuote[]>;
}
