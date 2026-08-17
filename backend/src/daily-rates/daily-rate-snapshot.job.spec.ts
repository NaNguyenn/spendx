import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { CLOCK, type Clock } from '../clock/clock';
import { DailyRateSnapshotJob } from './daily-rate-snapshot.job';
import { DailyRateSnapshotService } from './daily-rate-snapshot.service';
import { DailyRatesRepository } from './daily-rates.repository';

// Midday ICT on 2026-08-17 (05:00 UTC = 12:00 Asia/Ho_Chi_Minh), well clear
// of the day boundary so the app-timezone date is unambiguous.
const NOW = new Date('2026-08-17T05:00:00.000Z');
const TODAY = '2026-08-17';

// SUPPORTED_CURRENCIES is 10 entries, so a covered date holds 90 rows.
const FULL_MATRIX_SIZE = 90;

interface JobHarness {
  job: DailyRateSnapshotJob;
  countRatesOn: jest.Mock;
  snapshotFor: jest.Mock;
}

/**
 * Builds the job through `Test.createTestingModule` with every dependency
 * mocked at its token (rules/test-use-testing-module.md) — the same wiring
 * Nest performs in the app, minus the database, provider, and wall clock.
 */
async function buildJob(options: {
  backfillDays: number;
  countRatesOn?: jest.Mock;
  snapshotFor?: jest.Mock;
  clock?: Clock;
}): Promise<JobHarness> {
  const countRatesOn = options.countRatesOn ?? jest.fn().mockResolvedValue(0);
  const snapshotFor =
    options.snapshotFor ?? jest.fn().mockResolvedValue(undefined);

  const moduleRef = await Test.createTestingModule({
    providers: [
      DailyRateSnapshotJob,
      { provide: CLOCK, useValue: options.clock ?? { now: () => NOW } },
      { provide: DailyRateSnapshotService, useValue: { snapshotFor } },
      { provide: DailyRatesRepository, useValue: { countRatesOn } },
      { provide: ConfigService, useValue: { get: () => options.backfillDays } },
    ],
  }).compile();

  return {
    job: moduleRef.get(DailyRateSnapshotJob),
    countRatesOn,
    snapshotFor,
  };
}

describe('DailyRateSnapshotJob.catchUp', () => {
  it('snapshots every uncovered date in the backfill window, skipping covered dates', async () => {
    const countRatesOn = jest
      .fn()
      .mockImplementation((date: string) =>
        Promise.resolve(date === '2026-08-16' ? FULL_MATRIX_SIZE : 0),
      );
    const { job, snapshotFor } = await buildJob({
      backfillDays: 2,
      countRatesOn,
    });

    await job.catchUp();

    expect(countRatesOn).toHaveBeenCalledWith('2026-08-15');
    expect(countRatesOn).toHaveBeenCalledWith('2026-08-16');
    expect(countRatesOn).toHaveBeenCalledWith('2026-08-17');
    expect(snapshotFor).toHaveBeenCalledWith('2026-08-15');
    expect(snapshotFor).toHaveBeenCalledWith('2026-08-17');
    expect(snapshotFor).not.toHaveBeenCalledWith('2026-08-16');
    expect(snapshotFor).toHaveBeenCalledTimes(2);
  });

  it('re-snapshots a date holding only a partial matrix', async () => {
    // A date with some rows but not the full ordered-pair set (a dev seed,
    // or rows predating a currency's addition) blocks all Expense logging
    // with a 503 (ADR-0008) — it must count as uncovered, not as done.
    const countRatesOn = jest.fn().mockResolvedValue(FULL_MATRIX_SIZE - 1);
    const { job, snapshotFor } = await buildJob({
      backfillDays: 0,
      countRatesOn,
    });

    await job.catchUp();

    expect(snapshotFor).toHaveBeenCalledWith(TODAY);
  });

  it('logs a warning and keeps going when one date fails, and still resolves', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const snapshotFor = jest.fn().mockImplementation((date: string) => {
      if (date === '2026-08-16') {
        return Promise.reject(new Error('provider unavailable'));
      }
      return Promise.resolve(undefined);
    });
    const { job } = await buildJob({ backfillDays: 2, snapshotFor });

    await expect(job.catchUp()).resolves.toBeUndefined();

    expect(snapshotFor).toHaveBeenCalledWith('2026-08-15');
    expect(snapshotFor).toHaveBeenCalledWith('2026-08-16');
    expect(snapshotFor).toHaveBeenCalledWith('2026-08-17');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('2026-08-16'));

    warnSpy.mockRestore();
  });

  it('keeps going when the coverage check itself fails for one date', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const countRatesOn = jest.fn().mockImplementation((date: string) => {
      if (date === '2026-08-16') {
        return Promise.reject(new Error('connection refused'));
      }
      return Promise.resolve(0);
    });
    const { job, snapshotFor } = await buildJob({
      backfillDays: 2,
      countRatesOn,
    });

    await expect(job.catchUp()).resolves.toBeUndefined();

    expect(snapshotFor).toHaveBeenCalledWith('2026-08-15');
    expect(snapshotFor).not.toHaveBeenCalledWith('2026-08-16');
    expect(snapshotFor).toHaveBeenCalledWith('2026-08-17');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('2026-08-16'));

    warnSpy.mockRestore();
  });

  it('backfills zero days: snapshots only today', async () => {
    const { job, snapshotFor } = await buildJob({ backfillDays: 0 });

    await job.catchUp();

    expect(snapshotFor).toHaveBeenCalledTimes(1);
    expect(snapshotFor).toHaveBeenCalledWith(TODAY);
  });
});

describe('DailyRateSnapshotJob scheduling hooks', () => {
  it('the cron handler snapshots the uncovered window', async () => {
    const { job, snapshotFor } = await buildJob({ backfillDays: 0 });

    await job.handleCron();

    expect(snapshotFor).toHaveBeenCalledWith(TODAY);
  });

  it('the cron handler logs instead of rejecting on a whole-run failure', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const brokenClock: Clock = {
      now: () => {
        throw new Error('clock unavailable');
      },
    };
    const { job, snapshotFor } = await buildJob({
      backfillDays: 0,
      clock: brokenClock,
    });

    await expect(job.handleCron()).resolves.toBeUndefined();

    expect(snapshotFor).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('clock unavailable'),
    );

    errorSpy.mockRestore();
  });

  it('bootstrap snapshots the uncovered window without blocking or rejecting', async () => {
    const { job, snapshotFor } = await buildJob({ backfillDays: 0 });

    expect(() => job.onApplicationBootstrap()).not.toThrow();
    // Let the fire-and-forget promise chain settle.
    await new Promise((resolve) => setImmediate(resolve));

    expect(snapshotFor).toHaveBeenCalledWith(TODAY);
  });

  it('bootstrap logs instead of rejecting on a whole-run failure', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const brokenClock: Clock = {
      now: () => {
        throw new Error('clock unavailable at boot');
      },
    };
    const { job } = await buildJob({ backfillDays: 0, clock: brokenClock });

    expect(() => job.onApplicationBootstrap()).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('clock unavailable at boot'),
    );

    errorSpy.mockRestore();
  });
});
