import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { CATEGORIES } from '../src/domain/category';
import { createTestApp } from './helpers/app';
import { signUp } from './helpers/auth';
import { FixedClock } from './helpers/clock';
import { FakeDailyRateProvider } from './helpers/daily-rate-provider';
import { seedDailyRatesFromBase } from './helpers/daily-rates';
import { createExpense } from './helpers/expenses';
import { authBody, expenseBody, statisticsBody } from './helpers/http';

/**
 * The instant every test starts pinned to: 2026-08-05T10:00:00.000Z is
 * 2026-08-05 (Wednesday) in Asia/Ho_Chi_Minh too (+07:00, 17:00 local) —
 * mid-week, so "current week" and "current month" boundaries are unambiguous.
 *
 * Current ISO week: 2026-08-03 (Mon) .. 2026-08-09 (Sun).
 * Previous ISO week: 2026-07-27 (Mon) .. 2026-08-02 (Sun).
 * Current month:     2026-08-01 .. 2026-08-31.
 * Previous month:    2026-07-01 .. 2026-07-31.
 */
const BASELINE_NOW = new Date('2026-08-05T10:00:00.000Z');
const LOGGING_DATE = '2026-08-05';

// All zero, so every category ties — expected in CATEGORIES' own canonical
// order (housing, food, leisure, investment, other).
const ZERO_CATEGORIES = CATEGORIES.map((category) => ({
  category,
  total: '0.0000',
}));

