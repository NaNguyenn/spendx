import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './helpers/app';
import { signUp } from './helpers/auth';
import { FixedClock } from './helpers/clock';
import { FakeDailyRateProvider } from './helpers/daily-rate-provider';
import { seedDailyRatesFromBase } from './helpers/daily-rates';
import { createExpense } from './helpers/expenses';
import {
  authBody,
  expenseListBody,
  friendRequestBody,
  leaderboardBody,
  type LeaderboardBody,
} from './helpers/http';

/**
 * The instant every test starts pinned to: 2026-08-05T10:00:00.000Z is
 * 2026-08-05 (Wednesday) in Asia/Ho_Chi_Minh too (+07:00, 17:00 local) —
 * mid-week, same baseline as test/statistics.e2e-spec.ts.
 *
 * Current ISO week: 2026-08-03 (Mon) .. 2026-08-09 (Sun).
 * Current month:    2026-08-01 .. 2026-08-31.
 *
 * A past anchor (2026-07-15, also a Wednesday) is used to prove past
 * Periods are browsable:
 * Its ISO week: 2026-07-13 (Mon) .. 2026-07-19 (Sun).
 * Its month:    2026-07-01 .. 2026-07-31.
 */
const BASELINE_NOW = new Date('2026-08-05T10:00:00.000Z');
const LOGGING_DATE = '2026-08-05';
const PAST_ANCHOR = '2026-07-15';

interface Actor {
  token: string;
  id: string;
  username: string;
  displayName: string;
}

