import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import { DailyRateSnapshotService } from '../../src/daily-rates/daily-rate-snapshot.service';
import type { SupportedCurrency } from '../../src/domain/currency';
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
