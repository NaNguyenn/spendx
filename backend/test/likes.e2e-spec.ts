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
  expenseBody,
  expenseListBody,
  feedPageBody,
  friendRequestBody,
  publicUserListBody,
} from './helpers/http';

/**
 * The instant every test starts pinned to: 2026-08-05T10:00:00.000Z is
 * 2026-08-05 (Wednesday) in Asia/Ho_Chi_Minh too (+07:00) — same baseline as
 * test/feed.e2e-spec.ts.
 */
const BASELINE_NOW = new Date('2026-08-05T10:00:00.000Z');
const LOGGING_DATE = '2026-08-05';

interface Actor {
  token: string;
  id: string;
  username: string;
  displayName: string;
}

describe('likes', () => {
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

  async function seedVndRates(date: string = LOGGING_DATE): Promise<void> {
    await seedDailyRatesFromBase(app, rateProvider, {
      baseCurrency: 'VND',
      date,
    });
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

  function like(actor: Actor, expenseId: string) {
    return request(app.getHttpServer())
      .put(`/expenses/${expenseId}/like`)
      .set('Authorization', `Bearer ${actor.token}`);
  }

  function unlike(actor: Actor, expenseId: string) {
    return request(app.getHttpServer())
      .delete(`/expenses/${expenseId}/like`)
      .set('Authorization', `Bearer ${actor.token}`);
  }

  function getLikers(actor: Actor, expenseId: string) {
    return request(app.getHttpServer())
      .get(`/expenses/${expenseId}/likes`)
      .set('Authorization', `Bearer ${actor.token}`);
  }

  function getOwnExpenses(actor: Actor) {
    return request(app.getHttpServer())
      .get('/expenses')
      .set('Authorization', `Bearer ${actor.token}`);
  }

  function getFriendExpenses(actor: Actor, username: string) {
    return request(app.getHttpServer())
      .get(`/users/${username}/expenses`)
      .set('Authorization', `Bearer ${actor.token}`);
  }

  function getFeed(actor: Actor) {
    return request(app.getHttpServer())
      .get('/feed')
      .set('Authorization', `Bearer ${actor.token}`);
  }

  function patchExpense(
    actor: Actor,
    expenseId: string,
    body: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .patch(`/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${actor.token}`)
      .send(body);
  }

  async function createPublicExpense(
    owner: Actor,
    description = 'a public spend',
  ): Promise<string> {
    const { response } = await createExpense(app, owner.token, {
      description,
      visibility: 'public',
      expenseDate: LOGGING_DATE,
    });
    return expenseBody(response).id;
  }

  describe('authentication', () => {
    it('rejects PUT /expenses/:id/like with no token', async () => {
      await request(app.getHttpServer())
        .put('/expenses/00000000-0000-7000-8000-000000000000/like')
        .expect(401);
    });

    it('rejects DELETE /expenses/:id/like with no token', async () => {
      await request(app.getHttpServer())
        .delete('/expenses/00000000-0000-7000-8000-000000000000/like')
        .expect(401);
    });

    it('rejects GET /expenses/:id/likes with no token', async () => {
      await request(app.getHttpServer())
        .get('/expenses/00000000-0000-7000-8000-000000000000/likes')
        .expect(401);
    });
  });

  describe('liking a Public Expense', () => {
    it('shows likeCount and likedByViewer correctly in the Feed, for the liker and a third party', async () => {
      await seedVndRates();
      const owner = await newActor();
      const liker = await newActor();
      const stranger = await newActor();
      const expenseId = await createPublicExpense(owner);

      await like(liker, expenseId).expect(204);

      const likerFeed = feedPageBody(await getFeed(liker));
      const likerItem = likerFeed.items.find((i) => i.id === expenseId);
      expect(likerItem).toMatchObject({ likeCount: 1, likedByViewer: true });

      const strangerFeed = feedPageBody(await getFeed(stranger));
      const strangerItem = strangerFeed.items.find((i) => i.id === expenseId);
      expect(strangerItem).toMatchObject({
        likeCount: 1,
        likedByViewer: false,
      });
    });
  });

  describe('liking a Friend-only Expense', () => {
    it('is allowed for a Friend, and shows up on the drill-down read', async () => {
      await seedVndRates();
      const owner = await newActor();
      const friend = await newActor();
      await becomeFriends(owner, friend);

      const { response } = await createExpense(app, owner.token, {
        description: 'friend only spend',
        visibility: 'friend_only',
        expenseDate: LOGGING_DATE,
      });
      const expenseId = expenseBody(response).id;

      await like(friend, expenseId).expect(204);

      const drillDown = expenseListBody(
        await getFriendExpenses(friend, owner.username),
      );
      const item = drillDown.find((e) => e.id === expenseId);
      expect(item).toMatchObject({ likeCount: 1, likedByViewer: true });
    });
  });

  describe('Block filtering (backend/CONTEXT.md — Block, issue #15)', () => {
    function blockUser(actor: Actor, username: string) {
      return request(app.getHttpServer())
        .post('/blocks')
        .set('Authorization', `Bearer ${actor.token}`)
        .send({ username });
    }

    it('excludes a Like from a User the viewer blocked, from both the count and the likers list', async () => {
      await seedVndRates();
      const owner = await newActor();
      const liker = await newActor();
      const viewer = await newActor();
      const expenseId = await createPublicExpense(owner);

      await like(liker, expenseId).expect(204);
      await blockUser(viewer, liker.username);

      const feed = feedPageBody(await getFeed(viewer));
      const item = feed.items.find((i) => i.id === expenseId);
      expect(item).toMatchObject({ likeCount: 0 });

      const likers = publicUserListBody(await getLikers(viewer, expenseId));
      expect(likers).toEqual([]);
    });

    it('excludes a Like from a User who blocked the viewer, from both the count and the likers list', async () => {
      await seedVndRates();
      const owner = await newActor();
      const liker = await newActor();
      const viewer = await newActor();
      const expenseId = await createPublicExpense(owner);

      await like(liker, expenseId).expect(204);
      await blockUser(liker, viewer.username);

      const feed = feedPageBody(await getFeed(viewer));
      const item = feed.items.find((i) => i.id === expenseId);
      expect(item).toMatchObject({ likeCount: 0 });

      const likers = publicUserListBody(await getLikers(viewer, expenseId));
      expect(likers).toEqual([]);
    });

    it("404s liking, unliking, and listing likers of a blocked User's Expense — viewer blocked the owner", async () => {
      await seedVndRates();
      const owner = await newActor();
      const viewer = await newActor();
      const expenseId = await createPublicExpense(owner);
      await blockUser(viewer, owner.username);

      expect((await like(viewer, expenseId)).status).toBe(404);
      expect((await unlike(viewer, expenseId)).status).toBe(404);
      expect((await getLikers(viewer, expenseId)).status).toBe(404);
    });

    it("404s liking, unliking, and listing likers of a blocked User's Expense — owner blocked the viewer", async () => {
      await seedVndRates();
      const owner = await newActor();
      const viewer = await newActor();
      const expenseId = await createPublicExpense(owner);
      await blockUser(owner, viewer.username);

      expect((await like(viewer, expenseId)).status).toBe(404);
      expect((await unlike(viewer, expenseId)).status).toBe(404);
      expect((await getLikers(viewer, expenseId)).status).toBe(404);
    });

    it('a still-visible Expense keeps likeCount and likedByViewer accurate on the own-list read', async () => {
      await seedVndRates();
      const owner = await newActor();
      const liker = await newActor();
      const blockedLiker = await newActor();
      const { response } = await createExpense(app, owner.token, {
        description: 'own spend with mixed likers',
        visibility: 'public',
        expenseDate: LOGGING_DATE,
      });
      const expenseId = expenseBody(response).id;

      await like(liker, expenseId).expect(204);
      await like(blockedLiker, expenseId).expect(204);
      await blockUser(owner, blockedLiker.username);

      const ownList = expenseListBody(await getOwnExpenses(owner));
      const item = ownList.find((e) => e.id === expenseId);
      expect(item).toMatchObject({ likeCount: 1, likedByViewer: false });
    });
  });

  describe('404s', () => {
    it('404s liking a nonexistent Expense', async () => {
      const actor = await newActor();
      const response = await like(
        actor,
        '00000000-0000-7000-8000-000000000000',
      );
      expect(response.status).toBe(404);
    });

    it("404s liking a stranger's Friend-only Expense", async () => {
      await seedVndRates();
      const owner = await newActor();
      const stranger = await newActor();
      const { response } = await createExpense(app, owner.token, {
        description: 'friend only spend',
        visibility: 'friend_only',
        expenseDate: LOGGING_DATE,
      });
      const expenseId = expenseBody(response).id;

      const result = await like(stranger, expenseId);
      expect(result.status).toBe(404);
    });

    it("404s liking someone else's Private Expense", async () => {
      await seedVndRates();
      const owner = await newActor();
      const stranger = await newActor();
      const { response } = await createExpense(app, owner.token, {
        description: 'private spend',
        visibility: 'private',
        expenseDate: LOGGING_DATE,
      });
      const expenseId = expenseBody(response).id;

      const result = await like(stranger, expenseId);
      expect(result.status).toBe(404);
    });
  });

  describe('idempotency', () => {
    it('double PUT keeps the count at 1', async () => {
      await seedVndRates();
      const owner = await newActor();
      const liker = await newActor();
      const expenseId = await createPublicExpense(owner);

      await like(liker, expenseId).expect(204);
      await like(liker, expenseId).expect(204);

      const likers = publicUserListBody(await getLikers(owner, expenseId));
      expect(likers).toHaveLength(1);
    });

    it('DELETE when not liked still 204s and leaves the count unchanged', async () => {
      await seedVndRates();
      const owner = await newActor();
      const other = await newActor();
      const expenseId = await createPublicExpense(owner);

      const response = await unlike(other, expenseId);
      expect(response.status).toBe(204);

      const likers = publicUserListBody(await getLikers(owner, expenseId));
      expect(likers).toHaveLength(0);
    });
  });

  describe('unliking', () => {
    it('removes the Like: count drops, likedByViewer turns false', async () => {
      await seedVndRates();
      const owner = await newActor();
      const liker = await newActor();
      const expenseId = await createPublicExpense(owner);

      await like(liker, expenseId).expect(204);
      await unlike(liker, expenseId).expect(204);

      const feed = feedPageBody(await getFeed(liker));
      const item = feed.items.find((i) => i.id === expenseId);
      expect(item).toMatchObject({ likeCount: 0, likedByViewer: false });
    });

    it('is allowed for a Friend on a Friend-only Expense, and shows up on the drill-down read', async () => {
      await seedVndRates();
      const owner = await newActor();
      const friend = await newActor();
      await becomeFriends(owner, friend);

      const { response } = await createExpense(app, owner.token, {
        description: 'friend only spend',
        visibility: 'friend_only',
        expenseDate: LOGGING_DATE,
      });
      const expenseId = expenseBody(response).id;

      await like(friend, expenseId).expect(204);
      await unlike(friend, expenseId).expect(204);

      const drillDown = expenseListBody(
        await getFriendExpenses(friend, owner.username),
      );
      const item = drillDown.find((e) => e.id === expenseId);
      expect(item).toMatchObject({ likeCount: 0, likedByViewer: false });
    });

    it("404s unliking a stranger's Friend-only Expense — the same Visibility gate as like", async () => {
      await seedVndRates();
      const owner = await newActor();
      const stranger = await newActor();
      const { response } = await createExpense(app, owner.token, {
        description: 'friend only spend',
        visibility: 'friend_only',
        expenseDate: LOGGING_DATE,
      });
      const expenseId = expenseBody(response).id;

      const result = await unlike(stranger, expenseId);
      expect(result.status).toBe(404);
    });
  });

  describe('GET /expenses/:id/likes', () => {
    it('returns likers as {id, username, displayName}, no email, newest Like first', async () => {
      await seedVndRates();
      const owner = await newActor();
      const first = await newActor();
      const second = await newActor();
      const expenseId = await createPublicExpense(owner);

      await like(first, expenseId).expect(204);
      await like(second, expenseId).expect(204);

      const response = await getLikers(owner, expenseId);
      expect(response.status).toBe(200);
      const likers = publicUserListBody(response);
      expect(likers.map((l) => l.username)).toEqual([
        second.username,
        first.username,
      ]);
      expect(response.text).not.toContain('email');
      expect(likers[0]).toEqual({
        id: second.id,
        username: second.username,
        displayName: second.displayName,
      });
    });

    it('is visible to any viewer who can see the Expense, including a non-liking third party', async () => {
      await seedVndRates();
      const owner = await newActor();
      const liker = await newActor();
      const thirdParty = await newActor();
      const expenseId = await createPublicExpense(owner);

      await like(liker, expenseId).expect(204);

      const response = await getLikers(thirdParty, expenseId);
      expect(response.status).toBe(200);
      expect(publicUserListBody(response).map((l) => l.username)).toEqual([
        liker.username,
      ]);
    });

    it('404s for a viewer who cannot see the Expense', async () => {
      await seedVndRates();
      const owner = await newActor();
      const stranger = await newActor();
      const { response } = await createExpense(app, owner.token, {
        description: 'private spend',
        visibility: 'private',
        expenseDate: LOGGING_DATE,
      });
      const expenseId = expenseBody(response).id;

      const result = await getLikers(stranger, expenseId);
      expect(result.status).toBe(404);
    });

    it('succeeds for a Friend on a Friend-only Expense, and 404s for a stranger', async () => {
      await seedVndRates();
      const owner = await newActor();
      const friend = await newActor();
      const stranger = await newActor();
      await becomeFriends(owner, friend);

      const { response } = await createExpense(app, owner.token, {
        description: 'friend only spend',
        visibility: 'friend_only',
        expenseDate: LOGGING_DATE,
      });
      const expenseId = expenseBody(response).id;
      await like(friend, expenseId).expect(204);

      const friendResult = await getLikers(friend, expenseId);
      expect(friendResult.status).toBe(200);
      expect(publicUserListBody(friendResult).map((l) => l.username)).toEqual([
        friend.username,
      ]);

      const strangerResult = await getLikers(stranger, expenseId);
      expect(strangerResult.status).toBe(404);
    });
  });

  describe('visibility tightening', () => {
    it('a Like persists but turns invisible when the owner makes the Expense private', async () => {
      await seedVndRates();
      const owner = await newActor();
      const stranger = await newActor();
      const expenseId = await createPublicExpense(owner);

      await like(stranger, expenseId).expect(204);

      await patchExpense(owner, expenseId, { visibility: 'private' }).expect(
        200,
      );

      const strangerLikers = await getLikers(stranger, expenseId);
      expect(strangerLikers.status).toBe(404);

      const strangerLike = await like(stranger, expenseId);
      expect(strangerLike.status).toBe(404);

      // The Like persists (backend/CONTEXT.md — Like): the excluded
      // stranger can't even withdraw it — DELETE 404s the same as PUT/GET.
      const strangerUnlike = await unlike(stranger, expenseId);
      expect(strangerUnlike.status).toBe(404);

      const ownList = expenseListBody(await getOwnExpenses(owner));
      const item = ownList.find((e) => e.id === expenseId);
      expect(item).toMatchObject({ likeCount: 1, likedByViewer: false });
    });
  });

  describe('own list GET /expenses', () => {
    it('includes likeCount and likedByViewer, including for the owner liking their own Expense', async () => {
      await seedVndRates();
      const owner = await newActor();
      const { response } = await createExpense(app, owner.token, {
        description: 'own spend',
        visibility: 'private',
        expenseDate: LOGGING_DATE,
      });
      const expenseId = expenseBody(response).id;

      await like(owner, expenseId).expect(204);

      const ownList = expenseListBody(await getOwnExpenses(owner));
      const item = ownList.find((e) => e.id === expenseId);
      expect(item).toMatchObject({ likeCount: 1, likedByViewer: true });
    });

    it('a freshly created Expense has likeCount 0 and likedByViewer false', async () => {
      await seedVndRates();
      const owner = await newActor();
      const { response } = await createExpense(app, owner.token, {
        description: 'brand new',
        visibility: 'private',
        expenseDate: LOGGING_DATE,
      });

      expect(response.status).toBe(201);
      expect(expenseBody(response)).toMatchObject({
        likeCount: 0,
        likedByViewer: false,
      });
    });
  });
});
