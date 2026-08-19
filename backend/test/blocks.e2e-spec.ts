import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './helpers/app';
import { signUp } from './helpers/auth';
import { FixedClock } from './helpers/clock';
import { FakeDailyRateProvider } from './helpers/daily-rate-provider';
import {
  authBody,
  friendRequestBody,
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

interface BlockBody {
  id: string;
  blockedUser: { id: string; username: string; displayName: string };
  createdAt: string;
}

function blockBody(response: request.Response): BlockBody {
  return response.body as BlockBody;
}

describe('blocks', () => {
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

  function blockUser(actor: Actor, username: string) {
    return request(app.getHttpServer())
      .post('/blocks')
      .set('Authorization', `Bearer ${actor.token}`)
      .send({ username });
  }

  function listBlocked(actor: Actor) {
    return request(app.getHttpServer())
      .get('/blocks')
      .set('Authorization', `Bearer ${actor.token}`);
  }

  function unblockUser(actor: Actor, username: string) {
    return request(app.getHttpServer())
      .delete(`/blocks/${username}`)
      .set('Authorization', `Bearer ${actor.token}`);
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

  async function becomeFriends(a: Actor, b: Actor): Promise<void> {
    const sent = await sendFriendRequest(a, b.username);
    const requestId = friendRequestBody(sent).id;
    await acceptFriendRequest(b, requestId);
  }

  describe('POST /blocks', () => {
    it('rejects a request with no token', async () => {
      const target = await newActor();
      await request(app.getHttpServer())
        .post('/blocks')
        .send({ username: target.username })
        .expect(401);
    });

    it('creates a Block and returns it with the blocked User as PublicUser info', async () => {
      const a = await newActor();
      const b = await newActor();

      const response = await blockUser(a, b.username);

      expect(response.status).toBe(201);
      const body = blockBody(response);
      expect(body.blockedUser).toEqual({
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

      const response = await blockUser(a, 'nobody-has-this-handle');

      expect(response.status).toBe(404);
    });

    it('400s when blocking yourself', async () => {
      const a = await newActor();

      const response = await blockUser(a, a.username);

      expect(response.status).toBe(400);
    });

    it('409s when already blocked', async () => {
      const a = await newActor();
      const b = await newActor();
      await blockUser(a, b.username);

      const response = await blockUser(a, b.username);

      expect(response.status).toBe(409);
    });

    it('404s (not a distinguishable error) when the target already blocked the caller', async () => {
      const a = await newActor();
      const b = await newActor();
      await blockUser(b, a.username);

      const response = await blockUser(a, b.username);

      expect(response.status).toBe(404);
    });

    it('severs an existing Friendship in one transaction', async () => {
      const a = await newActor();
      const b = await newActor();
      await becomeFriends(a, b);

      await blockUser(a, b.username).expect(201);

      expect(
        publicUserListBody(
          await request(app.getHttpServer())
            .get('/friends')
            .set('Authorization', `Bearer ${a.token}`),
        ),
      ).toEqual([]);
      expect(
        publicUserListBody(
          await request(app.getHttpServer())
            .get('/friends')
            .set('Authorization', `Bearer ${b.token}`),
        ),
      ).toEqual([]);
    });

    it('deletes a pending Friend Request between the pair, both directions', async () => {
      const a = await newActor();
      const b = await newActor();
      const c = await newActor();
      await sendFriendRequest(a, b.username); // a -> b
      await sendFriendRequest(c, a.username); // c -> a

      await blockUser(a, b.username).expect(201);

      const aRequests = await request(app.getHttpServer())
        .get('/friend-requests')
        .set('Authorization', `Bearer ${a.token}`);
      const body = aRequests.body as {
        incoming: unknown[];
        outgoing: unknown[];
      };
      // a -> b was removed by the Block, but c -> a (unrelated to b) survives.
      expect(body.outgoing).toEqual([]);
      expect(body.incoming).toHaveLength(1);
    });
  });

  describe('GET /blocks', () => {
    it('rejects a request with no token', async () => {
      await request(app.getHttpServer()).get('/blocks').expect(401);
    });

    it('is empty for a User with no Blocks', async () => {
      const a = await newActor();

      const response = await listBlocked(a);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('lists the blocked list newest first, PublicUser-shaped', async () => {
      const a = await newActor();
      const b = await newActor();
      const c = await newActor();
      await blockUser(a, b.username);
      await blockUser(a, c.username);

      const response = await listBlocked(a);

      expect(response.status).toBe(200);
      const blocked = publicUserListBody(response);
      expect(blocked.map((u) => u.username)).toEqual([c.username, b.username]);
    });

    it('never lists a User who blocked the caller, only Users the caller blocked', async () => {
      const a = await newActor();
      const b = await newActor();
      await blockUser(b, a.username);

      const response = await listBlocked(a);

      expect(publicUserListBody(response)).toEqual([]);
    });
  });

  describe('DELETE /blocks/:username', () => {
    it('rejects a request with no token', async () => {
      const target = await newActor();
      await request(app.getHttpServer())
        .delete(`/blocks/${target.username}`)
        .expect(401);
    });

    it('unblocks, restoring visibility', async () => {
      const a = await newActor();
      const b = await newActor();
      await blockUser(a, b.username);

      const response = await unblockUser(a, b.username);

      expect(response.status).toBe(204);
      expect(publicUserListBody(await listBlocked(a))).toEqual([]);
    });

    it('does not restore a Friendship the Block severed', async () => {
      const a = await newActor();
      const b = await newActor();
      await becomeFriends(a, b);
      await blockUser(a, b.username);

      await unblockUser(a, b.username).expect(204);

      expect(
        publicUserListBody(
          await request(app.getHttpServer())
            .get('/friends')
            .set('Authorization', `Bearer ${a.token}`),
        ),
      ).toEqual([]);
    });

    it('404s when there is no such Block', async () => {
      const a = await newActor();
      const b = await newActor();

      const response = await unblockUser(a, b.username);

      expect(response.status).toBe(404);
    });

    it('404s for an unknown Username', async () => {
      const a = await newActor();

      const response = await unblockUser(a, 'nobody-has-this-handle');

      expect(response.status).toBe(404);
    });

    it('only the blocker may unblock — the blocked party gets a 404, not a 403', async () => {
      const a = await newActor();
      const b = await newActor();
      await blockUser(a, b.username);

      const response = await unblockUser(b, a.username);

      expect(response.status).toBe(404);
    });
  });
});
