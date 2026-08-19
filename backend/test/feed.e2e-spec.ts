import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './helpers/app';
import { signUp } from './helpers/auth';
import { FixedClock } from './helpers/clock';
import { FakeDailyRateProvider } from './helpers/daily-rate-provider';
import { seedDailyRatesFromBase } from './helpers/daily-rates';
import { createExpense } from './helpers/expenses';
import { authBody, feedPageBody, type FeedPageBody } from './helpers/http';

/**
 * The instant every test starts pinned to: 2026-08-05T10:00:00.000Z is
 * 2026-08-05 (Wednesday) in Asia/Ho_Chi_Minh too (+07:00) — same baseline as
 * test/leaderboard.e2e-spec.ts.
 */
const BASELINE_NOW = new Date('2026-08-05T10:00:00.000Z');
const LOGGING_DATE = '2026-08-05';

interface Actor {
  token: string;
  id: string;
  username: string;
  displayName: string;
}

describe('feed', () => {
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

  async function newActor(
    overrides: Partial<{ username: string; preferredCurrency: string }> = {},
  ): Promise<Actor> {
    const { response, body } = await signUp(app, overrides);
    const auth = authBody(response);
    return {
      token: auth.accessToken,
      id: auth.user.id,
      username: body.username,
      displayName: body.displayName,
    };
  }

  function getFeed(actor: Actor, query: Record<string, string> = {}) {
    return request(app.getHttpServer())
      .get('/feed')
      .query(query)
      .set('Authorization', `Bearer ${actor.token}`);
  }

  async function seedVndRates(date: string = LOGGING_DATE): Promise<void> {
    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'VND',
      date,
    });
  }

  it('rejects a request with no token', async () => {
    await request(app.getHttpServer()).get('/feed').expect(401);
  });

  it('(a) shows only Public Expenses, across owners, with no Friendship required', async () => {
    await seedVndRates();
    const alice = await newActor();
    const bob = await newActor();

    await createExpense(app, alice.token, {
      description: 'alice private',
      visibility: 'private',
      expenseDate: LOGGING_DATE,
    });
    await createExpense(app, alice.token, {
      description: 'alice friend only',
      visibility: 'friend_only',
      expenseDate: LOGGING_DATE,
    });
    await createExpense(app, alice.token, {
      description: 'alice public',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });
    await createExpense(app, bob.token, {
      description: 'bob private',
      visibility: 'private',
      expenseDate: LOGGING_DATE,
    });
    await createExpense(app, bob.token, {
      description: 'bob public',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });

    // A stranger to both alice and bob — no Friendship anywhere.
    const stranger = await newActor();
    const page = feedPageBody(await getFeed(stranger));

    expect(page.items.map((item) => item.description).sort()).toEqual(
      ['alice public', 'bob public'].sort(),
    );
    expect(JSON.stringify(page)).not.toContain('private');
    expect(JSON.stringify(page)).not.toContain('friend only');
  });

  it('(b) orders items newest-first by Logged At', async () => {
    await seedVndRates();
    const owner = await newActor();

    clock.set(new Date('2026-08-05T10:00:00.000Z'));
    await createExpense(app, owner.token, {
      description: 'first',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });
    clock.set(new Date('2026-08-05T10:00:01.000Z'));
    await createExpense(app, owner.token, {
      description: 'second',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });
    clock.set(new Date('2026-08-05T10:00:02.000Z'));
    await createExpense(app, owner.token, {
      description: 'third',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });

    const page = feedPageBody(await getFeed(owner));

    expect(page.items.map((item) => item.description)).toEqual([
      'third',
      'second',
      'first',
    ]);
  });

  it("(c) shows the Original Amount plus the frozen Conversion Snapshot entry for the caller's Preferred Currency, unaffected by a later Daily Rate publication (ADR-0008)", async () => {
    const viewer = await newActor({ preferredCurrency: 'VND' });
    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'USD',
      date: LOGGING_DATE,
      rates: { VND: '25000.0000000000' },
    });

    await createExpense(app, viewer.token, {
      originalAmount: '10.0000',
      originalCurrency: 'USD',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });

    const before = feedPageBody(await getFeed(viewer));
    expect(before.items).toHaveLength(1);
    expect(before.items[0]).toMatchObject({
      originalAmount: '10.0000',
      originalCurrency: 'USD',
      convertedAmount: '250000.0000',
      convertedCurrency: 'VND',
    });

    // Publish a very different rate for a later date — the already-frozen
    // snapshot must not move.
    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'USD',
      date: '2026-08-06',
      rates: { VND: '99999.0000000000' },
    });

    const after = feedPageBody(await getFeed(viewer));
    expect(after.items[0].convertedAmount).toBe('250000.0000');
  });

  it("(e) includes the caller's own Public Expenses", async () => {
    await seedVndRates();
    const owner = await newActor();

    await createExpense(app, owner.token, {
      description: 'my own public spend',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });

    const page = feedPageBody(await getFeed(owner));

    expect(page.items.map((item) => item.description)).toContain(
      'my own public spend',
    );
    expect(page.items[0].owner).toEqual({
      username: owner.username,
      displayName: owner.displayName,
    });
  });

  it('(g) two viewers with different Preferred Currencies see different convertedCurrency for the same Expense', async () => {
    const owner = await newActor({ preferredCurrency: 'USD' });
    const viewerVnd = await newActor({ preferredCurrency: 'VND' });
    const viewerEur = await newActor({ preferredCurrency: 'EUR' });

    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'USD',
      date: LOGGING_DATE,
      rates: { VND: '25000.0000000000', EUR: '0.9000000000' },
    });

    await createExpense(app, owner.token, {
      originalAmount: '10.0000',
      originalCurrency: 'USD',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });

    const vndPage = feedPageBody(await getFeed(viewerVnd));
    expect(vndPage.items[0].convertedCurrency).toBe('VND');
    expect(vndPage.items[0].convertedAmount).toBe('250000.0000');

    const eurPage = feedPageBody(await getFeed(viewerEur));
    expect(eurPage.items[0].convertedCurrency).toBe('EUR');
    expect(eurPage.items[0].convertedAmount).toBe('9.0000');
  });

  it('(h) excludes Public Expenses from a User the viewer blocked', async () => {
    await seedVndRates();
    const owner = await newActor();
    const viewer = await newActor();
    await createExpense(app, owner.token, {
      description: 'blocked owner public spend',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });

    await request(app.getHttpServer())
      .post('/blocks')
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({ username: owner.username });

    const page = feedPageBody(await getFeed(viewer));

    expect(page.items).toEqual([]);
  });

  it('(i) excludes Public Expenses from a User who blocked the viewer', async () => {
    await seedVndRates();
    const owner = await newActor();
    const viewer = await newActor();
    await createExpense(app, owner.token, {
      description: 'blocker owner public spend',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });

    await request(app.getHttpServer())
      .post('/blocks')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ username: viewer.username });

    const page = feedPageBody(await getFeed(viewer));

    expect(page.items).toEqual([]);
  });

  describe('(f) limit and cursor validation', () => {
    it('400s on limit=0', async () => {
      const viewer = await newActor();
      const response = await getFeed(viewer, { limit: '0' });
      expect(response.status).toBe(400);
    });

    it('400s on limit above 50', async () => {
      const viewer = await newActor();
      const response = await getFeed(viewer, { limit: '51' });
      expect(response.status).toBe(400);
    });

    it('400s on a non-numeric limit', async () => {
      const viewer = await newActor();
      const response = await getFeed(viewer, { limit: 'lots' });
      expect(response.status).toBe(400);
    });

    it('defaults to a limit of 20 when omitted', async () => {
      await seedVndRates();
      const owner = await newActor();
      for (let i = 0; i < 25; i += 1) {
        clock.set(new Date(BASELINE_NOW.getTime() + i * 1000));
        await createExpense(app, owner.token, {
          description: `spend ${i}`,
          visibility: 'public',
          expenseDate: LOGGING_DATE,
        });
      }

      const page = feedPageBody(await getFeed(owner));
      expect(page.items).toHaveLength(20);
      expect(page.nextCursor).not.toBeNull();
    });

    it('400s on a malformed cursor', async () => {
      const viewer = await newActor();
      const response = await getFeed(viewer, { cursor: 'not-a-real-cursor' });
      expect(response.status).toBe(400);
    });

    it('400s on a cursor that base64url-decodes but has no valid shape', async () => {
      const viewer = await newActor();
      const bogus = Buffer.from('garbage-with-no-separator', 'utf8').toString(
        'base64url',
      );
      const response = await getFeed(viewer, { cursor: bogus });
      expect(response.status).toBe(400);
    });
  });

  describe('(d) keyset pagination', () => {
    it('pages exactly with no duplicates or gaps, and is stable when a new Expense is logged between page 1 and page 2', async () => {
      await seedVndRates();
      const owner = await newActor();

      const descriptions = ['e1', 'e2', 'e3', 'e4', 'e5'];
      for (const [index, description] of descriptions.entries()) {
        clock.set(new Date(BASELINE_NOW.getTime() + index * 1000));
        await createExpense(app, owner.token, {
          description,
          visibility: 'public',
          expenseDate: LOGGING_DATE,
        });
      }
      // Newest-first order is e5, e4, e3, e2, e1.

      const page1 = feedPageBody(await getFeed(owner, { limit: '2' }));
      expect(page1.items.map((i) => i.description)).toEqual(['e5', 'e4']);
      expect(page1.nextCursor).not.toBeNull();

      // A brand-new Expense, newer than everything above, logged between
      // fetching page 1 and page 2 — an offset cursor would shift page 2 by
      // one; the keyset cursor must not.
      clock.set(new Date(BASELINE_NOW.getTime() + 60_000));
      await createExpense(app, owner.token, {
        description: 'e6-inserted-later',
        visibility: 'public',
        expenseDate: LOGGING_DATE,
      });

      const page2 = feedPageBody(
        await getFeed(owner, { limit: '2', cursor: page1.nextCursor! }),
      );
      expect(page2.items.map((i) => i.description)).toEqual(['e3', 'e2']);
      expect(page2.nextCursor).not.toBeNull();

      const page3 = feedPageBody(
        await getFeed(owner, { limit: '2', cursor: page2.nextCursor! }),
      );
      expect(page3.items.map((i) => i.description)).toEqual(['e1']);
      expect(page3.nextCursor).toBeNull();

      // No duplicates or gaps across the three original pages.
      const seen = [...page1.items, ...page2.items, ...page3.items].map(
        (i) => i.id,
      );
      expect(new Set(seen).size).toBe(seen.length);
      expect(seen).toHaveLength(5);

      // The newly inserted Expense appears at the head of a fresh read, and
      // nowhere inside the already-fetched pages.
      const fresh = feedPageBody(await getFeed(owner, { limit: '50' }));
      expect(fresh.items.map((i) => i.description)).toEqual([
        'e6-inserted-later',
        'e5',
        'e4',
        'e3',
        'e2',
        'e1',
      ]);
      expect(page2.items.map((i) => i.description)).not.toContain(
        'e6-inserted-later',
      );
    });

    it('nextCursor is null once the last page is short of the limit', async () => {
      await seedVndRates();
      const owner = await newActor();
      await createExpense(app, owner.token, {
        description: 'only one',
        visibility: 'public',
        expenseDate: LOGGING_DATE,
      });

      const page = feedPageBody(await getFeed(owner, { limit: '20' }));
      expect(page.items).toHaveLength(1);
      expect(page.nextCursor).toBeNull();
    });

    it('an empty Feed returns an empty page with a null cursor', async () => {
      const viewer = await newActor();
      const page: FeedPageBody = feedPageBody(await getFeed(viewer));
      expect(page.items).toEqual([]);
      expect(page.nextCursor).toBeNull();
    });
  });
});
