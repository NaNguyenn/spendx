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
  errorMessage,
  expenseListBody,
  friendRequestBody,
  friendRequestsBody,
  publicUserListBody,
} from './helpers/http';

/** The instant every test starts pinned to; 2026-08-01 in +07:00 as well as UTC. */
const BASELINE_NOW = new Date('2026-08-01T10:00:00.000Z');

interface Actor {
  token: string;
  id: string;
  username: string;
  displayName: string;
}

describe('friends', () => {
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

  /** Signs a fresh account up through the public API. */
  async function newActor(
    overrides: Partial<{ username: string }> = {},
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

  function removeFriendRequest(actor: Actor, requestId: string) {
    return request(app.getHttpServer())
      .delete(`/friend-requests/${requestId}`)
      .set('Authorization', `Bearer ${actor.token}`);
  }

  function listMyFriendRequests(actor: Actor) {
    return request(app.getHttpServer())
      .get('/friend-requests')
      .set('Authorization', `Bearer ${actor.token}`);
  }

  function listMyFriends(actor: Actor) {
    return request(app.getHttpServer())
      .get('/friends')
      .set('Authorization', `Bearer ${actor.token}`);
  }

  function unfriend(actor: Actor, username: string) {
    return request(app.getHttpServer())
      .delete(`/friends/${username}`)
      .set('Authorization', `Bearer ${actor.token}`);
  }

  function getFriendExpenses(actor: Actor, username: string) {
    return request(app.getHttpServer())
      .get(`/users/${username}/expenses`)
      .set('Authorization', `Bearer ${actor.token}`);
  }

  /** Sends a Friend Request from `a` to `b` and has `b` accept it. */
  async function becomeFriends(a: Actor, b: Actor): Promise<void> {
    const sent = await sendFriendRequest(a, b.username);
    const requestId = friendRequestBody(sent).id;
    await acceptFriendRequest(b, requestId);
  }

  describe('POST /friend-requests', () => {
    it('rejects a request with no token', async () => {
      const b = await newActor();
      await request(app.getHttpServer())
        .post('/friend-requests')
        .send({ username: b.username })
        .expect(401);
    });

    it('creates a Friend Request and returns it with both parties as PublicUser info', async () => {
      const a = await newActor();
      const b = await newActor();

      const response = await sendFriendRequest(a, b.username);

      expect(response.status).toBe(201);
      const body = friendRequestBody(response);
      expect(body.sender).toEqual({
        id: a.id,
        username: a.username,
        displayName: a.displayName,
      });
      expect(body.recipient).toEqual({
        id: b.id,
        username: b.username,
        displayName: b.displayName,
      });
      expect(typeof body.id).toBe('string');
      expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt);
      expect(response.text).not.toContain('email');
    });

    it('404s for an unknown Username', async () => {
      const a = await newActor();

      const response = await sendFriendRequest(a, 'nobody-has-this-handle');

      expect(response.status).toBe(404);
    });

    it('400s when sending a Friend Request to yourself', async () => {
      const a = await newActor();

      const response = await sendFriendRequest(a, a.username);

      expect(response.status).toBe(400);
    });

    it('409s when the two Users are already Friends', async () => {
      const a = await newActor();
      const b = await newActor();
      await becomeFriends(a, b);

      const response = await sendFriendRequest(a, b.username);

      expect(response.status).toBe(409);
    });

    it('409s on a duplicate request in the same direction', async () => {
      const a = await newActor();
      const b = await newActor();
      await sendFriendRequest(a, b.username);

      const response = await sendFriendRequest(a, b.username);

      expect(response.status).toBe(409);
    });

    it('409s on a reverse-direction duplicate, pointing at accepting the existing one instead', async () => {
      const a = await newActor();
      const b = await newActor();
      await sendFriendRequest(a, b.username);

      const response = await sendFriendRequest(b, a.username);

      expect(response.status).toBe(409);
      expect(errorMessage(response).toLowerCase()).toContain('accept');
    });
  });

  describe('GET /friend-requests', () => {
    it('rejects a request with no token', async () => {
      await request(app.getHttpServer()).get('/friend-requests').expect(401);
    });

    it("returns the caller's incoming and outgoing pending requests, newest first", async () => {
      const a = await newActor();
      const b = await newActor();
      const c = await newActor();

      // a -> b (outgoing for a), c -> a (incoming for a)
      await sendFriendRequest(a, b.username);
      const secondIncoming = await sendFriendRequest(c, a.username);

      const response = await listMyFriendRequests(a);

      expect(response.status).toBe(200);
      const body = friendRequestsBody(response);
      expect(body.outgoing).toHaveLength(1);
      expect(body.outgoing[0].recipient.username).toBe(b.username);
      expect(body.incoming).toHaveLength(1);
      expect(body.incoming[0].sender.username).toBe(c.username);
      expect(body.incoming[0].id).toBe(friendRequestBody(secondIncoming).id);
    });

    it('never lists a request that was already accepted', async () => {
      const a = await newActor();
      const b = await newActor();
      await becomeFriends(a, b);

      const response = await listMyFriendRequests(a);

      const body = friendRequestsBody(response);
      expect(body.incoming).toHaveLength(0);
      expect(body.outgoing).toHaveLength(0);
    });
  });

  describe('POST /friend-requests/:id/accept', () => {
    it('creates a mutual Friendship visible from both sides', async () => {
      const a = await newActor();
      const b = await newActor();
      const sent = await sendFriendRequest(a, b.username);
      const requestId = friendRequestBody(sent).id;

      const response = await acceptFriendRequest(b, requestId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: a.id,
        username: a.username,
        displayName: a.displayName,
      });

      const aFriends = publicUserListBody(await listMyFriends(a));
      expect(aFriends.map((f) => f.username)).toContain(b.username);

      const bFriends = publicUserListBody(await listMyFriends(b));
      expect(bFriends.map((f) => f.username)).toContain(a.username);
    });

    it('404s when the caller is the sender, not the recipient', async () => {
      const a = await newActor();
      const b = await newActor();
      const sent = await sendFriendRequest(a, b.username);
      const requestId = friendRequestBody(sent).id;

      const response = await acceptFriendRequest(a, requestId);

      expect(response.status).toBe(404);
    });

    it('404s when the caller is a stranger to the request', async () => {
      const a = await newActor();
      const b = await newActor();
      const stranger = await newActor();
      const sent = await sendFriendRequest(a, b.username);
      const requestId = friendRequestBody(sent).id;

      const response = await acceptFriendRequest(stranger, requestId);

      expect(response.status).toBe(404);
    });

    it('404s for a nonexistent request id', async () => {
      const a = await newActor();

      const response = await acceptFriendRequest(
        a,
        '00000000-0000-7000-8000-000000000000',
      );

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /friend-requests/:id', () => {
    it('lets the sender cancel their own outgoing request', async () => {
      const a = await newActor();
      const b = await newActor();
      const sent = await sendFriendRequest(a, b.username);
      const requestId = friendRequestBody(sent).id;

      const response = await removeFriendRequest(a, requestId);

      expect(response.status).toBe(204);
      const remaining = friendRequestsBody(await listMyFriendRequests(b));
      expect(remaining.incoming).toHaveLength(0);
    });

    it('lets the recipient decline an incoming request', async () => {
      const a = await newActor();
      const b = await newActor();
      const sent = await sendFriendRequest(a, b.username);
      const requestId = friendRequestBody(sent).id;

      const response = await removeFriendRequest(b, requestId);

      expect(response.status).toBe(204);
      const remaining = friendRequestsBody(await listMyFriendRequests(a));
      expect(remaining.outgoing).toHaveLength(0);
    });

    it('a declined request can be sent again', async () => {
      const a = await newActor();
      const b = await newActor();
      const sent = await sendFriendRequest(a, b.username);
      await removeFriendRequest(b, friendRequestBody(sent).id);

      const resent = await sendFriendRequest(a, b.username);

      expect(resent.status).toBe(201);
    });

    it('404s when the caller is neither party', async () => {
      const a = await newActor();
      const b = await newActor();
      const stranger = await newActor();
      const sent = await sendFriendRequest(a, b.username);
      const requestId = friendRequestBody(sent).id;

      const response = await removeFriendRequest(stranger, requestId);

      expect(response.status).toBe(404);
    });

    it('404s for a nonexistent request id', async () => {
      const a = await newActor();

      const response = await removeFriendRequest(
        a,
        '00000000-0000-7000-8000-000000000000',
      );

      expect(response.status).toBe(404);
    });
  });

  describe('GET /friends', () => {
    it('rejects a request with no token', async () => {
      await request(app.getHttpServer()).get('/friends').expect(401);
    });

    it('is empty for a User with no Friends', async () => {
      const a = await newActor();

      const response = await listMyFriends(a);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('lists Friends ordered by Username, as {username, displayName}', async () => {
      const a = await newActor();
      const zeta = await newActor({ username: 'zeta' });
      const alpha = await newActor({ username: 'alpha' });
      await becomeFriends(a, zeta);
      await becomeFriends(a, alpha);

      const response = await listMyFriends(a);

      expect(response.status).toBe(200);
      const friends = publicUserListBody(response);
      expect(friends.map((f) => f.username)).toEqual(['alpha', 'zeta']);
      expect(friends[0]).toEqual({
        id: alpha.id,
        username: 'alpha',
        displayName: alpha.displayName,
      });
    });
  });

  describe('DELETE /friends/:username', () => {
    it('unfriends both sides', async () => {
      const a = await newActor();
      const b = await newActor();
      await becomeFriends(a, b);

      const response = await unfriend(a, b.username);

      expect(response.status).toBe(204);
      expect(publicUserListBody(await listMyFriends(a))).toEqual([]);
      expect(publicUserListBody(await listMyFriends(b))).toEqual([]);
    });

    it('404s when there is no such Friendship', async () => {
      const a = await newActor();
      const b = await newActor();

      const response = await unfriend(a, b.username);

      expect(response.status).toBe(404);
    });

    it('404s for an unknown Username', async () => {
      const a = await newActor();

      const response = await unfriend(a, 'nobody-has-this-handle');

      expect(response.status).toBe(404);
    });
  });

  describe("GET /users/:username/expenses (a Friend's Shareable Expenses)", () => {
    async function seedUsdRates(): Promise<void> {
      await seedDailyRatesFromBase(app, rateProvider, {
        baseCurrency: 'VND',
        date: '2026-08-01',
        rates: { USD: '0.0000400000' },
      });
    }

    it('rejects a request with no token', async () => {
      const owner = await newActor();
      await request(app.getHttpServer())
        .get(`/users/${owner.username}/expenses`)
        .expect(401);
    });

    it('returns Friend-only and Public Expenses, newest logged first, but never Private', async () => {
      await seedUsdRates();
      const owner = await newActor();
      const friend = await newActor();
      await becomeFriends(owner, friend);

      // Distinct Logged At instants (same logging day) so "newest logged
      // first" has an unambiguous order to assert on.
      clock.set(new Date('2026-08-01T10:00:00.000Z'));
      await createExpense(app, owner.token, {
        description: 'private one',
        visibility: 'private',
      });
      clock.set(new Date('2026-08-01T10:00:01.000Z'));
      await createExpense(app, owner.token, {
        description: 'friend only one',
        visibility: 'friend_only',
      });
      clock.set(new Date('2026-08-01T10:00:02.000Z'));
      await createExpense(app, owner.token, {
        description: 'public one',
        visibility: 'public',
      });

      const response = await getFriendExpenses(friend, owner.username);

      expect(response.status).toBe(200);
      const expenses = expenseListBody(response);
      expect(expenses.map((e) => e.description)).toEqual([
        'public one',
        'friend only one',
      ]);
      expect(response.text).not.toContain('private one');
    });

    it("converts into the reader's own Preferred Currency, not the owner's", async () => {
      await seedUsdRates();
      const owner = await newActor(); // USD by default
      const { response: friendSignUp } = await signUp(app, {
        preferredCurrency: 'USD',
      });
      const friend: Actor = {
        token: authBody(friendSignUp).accessToken,
        id: authBody(friendSignUp).user.id,
        username: authBody(friendSignUp).user.username,
        displayName: authBody(friendSignUp).user.displayName,
      };
      await becomeFriends(owner, friend);

      await createExpense(app, owner.token, {
        originalAmount: '1000000.0000',
        originalCurrency: 'VND',
        visibility: 'public',
      });

      const response = await getFriendExpenses(friend, owner.username);

      expect(expenseListBody(response)[0].convertedCurrency).toBe('USD');
      expect(expenseListBody(response)[0].convertedAmount).toBe('40.0000');
    });

    it('403s for a stranger', async () => {
      const owner = await newActor();
      const stranger = await newActor();

      const response = await getFriendExpenses(stranger, owner.username);

      expect(response.status).toBe(403);
    });

    it('403s for a requester whose request was declined', async () => {
      const owner = await newActor();
      const requester = await newActor();
      const sent = await sendFriendRequest(requester, owner.username);
      await removeFriendRequest(owner, friendRequestBody(sent).id);

      const response = await getFriendExpenses(requester, owner.username);

      expect(response.status).toBe(403);
    });

    it('403s for a requester whose request was cancelled', async () => {
      const owner = await newActor();
      const requester = await newActor();
      const sent = await sendFriendRequest(requester, owner.username);
      await removeFriendRequest(requester, friendRequestBody(sent).id);

      const response = await getFriendExpenses(requester, owner.username);

      expect(response.status).toBe(403);
    });

    it('403s after the two Users unfriend', async () => {
      const owner = await newActor();
      const friend = await newActor();
      await becomeFriends(owner, friend);
      await unfriend(owner, friend.username);

      const response = await getFriendExpenses(friend, owner.username);

      expect(response.status).toBe(403);
    });

    it("403s for the caller's own Username", async () => {
      const owner = await newActor();

      const response = await getFriendExpenses(owner, owner.username);

      expect(response.status).toBe(403);
    });

    it('404s for an unknown Username', async () => {
      const a = await newActor();

      const response = await getFriendExpenses(a, 'nobody-has-this-handle');

      expect(response.status).toBe(404);
    });
  });
});
