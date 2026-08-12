import type {
  DailyRateProvider,
  DailyRateQuote,
} from '../../src/daily-rates/daily-rate-provider';

/**
 * A `DailyRateProvider` test double: tests "inject fixed rates" through
 * this seam (issue #1, "Testing Decisions") by calling
 * `setRate` before triggering a snapshot (`seedDailyRate` in
 * `helpers/daily-rates.ts`) — never by writing into the Daily Rate table
 * directly, so conversion is exercised against the same table the real
 * snapshot job will fill.
 */
export class FakeDailyRateProvider implements DailyRateProvider {
  private readonly quotesByDate = new Map<string, DailyRateQuote[]>();

  setRate(date: string, quote: DailyRateQuote): void {
    const existing = this.quotesByDate.get(date) ?? [];
    this.quotesByDate.set(date, [...existing, quote]);
  }

  fetchRates(date: string): Promise<DailyRateQuote[]> {
    return Promise.resolve(this.quotesByDate.get(date) ?? []);
  }

  /** Clears every rate set so far — call between tests sharing one app. */
  clear(): void {
    this.quotesByDate.clear();
  }
}