describe('statistics', () => {
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

  /** Signs a fresh account up and returns its bearer token. */
  async function signUpForToken(
    preferredCurrency: string = 'VND',
  ): Promise<string> {
    const { response } = await signUp(app, { preferredCurrency });
    return authBody(response).accessToken;
  }

  it('rejects a request with no token', async () => {
    await request(app.getHttpServer()).get('/expenses/statistics').expect(401);
  });

  it('returns all-zero totals and five zero Categories, sorted stably, for an owner with no Expenses', async () => {
    const token = await signUpForToken('VND');

    const response = await request(app.getHttpServer())
      .get('/expenses/statistics')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    const stats = statisticsBody(response);
    expect(stats.currency).toBe('VND');
    expect(stats.week).toEqual({
      start: '2026-08-03',
      end: '2026-08-09',
      total: '0.0000',
      previousTotal: '0.0000',
      categories: ZERO_CATEGORIES,
    });
    expect(stats.month).toEqual({
      start: '2026-08-01',
      end: '2026-08-31',
      total: '0.0000',
      previousTotal: '0.0000',
      categories: ZERO_CATEGORIES,
    });
  });

  it('totals the current week and month by Category, in the Preferred Currency, including a Private Expense', async () => {
    const token = await signUpForToken('VND');
    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'VND',
      date: LOGGING_DATE,
    });

    // All logged and dated the same mid-week day, in Preferred Currency —
    // so amounts pass through as exact identity (ADR-0008) and only the
    // grouping and sort are under test here.
    await createExpense(app, token, {
      description: 'rent',
      originalAmount: '10000.0000',
      originalCurrency: 'VND',
      category: 'housing',
      visibility: 'private',
      expenseDate: LOGGING_DATE,
    });
    await createExpense(app, token, {
      description: 'groceries',
      originalAmount: '30000.0000',
      originalCurrency: 'VND',
      category: 'food',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });
    await createExpense(app, token, {
      description: 'movies',
      originalAmount: '20000.0000',
      originalCurrency: 'VND',
      category: 'leisure',
      visibility: 'friend_only',
      expenseDate: LOGGING_DATE,
    });

    const response = await request(app.getHttpServer())
      .get('/expenses/statistics')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    const stats = statisticsBody(response);
    expect(stats.currency).toBe('VND');

    const expectedPeriod = {
      total: '60000.0000',
      previousTotal: '0.0000',
      categories: [
        { category: 'food', total: '30000.0000' },
        { category: 'leisure', total: '20000.0000' },
        { category: 'housing', total: '10000.0000' },
        // Both zero — tied, so canonical CATEGORIES order (investment before
        // other) breaks the tie.
        { category: 'investment', total: '0.0000' },
        { category: 'other', total: '0.0000' },
      ],
    };
    expect(stats.week).toEqual({
      start: '2026-08-03',
      end: '2026-08-09',
      ...expectedPeriod,
    });
    expect(stats.month).toEqual({
      start: '2026-08-01',
      end: '2026-08-31',
      ...expectedPeriod,
    });
  });

  it('groups by Expense Date, not Logged At: a backdated Expense affects previousTotal, not total', async () => {
    const token = await signUpForToken('VND');
    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'VND',
      date: LOGGING_DATE,
    });

    // Logged mid-week (current week), but its Expense Date lands in the
    // *previous* ISO week — 2026-08-01 is a Saturday inside
    // 2026-07-27..2026-08-02 — while still inside the *current* month.
    await createExpense(app, token, {
      originalAmount: '15000.0000',
      originalCurrency: 'VND',
      category: 'other',
      expenseDate: '2026-08-01',
    });

    const response = await request(app.getHttpServer())
      .get('/expenses/statistics')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    const stats = statisticsBody(response);
    // Current week: unaffected.
    expect(stats.week.total).toBe('0.0000');
    // Previous week: picks it up.
    expect(stats.week.previousTotal).toBe('15000.0000');
    // Current month: 2026-08-01 is still in August, so it counts here too —
    // grouping is per period independently.
    expect(stats.month.total).toBe('15000.0000');
    expect(stats.month.previousTotal).toBe('0.0000');
  });

  it('includes the week boundary dates (Monday and Sunday) and excludes the days just outside them', async () => {
    const token = await signUpForToken('VND');
    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'VND',
      date: LOGGING_DATE,
    });

    // Current week is 2026-08-03 (Mon) .. 2026-08-09 (Sun).
    await createExpense(app, token, {
      originalAmount: '1000.0000',
      originalCurrency: 'VND',
      expenseDate: '2026-08-03', // week start — inside
    });
    await createExpense(app, token, {
      originalAmount: '2000.0000',
      originalCurrency: 'VND',
      expenseDate: '2026-08-09', // week end — inside
    });
    await createExpense(app, token, {
      originalAmount: '4000.0000',
      originalCurrency: 'VND',
      expenseDate: '2026-08-02', // the day before — outside (previous week)
    });
    await createExpense(app, token, {
      originalAmount: '8000.0000',
      originalCurrency: 'VND',
      expenseDate: '2026-08-10', // the day after — outside entirely
    });

    const response = await request(app.getHttpServer())
      .get('/expenses/statistics')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    const stats = statisticsBody(response);
    expect(stats.week.total).toBe('3000.0000'); // 1000 + 2000
    expect(stats.week.previousTotal).toBe('4000.0000'); // the day before only
  });

  it('converts a cross-currency Expense to the Preferred Currency via its Conversion Snapshot entry', async () => {
    const token = await signUpForToken('VND');
    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'USD',
      date: LOGGING_DATE,
      rates: { VND: '25000.0000000000' },
    });

    await createExpense(app, token, {
      originalAmount: '10.0000',
      originalCurrency: 'USD',
      category: 'leisure',
      expenseDate: LOGGING_DATE,
    });

    const response = await request(app.getHttpServer())
      .get('/expenses/statistics')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    const stats = statisticsBody(response);
    expect(stats.week.total).toBe('250000.0000');
    expect(
      stats.week.categories.find((c) => c.category === 'leisure')?.total,
    ).toBe('250000.0000');
  });

  it('recomputes after a date move and a delete: PATCHing an Expense Date across the week boundary shifts its amount between total and previousTotal, and DELETE removes it entirely', async () => {
    const token = await signUpForToken('VND');
    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'VND',
      date: LOGGING_DATE,
    });

    const { response: firstCreated } = await createExpense(app, token, {
      description: 'moved later',
      originalAmount: '1000.0000',
      originalCurrency: 'VND',
      category: 'other',
      expenseDate: LOGGING_DATE, // current week
    });
    const moved = expenseBody(firstCreated);

    const { response: secondCreated } = await createExpense(app, token, {
      description: 'stays put',
      originalAmount: '2000.0000',
      originalCurrency: 'VND',
      category: 'other',
      expenseDate: LOGGING_DATE, // current week
    });
    const staying = expenseBody(secondCreated);

    const before = statisticsBody(
      await request(app.getHttpServer())
        .get('/expenses/statistics')
        .set('Authorization', `Bearer ${token}`),
    );
    expect(before.week.total).toBe('3000.0000');
    expect(before.week.previousTotal).toBe('0.0000');

    // A "date move": PATCH the first Expense's Expense Date from the current
    // week into the previous ISO week (2026-07-27..2026-08-02).
    await request(app.getHttpServer())
      .patch(`/expenses/${moved.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ expenseDate: '2026-08-01' })
      .expect(200);

    const afterMove = statisticsBody(
      await request(app.getHttpServer())
        .get('/expenses/statistics')
        .set('Authorization', `Bearer ${token}`),
    );
    // The moved Expense's amount left `total` and now shows in `previousTotal`.
    expect(afterMove.week.total).toBe('2000.0000');
    expect(afterMove.week.previousTotal).toBe('1000.0000');

    await request(app.getHttpServer())
      .delete(`/expenses/${staying.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const afterDelete = statisticsBody(
      await request(app.getHttpServer())
        .get('/expenses/statistics')
        .set('Authorization', `Bearer ${token}`),
    );
    // The deleted Expense's amount is gone from total; previousTotal is
    // untouched.
    expect(afterDelete.week.total).toBe('0.0000');
    expect(afterDelete.week.previousTotal).toBe('1000.0000');
  });

  it('resolves "current" in the fixed app timezone (ADR-0004), not UTC: an instant that is Sunday in UTC but already Monday in Asia/Ho_Chi_Minh both picks the ICT week and excludes the UTC calendar date from it', async () => {
    const token = await signUpForToken('VND');
    // 2026-08-02T18:00:00.000Z is Sunday 2026-08-02 in UTC, but 01:00 on
    // Monday 2026-08-03 in Asia/Ho_Chi_Minh (+07:00) — the two timezones
    // disagree on the calendar date, and that disagreement flips which ISO
    // week is "current": UTC would still be inside 2026-07-27..2026-08-02,
    // but ICT is already inside 2026-08-03..2026-08-09.
    clock.set(new Date('2026-08-02T18:00:00.000Z'));
    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'VND',
      date: '2026-08-03',
    });

    // Dated the UTC calendar date (2026-08-02), which is *not* part of the
    // ICT-resolved current week — it belongs to the previous one.
    await createExpense(app, token, {
      originalAmount: '7000.0000',
      originalCurrency: 'VND',
      category: 'other',
      expenseDate: '2026-08-02',
    });

    const response = await request(app.getHttpServer())
      .get('/expenses/statistics')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    const stats = statisticsBody(response);
    // "Current" resolves to Monday 2026-08-03 in the app timezone, so the
    // current ISO week starts there, not on the UTC Monday a week earlier.
    expect(stats.week.start).toBe('2026-08-03');
    expect(stats.week.end).toBe('2026-08-09');
    expect(stats.month.start).toBe('2026-08-01');
    expect(stats.month.end).toBe('2026-08-31');
    // The 2026-08-02 Expense lands in the previous week, not the current one.
    expect(stats.week.total).toBe('0.0000');
    expect(stats.week.previousTotal).toBe('7000.0000');
  });

  it("never includes another owner's Expenses", async () => {
    const ownerToken = await signUpForToken('VND');
    const strangerToken = await signUpForToken('VND');
    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'VND',
      date: LOGGING_DATE,
    });

    await createExpense(app, ownerToken, {
      originalAmount: '5000.0000',
      originalCurrency: 'VND',
      expenseDate: LOGGING_DATE,
    });
    await createExpense(app, strangerToken, {
      originalAmount: '999999.0000',
      originalCurrency: 'VND',
      expenseDate: LOGGING_DATE,
    });

    const response = await request(app.getHttpServer())
      .get('/expenses/statistics')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(statisticsBody(response).week.total).toBe('5000.0000');
  });
});
