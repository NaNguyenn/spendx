import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { SUPPORTED_CURRENCIES } from '../src/domain/currency';
import { createTestApp } from './helpers/app';
import { signUp } from './helpers/auth';
import { FixedClock } from './helpers/clock';
import { FakeDailyRateProvider } from './helpers/daily-rate-provider';
import { seedDailyRate, seedDailyRatesFromBase } from './helpers/daily-rates';
import { testDb } from './helpers/database';
import { createExpense, validCreateExpenseBody } from './helpers/expenses';
import {
  authBody,
  errorMessage,
  expenseBody,
  expenseListBody,
} from './helpers/http';

/** The instant every test starts pinned to; 2026-08-01 in +07:00 as well as UTC. */
const BASELINE_NOW = new Date('2026-08-01T10:00:00.000Z');

describe('expenses', () => {
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
    // Re-pin the clock too, not just the rates: the app instance is shared
    // across this file, so a test that never calls `clock.set` would
    // otherwise inherit whatever instant the previous one left behind and
    // pass or fail depending on execution order.
    clock.set(BASELINE_NOW);
  });

  /** Signs a fresh account up and returns its bearer token. */
  async function signUpForToken(
    preferredCurrency: string = 'USD',
  ): Promise<string> {
    const { response } = await signUp(app, { preferredCurrency });
    return authBody(response).accessToken;
  }

  describe('POST /expenses', () => {
    it('rejects a request with no token', async () => {
      await request(app.getHttpServer())
        .post('/expenses')
        .send(validCreateExpenseBody())
        .expect(401);
    });

    it('converts at the exact frozen Daily Rate, with the Original Amount returned byte-identical', async () => {
      const token = await signUpForToken('USD');
      clock.set(new Date('2026-08-01T10:00:00.000Z')); // logging day 2026-08-01 in +07:00 too

      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
        rates: { USD: '0.0000400000' },
      });

      const { response } = await createExpense(app, token, {
        description: 'Bún chả',
        originalAmount: '1000000.0000',
        originalCurrency: 'VND',
      });

      expect(response.status).toBe(201);
      const expense = expenseBody(response);
      expect(expense.originalAmount).toBe('1000000.0000');
      expect(expense.originalCurrency).toBe('VND');
      expect(expense.convertedAmount).toBe('40.0000');
      expect(expense.convertedCurrency).toBe('USD');
      expect(expense.expenseDate).toBe('2026-08-01');
      expect(expense.loggedAt).toBe(
        new Date('2026-08-01T10:00:00.000Z').toISOString(),
      );
    });

    // ADR-0002: the Daily Rate used is the *logging* date's, never the
    // (possibly backdated) Expense Date's.
    it('anchors the Converted Amount to the logging date, not a backdated Expense Date', async () => {
      const token = await signUpForToken('USD');
      clock.set(new Date('2026-08-05T04:00:00.000Z')); // logging day 2026-08-05

      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-05', // the logging date's rate — must win
        rates: { USD: '0.0000500000' },
      });
      await seedDailyRate(app, rateProvider, {
        baseCurrency: 'VND',
        quoteCurrency: 'USD',
        date: '2026-08-01', // the (backdated) Expense Date's rate — must lose
        rate: '0.0000900000',
      });

      const { response } = await createExpense(app, token, {
        originalAmount: '1000000.0000',
        originalCurrency: 'VND',
        expenseDate: '2026-08-01',
      });

      expect(response.status).toBe(201);
      const expense = expenseBody(response);
      expect(expense.expenseDate).toBe('2026-08-01');
      expect(expense.convertedAmount).toBe('50.0000'); // 1,000,000 * 0.00005
    });

    it('falls back to the most recent earlier Daily Rate when none exists on the logging date', async () => {
      const token = await signUpForToken('USD');
      clock.set(new Date('2026-08-10T04:00:00.000Z')); // logging day 2026-08-10, no rate seeded for it

      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-07', // older — must be used
        rates: { USD: '0.0000400000' },
      });
      await seedDailyRate(app, rateProvider, {
        baseCurrency: 'VND',
        quoteCurrency: 'USD',
        date: '2026-08-12', // after the logging date — must NOT be used
        rate: '0.0000900000',
      });

      const { response } = await createExpense(app, token, {
        originalAmount: '1000000.0000',
        originalCurrency: 'VND',
      });

      expect(response.status).toBe(201);
      expect(expenseBody(response).convertedAmount).toBe('40.0000');
    });

    it("keeps the same-currency entry exact identity, never a rate's product", async () => {
      const token = await signUpForToken('USD');
      clock.set(new Date('2026-08-01T10:00:00.000Z'));
      // Every pair carries a deliberately absurd rate: if the USD entry of a
      // USD Expense went through any rate at all, the amount would double.
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'USD',
        date: '2026-08-01',
        rates: Object.fromEntries(
          SUPPORTED_CURRENCIES.filter((c) => c !== 'USD').map((c) => [
            c,
            '2.0000000000',
          ]),
        ),
      });

      const { response } = await createExpense(app, token, {
        originalAmount: '123.4500',
        originalCurrency: 'USD',
      });

      expect(response.status).toBe(201);
      const expense = expenseBody(response);
      expect(expense.originalAmount).toBe('123.4500');
      expect(expense.convertedAmount).toBe('123.4500');
      expect(expense.convertedCurrency).toBe('USD');
    });

    it('fails loudly with 503 when no Daily Rate exists on or before the logging date', async () => {
      const token = await signUpForToken('USD');
      clock.set(new Date('2026-09-01T10:00:00.000Z'));
      // No rate seeded anywhere.

      const { response } = await createExpense(app, token, {
        originalAmount: '1000.0000',
        originalCurrency: 'VND',
      });

      expect(response.status).toBe(503);
      expect(errorMessage(response)).toMatch(/No Daily Rate available/);
    });

    // ADR-0008: the Conversion Snapshot is all-or-nothing. One uncovered
    // pair fails the whole log — even though the pair the owner's own
    // projection needs (VND -> USD) is covered — and persists nothing.
    it('rejects the whole log with 503 when any single pair lacks coverage, persisting nothing', async () => {
      const token = await signUpForToken('USD');
      clock.set(new Date('2026-08-01T10:00:00.000Z'));

      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
        rates: { USD: '0.0000400000' },
        omit: ['THB'], // the one gap
      });

      const { response } = await createExpense(app, token, {
        originalAmount: '1000000.0000',
        originalCurrency: 'VND',
      });

      expect(response.status).toBe(503);
      expect(errorMessage(response)).toMatch(/No Daily Rate available/);
      expect(errorMessage(response)).toMatch(/THB/);

      const list = await request(app.getHttpServer())
        .get('/expenses')
        .set('Authorization', `Bearer ${token}`);
      expect(expenseListBody(list)).toEqual([]);
    });

    // The snapshot's non-preferred entries are invisible through today's API
    // (viewer endpoints arrive with the social tickets), so this one test
    // verifies ADR-0008's persistence contract at the table itself: one row
    // per Supported Currency, each the Original Amount times that pair's
    // exact Daily Rate, rounded to the money columns' 4 decimal places.
    it('freezes one conversion row per Supported Currency at the logging date, exact to 4 decimal places', async () => {
      const token = await signUpForToken('USD');
      clock.set(new Date('2026-08-01T10:00:00.000Z'));

      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'GBP',
        date: '2026-08-01',
        rates: {
          USD: '1.3500000000',
          VND: '35172.1100000000',
          EUR: '1.1700000000',
          JPY: '215.0600000000',
          SGD: '1.7300000000',
          AUD: '1.9100000000',
          CAD: '1.8800000000',
          KRW: '1905.8000000000',
          THB: '44.8300000000',
        },
      });

      const { response } = await createExpense(app, token, {
        originalAmount: '2.0000',
        originalCurrency: 'GBP',
      });
      expect(response.status).toBe(201);
      const { id } = expenseBody(response);

      const rows = await testDb().expenseConversion.findMany({
        where: { expenseId: id },
      });
      const byCurrency = Object.fromEntries(
        rows.map((row) => [row.currency, row.amount.toFixed(4)]),
      );
      expect(byCurrency).toEqual({
        GBP: '2.0000', // identity — exactly as entered
        USD: '2.7000',
        VND: '70344.2200',
        EUR: '2.3400',
        JPY: '430.1200',
        SGD: '3.4600',
        AUD: '3.8200',
        CAD: '3.7600',
        KRW: '3811.6000',
        THB: '89.6600',
      });
      expect(rows).toHaveLength(SUPPORTED_CURRENCIES.length);
    });

    // Decimal safety: 1.005 * 100 is 100.49999999999999 as a JS float, but
    // exactly 100.5 with decimal.js — proving the conversion arithmetic
    // never touches a `number`.
    it('computes the Converted Amount as an exact decimal, not a JS float', async () => {
      const token = await signUpForToken('VND');
      clock.set(new Date('2026-08-01T10:00:00.000Z'));

      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'EUR',
        date: '2026-08-01',
        rates: { VND: '100.0000000000' },
      });

      const { response } = await createExpense(app, token, {
        originalAmount: '1.0050',
        originalCurrency: 'EUR',
      });

      expect(response.status).toBe(201);
      expect(expenseBody(response).convertedAmount).toBe('100.5000');
    });

    // Decimal safety at the money columns' precision boundary: 16 integer
    // digits and 4 decimal places (Decimal(20, 4)) round-trip exactly.
    it('round-trips a large VND amount at the Decimal(20,4) boundary exactly', async () => {
      const token = await signUpForToken('VND');
      clock.set(new Date('2026-08-01T10:00:00.000Z'));
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
      });

      const { response } = await createExpense(app, token, {
        originalAmount: '9999999999999999.9999',
        originalCurrency: 'VND',
      });

      expect(response.status).toBe(201);
      const expense = expenseBody(response);
      expect(expense.originalAmount).toBe('9999999999999999.9999');
      expect(expense.convertedAmount).toBe('9999999999999999.9999');
    });

    it.each([
      ['2026-08-01T02:00:00.000Z', '2026-08-01'], // 09:00 +07:00 — same UTC day
      ['2026-08-12T17:30:00.000Z', '2026-08-13'], // 00:30 +07:00 next day — UTC/app-tz dates differ
    ])(
      'defaults the Expense Date to the logging day in Asia/Ho_Chi_Minh (clock %s -> %s)',
      async (instant, expectedExpenseDate) => {
        const token = await signUpForToken('VND');
        clock.set(new Date(instant));
        await seedDailyRatesFromBase(app, rateProvider, {
          baseCurrency: 'VND',
          date: '2026-08-01', // at-or-before both logging days
        });

        const { response } = await createExpense(app, token, {
          originalCurrency: 'VND',
        });

        expect(response.status).toBe(201);
        expect(expenseBody(response).expenseDate).toBe(expectedExpenseDate);
      },
    );

    it('accepts an explicit backdated Expense Date', async () => {
      const token = await signUpForToken('VND');
      clock.set(new Date('2026-08-12T10:00:00.000Z'));
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
      });

      const { response } = await createExpense(app, token, {
        originalCurrency: 'VND',
        expenseDate: '2026-01-15',
      });

      expect(response.status).toBe(201);
      expect(expenseBody(response).expenseDate).toBe('2026-01-15');
    });

    it('rejects an unknown Category slug', async () => {
      const token = await signUpForToken();
      const { response } = await createExpense(app, token, {
        category: 'crypto',
      });
      expect(response.status).toBe(400);
      expect(errorMessage(response)).toMatch(/category/i);
    });

    it('rejects an unknown Visibility', async () => {
      const token = await signUpForToken();
      const { response } = await createExpense(app, token, {
        visibility: 'friends-only',
      });
      expect(response.status).toBe(400);
      expect(errorMessage(response)).toMatch(/visibility/i);
    });

    it('rejects an unsupported currency', async () => {
      const token = await signUpForToken();
      const { response } = await createExpense(app, token, {
        originalCurrency: 'XXX',
      });
      expect(response.status).toBe(400);
      expect(errorMessage(response)).toMatch(/originalCurrency/i);
    });

    it.each([
      ['0', 'zero'],
      ['0.0000', 'zero with decimals'],
      ['-5.00', 'negative'],
      ['12.34567', 'too many decimal places'],
      ['abc', 'non-numeric'],
      ['1e5', 'scientific notation'],
      ['', 'empty'],
    ])('rejects a malformed originalAmount: %s (%s)', async (amount) => {
      const token = await signUpForToken();
      const { response } = await createExpense(app, token, {
        originalAmount: amount,
      });
      expect(response.status).toBe(400);
      expect(errorMessage(response)).toMatch(/originalAmount/i);
    });

    it('rejects originalAmount sent as a JSON number rather than a string', async () => {
      const token = await signUpForToken();
      const body = { ...validCreateExpenseBody(), originalAmount: 45000 };

      const response = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send(body);

      expect(response.status).toBe(400);
    });

    it('rejects a syntactically invalid expenseDate', async () => {
      const token = await signUpForToken();
      const { response } = await createExpense(app, token, {
        expenseDate: '2026-13-40',
      });
      expect(response.status).toBe(400);
      expect(errorMessage(response)).toMatch(/expenseDate/i);
    });

    it('renders a shorter-scale Original Amount at the column scale, same value', async () => {
      // "Exactly as entered" is value-exact, not byte-exact: amounts render
      // at the Decimal(20, 4) columns' fixed scale so a client never has to
      // guess how many decimal places it got. Same currency, so no rate
      // touches the asserted entries and only the scaling is under test.
      const token = await signUpForToken('VND');
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
      });

      const { response } = await createExpense(app, token, {
        originalAmount: '45000',
        originalCurrency: 'VND',
      });

      expect(response.status).toBe(201);
      expect(expenseBody(response)).toMatchObject({
        originalAmount: '45000.0000',
        convertedAmount: '45000.0000',
      });
    });
  });

  describe('GET /expenses', () => {
    it('rejects a request with no token', async () => {
      await request(app.getHttpServer()).get('/expenses').expect(401);
    });

    it("lists the owner's own Expenses across every Visibility, newest logged first", async () => {
      const token = await signUpForToken('VND');
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
      });

      clock.set(new Date('2026-08-01T10:00:00.000Z'));
      const { body: first } = await createExpense(app, token, {
        description: 'first (private)',
        originalCurrency: 'VND',
        visibility: 'private',
      });

      clock.set(new Date('2026-08-02T10:00:00.000Z'));
      const { body: second } = await createExpense(app, token, {
        description: 'second (friend_only)',
        originalCurrency: 'VND',
        visibility: 'friend_only',
      });

      clock.set(new Date('2026-08-03T10:00:00.000Z'));
      const { body: third } = await createExpense(app, token, {
        description: 'third (public)',
        originalCurrency: 'VND',
        visibility: 'public',
      });

      const response = await request(app.getHttpServer())
        .get('/expenses')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const expenses = expenseListBody(response);
      expect(expenses.map((e) => e.description)).toEqual([
        third.description,
        second.description,
        first.description,
      ]);
      expect(expenses.map((e) => e.visibility)).toEqual([
        'public',
        'friend_only',
        'private',
      ]);
    });

    it("never returns another User's Expenses", async () => {
      const ownerToken = await signUpForToken('VND');
      const strangerToken = await signUpForToken('VND');
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
      });

      clock.set(new Date('2026-08-01T10:00:00.000Z'));
      await createExpense(app, ownerToken, {
        description: "owner's expense",
        originalCurrency: 'VND',
      });
      await createExpense(app, strangerToken, {
        description: "stranger's expense",
        originalCurrency: 'VND',
      });

      const response = await request(app.getHttpServer())
        .get('/expenses')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      const expenses = expenseListBody(response);
      expect(expenses).toHaveLength(1);
      expect(expenses[0]?.description).toBe("owner's expense");
    });

    it('states both amounts and both currencies explicitly on every listed Expense', async () => {
      // The owner prefers USD and spends in VND, so Original and Converted
      // differ in both amount and currency — a list response that dropped
      // either currency, or echoed one amount for both, fails here.
      const token = await signUpForToken('USD');
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
        rates: { USD: '0.0000400000' },
      });

      await createExpense(app, token, {
        description: 'Phở',
        originalAmount: '50000.0000',
        originalCurrency: 'VND',
      });

      const response = await request(app.getHttpServer())
        .get('/expenses')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const [expense] = expenseListBody(response);
      expect(expense).toMatchObject({
        originalAmount: '50000.0000',
        originalCurrency: 'VND',
        convertedAmount: '2.0000',
        convertedCurrency: 'USD',
      });
    });

    it('keeps the Converted Amount frozen when a later Daily Rate arrives', async () => {
      // ADR-0001: the Converted Amount is frozen at logging time. Re-reading
      // the Expense after the rate moves must return the amount computed on
      // the logging date, not one recomputed at read time.
      const token = await signUpForToken('USD');
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
        rates: { USD: '0.0000400000' },
      });

      const { response: created } = await createExpense(app, token, {
        originalAmount: '50000.0000',
        originalCurrency: 'VND',
      });
      expect(expenseBody(created).convertedAmount).toBe('2.0000');

      // The rate doubles four days later, and "now" moves with it.
      await seedDailyRate(app, rateProvider, {
        baseCurrency: 'VND',
        quoteCurrency: 'USD',
        date: '2026-08-05',
        rate: '0.0000800000',
      });
      clock.set(new Date('2026-08-05T10:00:00.000Z'));

      const response = await request(app.getHttpServer())
        .get('/expenses')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      // 4.0000 would mean the read path reconverted at today's rate.
      expect(expenseListBody(response)[0]?.convertedAmount).toBe('2.0000');
    });

    // ADR-0008's payoff: a Preferred Currency change is a pure read-path
    // switch. The same Expense re-projects from its frozen snapshot — the
    // VND entry it got at logging time — with no recompute and no rate
    // lookup on read. The currency flip is arranged directly on the users
    // table because no API updates Preferred Currency yet (a later ticket).
    it("projects the frozen entry for the owner's new Preferred Currency after a switch, without recomputing", async () => {
      const { response: signedUp } = await signUp(app, {
        preferredCurrency: 'USD',
      });
      const { accessToken: token, user } = authBody(signedUp);

      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'GBP',
        date: '2026-08-01',
        rates: { USD: '1.3500000000', VND: '35000.0000000000' },
      });
      await createExpense(app, token, {
        originalAmount: '2.0000',
        originalCurrency: 'GBP',
      });

      // A moved VND rate that a read-time reconversion would pick up.
      await seedDailyRate(app, rateProvider, {
        baseCurrency: 'GBP',
        quoteCurrency: 'VND',
        date: '2026-08-05',
        rate: '90000.0000000000',
      });
      clock.set(new Date('2026-08-05T10:00:00.000Z'));
      await testDb().user.update({
        where: { id: user.id },
        data: { preferredCurrency: 'VND' },
      });

      const response = await request(app.getHttpServer())
        .get('/expenses')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(expenseListBody(response)[0]).toMatchObject({
        convertedAmount: '70000.0000', // 2 GBP * 35,000 — the frozen entry
        convertedCurrency: 'VND',
      });
    });

    it('returns an empty list for an owner with no Expenses', async () => {
      const token = await signUpForToken();

      const response = await request(app.getHttpServer())
        .get('/expenses')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(expenseListBody(response)).toEqual([]);
    });
  });

  describe('PATCH /expenses/:id', () => {
    it('rejects a request with no token', async () => {
      await request(app.getHttpServer())
        .patch('/expenses/some-id')
        .send({ description: 'renamed' })
        .expect(401);
    });

    it('edits every editable field and returns the updated Expense', async () => {
      const token = await signUpForToken('VND');
      clock.set(new Date('2026-08-01T10:00:00.000Z'));
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
      });

      const { response: created } = await createExpense(app, token, {
        description: 'Coffee',
        originalAmount: '45000.0000',
        originalCurrency: 'VND',
        category: 'food',
        visibility: 'private',
      });
      const original = expenseBody(created);

      const response = await request(app.getHttpServer())
        .patch(`/expenses/${original.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'Dinner out',
          category: 'leisure',
          visibility: 'public',
          expenseDate: '2026-07-15',
        });

      expect(response.status).toBe(200);
      const updated = expenseBody(response);
      expect(updated).toMatchObject({
        id: original.id,
        description: 'Dinner out',
        originalAmount: '45000.0000',
        originalCurrency: 'VND',
        convertedAmount: '45000.0000',
        convertedCurrency: 'VND',
        category: 'leisure',
        visibility: 'public',
        expenseDate: '2026-07-15',
      });
      // Logged At is immutable — an edit never moves the conversion anchor.
      expect(updated.loggedAt).toBe(original.loggedAt);
    });

    // ADR-0008: the Original Amount is immutable after logging — fixing it
    // means delete + re-log. The whitelist rejects both fields outright.
    it.each([
      [{ originalAmount: '2000000.0000' }, /originalAmount/i],
      [{ originalCurrency: 'EUR' }, /originalCurrency/i],
    ])(
      'rejects an edit of the immutable Original Amount: %o',
      async (body, field) => {
        const token = await signUpForToken('USD');
        clock.set(new Date('2026-08-01T10:00:00.000Z'));
        await seedDailyRatesFromBase(app, rateProvider, {
          baseCurrency: 'VND',
          date: '2026-08-01',
          rates: { USD: '0.0000400000' },
        });

        const { response: created } = await createExpense(app, token, {
          originalAmount: '1000000.0000',
          originalCurrency: 'VND',
        });
        const original = expenseBody(created);

        const response = await request(app.getHttpServer())
          .patch(`/expenses/${original.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(body);

        expect(response.status).toBe(400);
        expect(errorMessage(response)).toMatch(field);

        // The Expense is exactly as logged — amount, currency, conversion.
        const list = await request(app.getHttpServer())
          .get('/expenses')
          .set('Authorization', `Bearer ${token}`);
        expect(expenseListBody(list)[0]).toMatchObject({
          originalAmount: '1000000.0000',
          originalCurrency: 'VND',
          convertedAmount: '40.0000',
          convertedCurrency: 'USD',
        });
      },
    );

    it('moves the Expense Date without changing the Converted Amount', async () => {
      const token = await signUpForToken('USD');
      clock.set(new Date('2026-08-01T10:00:00.000Z'));

      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
        rates: { USD: '0.0000400000' },
      });

      const { response: created } = await createExpense(app, token, {
        originalAmount: '1000000.0000',
        originalCurrency: 'VND',
      });
      const original = expenseBody(created);
      expect(original.expenseDate).toBe('2026-08-01');

      // A rate on the new Expense Date that must NOT be consulted.
      await seedDailyRate(app, rateProvider, {
        baseCurrency: 'VND',
        quoteCurrency: 'USD',
        date: '2026-07-01',
        rate: '0.0000900000',
      });

      const response = await request(app.getHttpServer())
        .patch(`/expenses/${original.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ expenseDate: '2026-07-01' });

      expect(response.status).toBe(200);
      const updated = expenseBody(response);
      expect(updated.expenseDate).toBe('2026-07-01');
      expect(updated.convertedAmount).toBe(original.convertedAmount);
    });

    it("returns 404 for another User's Expense and leaves it untouched", async () => {
      const ownerToken = await signUpForToken('VND');
      const strangerToken = await signUpForToken('VND');
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
      });

      const { response: created } = await createExpense(app, ownerToken, {
        description: 'mine',
        originalCurrency: 'VND',
      });
      const original = expenseBody(created);

      await request(app.getHttpServer())
        .patch(`/expenses/${original.id}`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({ description: 'hijacked' })
        .expect(404);

      const list = await request(app.getHttpServer())
        .get('/expenses')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(expenseListBody(list)[0]?.description).toBe('mine');
    });

    it('returns 404 for an Expense that does not exist', async () => {
      const token = await signUpForToken();
      await request(app.getHttpServer())
        .patch('/expenses/00000000-0000-7000-8000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'ghost' })
        .expect(404);
    });

    it('rejects the same malformed values create rejects', async () => {
      const token = await signUpForToken('VND');
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
      });
      const { response: created } = await createExpense(app, token, {
        originalCurrency: 'VND',
      });
      const { id } = expenseBody(created);

      for (const [body, field] of [
        [{ category: 'crypto' }, /category/i],
        [{ visibility: 'friends-only' }, /visibility/i],
        [{ expenseDate: '2026-13-40' }, /expenseDate/i],
        [{ description: '' }, /description/i],
      ] as const) {
        const response = await request(app.getHttpServer())
          .patch(`/expenses/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(body);
        expect(response.status).toBe(400);
        expect(errorMessage(response)).toMatch(field);
      }
    });

    it('accepts an empty body as a no-op edit', async () => {
      const token = await signUpForToken('VND');
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
      });
      const { response: created } = await createExpense(app, token, {
        originalCurrency: 'VND',
      });
      const original = expenseBody(created);

      const response = await request(app.getHttpServer())
        .patch(`/expenses/${original.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(expenseBody(response)).toEqual(original);
    });
  });

  describe('DELETE /expenses/:id', () => {
    it('rejects a request with no token', async () => {
      await request(app.getHttpServer())
        .delete('/expenses/some-id')
        .expect(401);
    });

    it('deletes an Expense so it is gone from the list, leaving others alone', async () => {
      const token = await signUpForToken('VND');
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
      });

      const { response: first } = await createExpense(app, token, {
        description: 'keep me',
        originalCurrency: 'VND',
      });
      const { response: second } = await createExpense(app, token, {
        description: 'delete me',
        originalCurrency: 'VND',
      });
      const doomed = expenseBody(second);

      const response = await request(app.getHttpServer())
        .delete(`/expenses/${doomed.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      const list = await request(app.getHttpServer())
        .get('/expenses')
        .set('Authorization', `Bearer ${token}`);
      const remaining = expenseListBody(list);
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe(expenseBody(first).id);
    });

    it("returns 404 for another User's Expense and leaves it in place", async () => {
      const ownerToken = await signUpForToken('VND');
      const strangerToken = await signUpForToken('VND');
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
      });

      const { response: created } = await createExpense(app, ownerToken, {
        originalCurrency: 'VND',
      });
      const { id } = expenseBody(created);

      await request(app.getHttpServer())
        .delete(`/expenses/${id}`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404);

      const list = await request(app.getHttpServer())
        .get('/expenses')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(expenseListBody(list)).toHaveLength(1);
    });

    it('returns 404 for an Expense that does not exist, including one already deleted', async () => {
      const token = await signUpForToken('VND');
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
      });
      const { response: created } = await createExpense(app, token, {
        originalCurrency: 'VND',
      });
      const { id } = expenseBody(created);

      await request(app.getHttpServer())
        .delete(`/expenses/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .delete(`/expenses/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
