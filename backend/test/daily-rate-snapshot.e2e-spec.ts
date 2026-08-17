import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import { DailyRateSnapshotJob } from '../src/daily-rates/daily-rate-snapshot.job';
import { calendarDateToDate } from '../src/domain/calendar-date';
import { SUPPORTED_CURRENCIES } from '../src/domain/currency';
import { createTestApp } from './helpers/app';
import { FixedClock } from './helpers/clock';
import { FakeDailyRateProvider } from './helpers/daily-rate-provider';
import { testDb } from './helpers/database';

// Midday ICT on 2026-08-17 (05:00 UTC = 12:00 Asia/Ho_Chi_Minh), well clear
// of the day boundary so the app-timezone date is unambiguous.
const BASELINE_NOW = new Date('2026-08-17T05:00:00.000Z');
const TODAY = '2026-08-17';

const FULL_MATRIX_SIZE =
  SUPPORTED_CURRENCIES.length * (SUPPORTED_CURRENCIES.length - 1);

/** Every ordered pair on `date`, all at rate 2 — a full provider day. */
function setFullMatrix(provider: FakeDailyRateProvider, date: string): void {
  for (const baseCurrency of SUPPORTED_CURRENCIES) {
    for (const quoteCurrency of SUPPORTED_CURRENCIES) {
      if (quoteCurrency === baseCurrency) continue;
      provider.setRate(date, {
        baseCurrency,
        quoteCurrency,
        rate: '2.0000000000',
      });
    }
  }
}

/**
 * The one suite that runs the snapshot *job* against the fully wired app —
 * job -> DailyRateSnapshotService -> DailyRatesRepository -> the real Daily
 * Rate table — where every other suite drives DailyRateSnapshotService
 * directly (helpers/daily-rates.ts). Issue #9's acceptance criterion is
 * about the job putting ~90 rows/day into the *table*, so mocks proving the
 * orchestration and the write path separately aren't enough on their own.
 */
describe('daily rate snapshot job', () => {
  let app: INestApplication<App>;
  let clock: FixedClock;
  let rateProvider: FakeDailyRateProvider;

  beforeAll(async () => {
    clock = new FixedClock(BASELINE_NOW);
    rateProvider = new FakeDailyRateProvider();
    app = await createTestApp({ clock, dailyRateProvider: rateProvider });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    rateProvider.clear();
    clock.set(BASELINE_NOW);
  });

  it('catchUp writes the full ordered-pair matrix for today into the table', async () => {
    setFullMatrix(rateProvider, TODAY);

    await app.get(DailyRateSnapshotJob).catchUp();

    await expect(
      testDb().dailyRate.count({
        where: { rateDate: calendarDateToDate(TODAY) },
      }),
    ).resolves.toBe(FULL_MATRIX_SIZE);
  });

  it('catchUp heals a date left with a partial matrix', async () => {
    // A partial date — rows from a dev seed, or from before a currency was
    // added — blocks all Expense logging with a 503 (ADR-0008). The catch-up
    // must re-snapshot such a date, overwriting what's there, not skip it
    // because "it has rows".
    await testDb().dailyRate.create({
      data: {
        baseCurrency: 'USD',
        quoteCurrency: 'VND',
        rateDate: calendarDateToDate(TODAY),
        rate: '1.0000000000',
      },
    });
    setFullMatrix(rateProvider, TODAY);

    await app.get(DailyRateSnapshotJob).catchUp();

    await expect(
      testDb().dailyRate.count({
        where: { rateDate: calendarDateToDate(TODAY) },
      }),
    ).resolves.toBe(FULL_MATRIX_SIZE);
    const healed = await testDb().dailyRate.findUniqueOrThrow({
      where: {
        baseCurrency_quoteCurrency_rateDate: {
          baseCurrency: 'USD',
          quoteCurrency: 'VND',
          rateDate: calendarDateToDate(TODAY),
        },
      },
    });
    expect(healed.rate.toString()).toBe('2');
  });

  it('catchUp leaves a date with no provider data untouched', async () => {
    // The fake provider has nothing set: every date in the window fetches
    // empty, so nothing may be written — the "provider failure leaves
    // existing rates intact" posture, observed through the table.
    await app.get(DailyRateSnapshotJob).catchUp();

    await expect(testDb().dailyRate.count()).resolves.toBe(0);
  });
});
