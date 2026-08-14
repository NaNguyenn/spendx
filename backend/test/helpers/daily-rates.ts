import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import { DailyRateSnapshotService } from '../../src/daily-rates/daily-rate-snapshot.service';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../../src/domain/currency';
import type { FakeDailyRateProvider } from './daily-rate-provider';

export interface SeedDailyRateInput {
  baseCurrency: SupportedCurrency;
  quoteCurrency: SupportedCurrency;
  /** YYYY-MM-DD */
  date: string;
  /** Quote-per-base, as a decimal string. */
  rate: string;
}

/**
 * Gets a fixed rate into the Daily Rate table through the real seam: sets it
 * on the app's `FakeDailyRateProvider` (passed to `createTestApp` as
 * `dailyRateProvider`), then runs the same snapshot the real cron job will
 * run. Conversion then reads it back from the table, never from the fake
 * provider directly — proving the ADR-0001 read path, not just the fixture.
 */
export async function seedDailyRate(
  app: INestApplication<App>,
  rateProvider: FakeDailyRateProvider,
  input: SeedDailyRateInput,
): Promise<void> {
  rateProvider.setRate(input.date, {
    baseCurrency: input.baseCurrency,
    quoteCurrency: input.quoteCurrency,
    rate: input.rate,
  });
  await app.get(DailyRateSnapshotService).snapshotFor(input.date);
}

export interface SeedDailyRatesFromBaseInput {
  baseCurrency: SupportedCurrency;
  /** YYYY-MM-DD */
  date: string;
  /** Quote-per-base overrides; every unlisted pair gets rate 1. */
  rates?: Partial<Record<SupportedCurrency, string>>;
  /** Pairs to leave uncovered — for the all-or-nothing failure tests. */
  omit?: SupportedCurrency[];
}

/**
 * Seeds `baseCurrency -> quote` for every other Supported Currency on one
 * date, through the same snapshot seam as {@link seedDailyRate}. Logging an
 * Expense computes its whole Conversion Snapshot (ADR-0008), so any test
 * that logs one needs its Original Currency's full pair coverage, not just
 * the pair its assertion cares about.
 */
export async function seedDailyRatesFromBase(
  app: INestApplication<App>,
  rateProvider: FakeDailyRateProvider,
  input: SeedDailyRatesFromBaseInput,
): Promise<void> {
  for (const quoteCurrency of SUPPORTED_CURRENCIES) {
    if (quoteCurrency === input.baseCurrency) continue;
    if (input.omit?.includes(quoteCurrency)) continue;
    rateProvider.setRate(input.date, {
      baseCurrency: input.baseCurrency,
      quoteCurrency,
      rate: input.rates?.[quoteCurrency] ?? '1.0000000000',
    });
  }
  await app.get(DailyRateSnapshotService).snapshotFor(input.date);
}