describe('leaderboard', () => {
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

  function sendFriendRequest(from: Actor, toUsername: string) {
    return request(app.getHttpServer())
      .post('/friend-requests')
      .set('Authorization', `Bearer ${from.token}`)
      .send({ username: toUsername });
  }

  function acceptFriendRequest(actor: Actor, requestId: string) {
    return request(app.getHttpServer())
      .post(`/friend-requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${actor.token}`);
  }

  /** Sends a Friend Request from `a` to `b` and has `b` accept it. */
  async function becomeFriends(a: Actor, b: Actor): Promise<void> {
    const sent = await sendFriendRequest(a, b.username);
    const requestId = friendRequestBody(sent).id;
    await acceptFriendRequest(b, requestId);
  }

  function getLeaderboard(actor: Actor, query: Record<string, string> = {}) {
    return request(app.getHttpServer())
      .get('/leaderboard')
      .query(query)
      .set('Authorization', `Bearer ${actor.token}`);
  }

  function getFriendExpenses(
    actor: Actor,
    username: string,
    query: Record<string, string> = {},
  ) {
    return request(app.getHttpServer())
      .get(`/users/${username}/expenses`)
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
    await request(app.getHttpServer()).get('/leaderboard').expect(401);
  });

  it('excludes a former Friend the viewer blocked from the Leaderboard', async () => {
    await seedVndRates();
    const viewer = await newActor({ preferredCurrency: 'VND' });
    const blockedFriend = await newActor({ username: 'blockedfriend' });
    await becomeFriends(viewer, blockedFriend);
    await createExpense(app, blockedFriend.token, {
      originalAmount: '500000.0000',
      originalCurrency: 'VND',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });

    await request(app.getHttpServer())
      .post('/blocks')
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({ username: blockedFriend.username });

    const board = leaderboardBody(await getLeaderboard(viewer));

    expect(board.rows.map((row) => row.user.username)).toEqual([
      viewer.username,
    ]);
  });

  it('excludes a former Friend who blocked the viewer from the Leaderboard', async () => {
    await seedVndRates();
    const viewer = await newActor({ preferredCurrency: 'VND' });
    const blockingFriend = await newActor({ username: 'blockingfriend' });
    await becomeFriends(viewer, blockingFriend);
    await createExpense(app, blockingFriend.token, {
      originalAmount: '500000.0000',
      originalCurrency: 'VND',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });

    await request(app.getHttpServer())
      .post('/blocks')
      .set('Authorization', `Bearer ${blockingFriend.token}`)
      .send({ username: viewer.username });

    const board = leaderboardBody(await getLeaderboard(viewer));

    expect(board.rows.map((row) => row.user.username)).toEqual([
      viewer.username,
    ]);
  });

  it('400s on an invalid period', async () => {
    const viewer = await newActor();
    const response = await getLeaderboard(viewer, { period: 'day' });
    expect(response.status).toBe(400);
  });

  it('400s on an invalid anchor', async () => {
    const viewer = await newActor();
    const response = await getLeaderboard(viewer, { anchor: '2026-13-40' });
    expect(response.status).toBe(400);
  });

  it('ranks the viewer and every Friend by Shareable Spend, highest first, zero-filling Friends with no matching Expenses, and includes a User with no Friends as just their own row', async () => {
    await seedVndRates();
    const viewer = await newActor({ preferredCurrency: 'VND' });
    const friendHigh = await newActor({ username: 'friendhigh' });
    const bob = await newActor({ username: 'bob' });
    const zara = await newActor({ username: 'zara' });
    const friendZero = await newActor({ username: 'friendzero' });
    await becomeFriends(viewer, friendHigh);
    await becomeFriends(viewer, bob);
    await becomeFriends(viewer, zara);
    await becomeFriends(viewer, friendZero);

    await createExpense(app, viewer.token, {
      originalAmount: '10000.0000',
      originalCurrency: 'VND',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });
    await createExpense(app, friendHigh.token, {
      originalAmount: '500000.0000',
      originalCurrency: 'VND',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });
    await createExpense(app, bob.token, {
      originalAmount: '5000.0000',
      originalCurrency: 'VND',
      visibility: 'friend_only',
      expenseDate: LOGGING_DATE,
    });
    await createExpense(app, zara.token, {
      originalAmount: '5000.0000',
      originalCurrency: 'VND',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });
    // friendZero: no Expenses at all.

    const response = await getLeaderboard(viewer);

    expect(response.status).toBe(200);
    const board = leaderboardBody(response);
    expect(board.period).toBe('week');
    expect(board.start).toBe('2026-08-03');
    expect(board.end).toBe('2026-08-09');
    expect(board.currency).toBe('VND');
    expect(board.rows).toHaveLength(5);
    expect(
      board.rows.map((row) => [row.user.username, row.total, row.isViewer]),
    ).toEqual([
      [friendHigh.username, '500000.0000', false],
      [viewer.username, '10000.0000', true],
      // bob and zara tie at 5000.0000 — tie-break by Username ascending.
      ['bob', '5000.0000', false],
      ['zara', '5000.0000', false],
      [friendZero.username, '0.0000', false],
    ]);

    const zeroRow = board.rows.find((r) => r.user.username === 'friendzero')!;
    expect(zeroRow.categories.every((c) => c.total === '0.0000')).toBe(true);

    // A User with no Friends at all gets just their own row.
    const lonely = await newActor({ username: 'lonely' });
    const lonelyBoard = leaderboardBody(await getLeaderboard(lonely));
    expect(lonelyBoard.rows).toHaveLength(1);
    expect(lonelyBoard.rows[0]).toMatchObject({
      user: { username: lonely.username },
      isViewer: true,
      total: '0.0000',
    });
  });

  it("shows only Shareable Spend for the viewer's own row: a Private Expense is excluded from their own total", async () => {
    await seedVndRates();
    const viewer = await newActor();

    await createExpense(app, viewer.token, {
      originalAmount: '99999.0000',
      originalCurrency: 'VND',
      visibility: 'private',
      expenseDate: LOGGING_DATE,
    });
    await createExpense(app, viewer.token, {
      originalAmount: '1000.0000',
      originalCurrency: 'VND',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });

    const response = await getLeaderboard(viewer);

    const board = leaderboardBody(response);
    expect(board.rows).toHaveLength(1);
    expect(board.rows[0].total).toBe('1000.0000');
    expect(response.text).not.toContain('99999');
  });

  it('defaults to the current ISO week', async () => {
    const viewer = await newActor();
    const board = leaderboardBody(await getLeaderboard(viewer));
    expect(board.period).toBe('week');
    expect(board.start).toBe('2026-08-03');
    expect(board.end).toBe('2026-08-09');
  });

  it('switches to the current calendar month with ?period=month', async () => {
    const viewer = await newActor();
    const board = leaderboardBody(
      await getLeaderboard(viewer, { period: 'month' }),
    );
    expect(board.period).toBe('month');
    expect(board.start).toBe('2026-08-01');
    expect(board.end).toBe('2026-08-31');
  });

  it('browses a past ISO week via ?anchor, returning that Period’s totals', async () => {
    await seedVndRates();
    const viewer = await newActor();
    await createExpense(app, viewer.token, {
      originalAmount: '4000.0000',
      originalCurrency: 'VND',
      visibility: 'public',
      expenseDate: PAST_ANCHOR, // inside the past week, logged "today"
    });
    // Also log one dated in the current week, to prove it's excluded.
    await createExpense(app, viewer.token, {
      originalAmount: '9000.0000',
      originalCurrency: 'VND',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });

    const board = leaderboardBody(
      await getLeaderboard(viewer, { anchor: PAST_ANCHOR }),
    );
    expect(board.period).toBe('week');
    expect(board.start).toBe('2026-07-13');
    expect(board.end).toBe('2026-07-19');
    expect(board.rows[0].total).toBe('4000.0000');
  });

  it('browses a past calendar month via ?period=month&anchor', async () => {
    await seedVndRates();
    const viewer = await newActor();
    await createExpense(app, viewer.token, {
      originalAmount: '7000.0000',
      originalCurrency: 'VND',
      visibility: 'public',
      expenseDate: PAST_ANCHOR,
    });

    const board = leaderboardBody(
      await getLeaderboard(viewer, { period: 'month', anchor: PAST_ANCHOR }),
    );
    expect(board.period).toBe('month');
    expect(board.start).toBe('2026-07-01');
    expect(board.end).toBe('2026-07-31');
    expect(board.rows[0].total).toBe('7000.0000');
  });

  it('resolves the default anchor in the fixed app timezone (ADR-0004), not UTC: an instant that is Sunday in UTC but already Monday in Asia/Ho_Chi_Minh picks the ICT week', async () => {
    const viewer = await newActor();
    // Same edge instant as test/statistics.e2e-spec.ts's ADR-0004 test.
    clock.set(new Date('2026-08-02T18:00:00.000Z'));
    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'VND',
      date: '2026-08-03',
    });

    // Dated the UTC calendar date (2026-08-02), which is *not* part of the
    // ICT-resolved current week — it belongs to the previous one.
    await createExpense(app, viewer.token, {
      originalAmount: '7000.0000',
      originalCurrency: 'VND',
      visibility: 'public',
      expenseDate: '2026-08-02',
    });

    const board = leaderboardBody(await getLeaderboard(viewer));
    expect(board.start).toBe('2026-08-03');
    expect(board.end).toBe('2026-08-09');
    expect(board.rows[0].total).toBe('0.0000');
  });

  it('never re-derives from a later Daily Rate publication: the Conversion Snapshot is frozen (ADR-0008)', async () => {
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

    const before = leaderboardBody(await getLeaderboard(viewer));
    expect(before.rows[0].total).toBe('250000.0000');

    // Publish a very different rate for a later date — must never affect an
    // already-frozen snapshot's leaderboard contribution.
    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'USD',
      date: '2026-08-06',
      rates: { VND: '99999.0000000000' },
    });

    const after = leaderboardBody(await getLeaderboard(viewer));
    expect(after.rows[0].total).toBe('250000.0000');
  });

  it("shows totals in the viewer's own Preferred Currency: two viewers with different Preferred Currencies each see their own frozen snapshot sums", async () => {
    const owner = await newActor({ preferredCurrency: 'USD' });
    const { response: viewerVndSignUp } = await signUp(app, {
      preferredCurrency: 'VND',
    });
    const viewerVnd: Actor = {
      token: authBody(viewerVndSignUp).accessToken,
      id: authBody(viewerVndSignUp).user.id,
      username: authBody(viewerVndSignUp).user.username,
      displayName: authBody(viewerVndSignUp).user.displayName,
    };
    const { response: viewerUsdSignUp } = await signUp(app, {
      preferredCurrency: 'USD',
    });
    const viewerUsd: Actor = {
      token: authBody(viewerUsdSignUp).accessToken,
      id: authBody(viewerUsdSignUp).user.id,
      username: authBody(viewerUsdSignUp).user.username,
      displayName: authBody(viewerUsdSignUp).user.displayName,
    };
    await becomeFriends(owner, viewerVnd);
    await becomeFriends(owner, viewerUsd);

    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'USD',
      date: LOGGING_DATE,
      rates: { VND: '25000.0000000000' },
    });
    await createExpense(app, owner.token, {
      originalAmount: '10.0000',
      originalCurrency: 'USD',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });

    const vndBoard = leaderboardBody(await getLeaderboard(viewerVnd));
    expect(vndBoard.currency).toBe('VND');
    const ownerRowVnd = vndBoard.rows.find(
      (r) => r.user.username === owner.username,
    )!;
    expect(ownerRowVnd.total).toBe('250000.0000');

    const usdBoard = leaderboardBody(await getLeaderboard(viewerUsd));
    expect(usdBoard.currency).toBe('USD');
    const ownerRowUsd = usdBoard.rows.find(
      (r) => r.user.username === owner.username,
    )!;
    expect(ownerRowUsd.total).toBe('10.0000');
  });

  it('keeps standings consistent for everyone sharing a Preferred Currency: two VND viewers see identical totals and ordering for the same Friends (ADR-0008)', async () => {
    const spender = await newActor();
    const saver = await newActor();
    const viewerOne = await newActor({ preferredCurrency: 'VND' });
    const viewerTwo = await newActor({ preferredCurrency: 'VND' });
    for (const viewer of [viewerOne, viewerTwo]) {
      await becomeFriends(spender, viewer);
      await becomeFriends(saver, viewer);
    }

    await seedVndRates();
    await createExpense(app, spender.token, {
      originalAmount: '500000.0000',
      originalCurrency: 'VND',
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });
    await createExpense(app, saver.token, {
      originalAmount: '200000.0000',
      originalCurrency: 'VND',
      visibility: 'friend_only',
      expenseDate: LOGGING_DATE,
    });

    // The shared Friends' standings, minus each viewer's own row (the only
    // row the two boards legitimately differ by).
    const sharedStandings = (board: LeaderboardBody) =>
      board.rows
        .filter((row) => !row.isViewer)
        .map((row) => ({ username: row.user.username, total: row.total }));

    const boardOne = leaderboardBody(await getLeaderboard(viewerOne));
    const boardTwo = leaderboardBody(await getLeaderboard(viewerTwo));

    expect(sharedStandings(boardOne)).toEqual([
      { username: spender.username, total: '500000.0000' },
      { username: saver.username, total: '200000.0000' },
    ]);
    expect(sharedStandings(boardTwo)).toEqual(sharedStandings(boardOne));
  });

  describe('ADR-0003 invariant suite: Private Expenses leave no trace', () => {
    async function seedOwnerFriendAndStranger(): Promise<{
      owner: Actor;
      friend: Actor;
      stranger: Actor;
    }> {
      await seedVndRates();
      const owner = await newActor();
      const friend = await newActor();
      const stranger = await newActor();
      await becomeFriends(owner, friend);
      return { owner, friend, stranger };
    }

    const PRIVATE_DESCRIPTION = 'ultra secret splurge';
    const PRIVATE_AMOUNT = '87654321.0000';

    async function seedOwnerExpenses(owner: Actor): Promise<void> {
      await createExpense(app, owner.token, {
        description: PRIVATE_DESCRIPTION,
        originalAmount: PRIVATE_AMOUNT,
        originalCurrency: 'VND',
        category: 'housing',
        visibility: 'private',
        expenseDate: LOGGING_DATE,
      });
      await createExpense(app, owner.token, {
        description: 'shared with friends',
        originalAmount: '20000.0000',
        originalCurrency: 'VND',
        category: 'food',
        visibility: 'friend_only',
        expenseDate: LOGGING_DATE,
      });
      await createExpense(app, owner.token, {
        description: 'out in the open',
        originalAmount: '30000.0000',
        originalCurrency: 'VND',
        category: 'leisure',
        visibility: 'public',
        expenseDate: LOGGING_DATE,
      });
    }

    it("(a)+(b) a Friend's leaderboard total and category breakdown for the owner are Friend-only + Public only", async () => {
      const { owner, friend } = await seedOwnerFriendAndStranger();
      await seedOwnerExpenses(owner);

      const board = leaderboardBody(await getLeaderboard(friend));
      const ownerRow = board.rows.find(
        (r) => r.user.username === owner.username,
      )!;
      expect(ownerRow.total).toBe('50000.0000'); // 20000 + 30000, never the private 87654321

      const byCategory = Object.fromEntries(
        ownerRow.categories.map((c) => [c.category, c.total]),
      );
      expect(byCategory.food).toBe('20000.0000');
      expect(byCategory.leisure).toBe('30000.0000');
      expect(byCategory.housing).toBe('0.0000'); // the Private Expense's Category
    });

    it('(c) the drill-down (with and without a start/end filter) never contains the Private item', async () => {
      const { owner, friend } = await seedOwnerFriendAndStranger();
      await seedOwnerExpenses(owner);

      const unfiltered = expenseListBody(
        await getFriendExpenses(friend, owner.username),
      );
      expect(unfiltered.map((e) => e.description)).not.toContain(
        PRIVATE_DESCRIPTION,
      );
      expect(unfiltered).toHaveLength(2);

      const filtered = expenseListBody(
        await getFriendExpenses(friend, owner.username, {
          start: '2026-08-01',
          end: '2026-08-31',
        }),
      );
      expect(filtered.map((e) => e.description)).not.toContain(
        PRIVATE_DESCRIPTION,
      );
      expect(filtered).toHaveLength(2);
    });

    it('(d) byte-level: no payload a Friend or a stranger can fetch contains the Private description or amount', async () => {
      const { owner, friend, stranger } = await seedOwnerFriendAndStranger();
      await seedOwnerExpenses(owner);

      const friendLeaderboard = await getLeaderboard(friend);
      const friendDrilldown = await getFriendExpenses(friend, owner.username);
      const strangerLeaderboard = await getLeaderboard(stranger);

      for (const response of [
        friendLeaderboard,
        friendDrilldown,
        strangerLeaderboard,
      ]) {
        expect(response.text).not.toContain(PRIVATE_DESCRIPTION);
        expect(response.text).not.toContain(PRIVATE_AMOUNT);
        expect(response.text).not.toContain('87654321');
      }
    });

    it("(e) a stranger's leaderboard contains only themselves — the owner appears nowhere", async () => {
      const { owner, stranger } = await seedOwnerFriendAndStranger();
      await seedOwnerExpenses(owner);

      const response = await getLeaderboard(stranger);
      const board = leaderboardBody(response);

      expect(board.rows).toHaveLength(1);
      expect(board.rows[0].user.username).toBe(stranger.username);
      expect(response.text).not.toContain(owner.username);
    });
  });

  describe('drill-down Period filter (GET /users/:username/expenses?start&end)', () => {
    it('includes/excludes by Expense Date, inclusively, independent of Logged At', async () => {
      await seedVndRates();
      const owner = await newActor();
      const friend = await newActor();
      await becomeFriends(owner, friend);

      await createExpense(app, owner.token, {
        description: 'start boundary',
        originalAmount: '1000.0000',
        originalCurrency: 'VND',
        visibility: 'public',
        expenseDate: '2026-08-03',
      });
      await createExpense(app, owner.token, {
        description: 'end boundary',
        originalAmount: '2000.0000',
        originalCurrency: 'VND',
        visibility: 'public',
        expenseDate: '2026-08-09',
      });
      await createExpense(app, owner.token, {
        description: 'just before',
        originalAmount: '4000.0000',
        originalCurrency: 'VND',
        visibility: 'public',
        expenseDate: '2026-08-02',
      });
      await createExpense(app, owner.token, {
        description: 'just after',
        originalAmount: '8000.0000',
        originalCurrency: 'VND',
        visibility: 'public',
        expenseDate: '2026-08-10',
      });

      const response = await getFriendExpenses(friend, owner.username, {
        start: '2026-08-03',
        end: '2026-08-09',
      });

      expect(response.status).toBe(200);
      const expenses = expenseListBody(response);
      expect(expenses.map((e) => e.description).sort()).toEqual(
        ['start boundary', 'end boundary'].sort(),
      );
    });

    it('start and end are each independently optional', async () => {
      await seedVndRates();
      const owner = await newActor();
      const friend = await newActor();
      await becomeFriends(owner, friend);

      await createExpense(app, owner.token, {
        description: 'early',
        originalAmount: '1000.0000',
        originalCurrency: 'VND',
        visibility: 'public',
        expenseDate: '2026-08-01',
      });
      await createExpense(app, owner.token, {
        description: 'late',
        originalAmount: '2000.0000',
        originalCurrency: 'VND',
        visibility: 'public',
        expenseDate: '2026-08-20',
      });

      const startOnly = expenseListBody(
        await getFriendExpenses(friend, owner.username, {
          start: '2026-08-10',
        }),
      );
      expect(startOnly.map((e) => e.description)).toEqual(['late']);

      const endOnly = expenseListBody(
        await getFriendExpenses(friend, owner.username, {
          end: '2026-08-10',
        }),
      );
      expect(endOnly.map((e) => e.description)).toEqual(['early']);
    });

    it('400s on an invalid start or end', async () => {
      const owner = await newActor();
      const friend = await newActor();
      await becomeFriends(owner, friend);

      const response = await getFriendExpenses(friend, owner.username, {
        start: 'not-a-date',
      });
      expect(response.status).toBe(400);
    });
  });
});
