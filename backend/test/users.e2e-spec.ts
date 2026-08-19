import type { INestApplication } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './helpers/app';
import { signUp } from './helpers/auth';
import { testDb } from './helpers/database';
import {
  authBody,
  isIsoTimestamp,
  isNonEmptyString,
  privateUserBody,
  publicUserBody,
} from './helpers/http';

describe('users', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users/me', () => {
    it('rejects a request with no token', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('rejects a garbage token', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });

    // A knowing exception to "arrange through the public API": the API cannot
    // issue an already-expired token, and waiting out JWT_EXPIRES_IN is not a
    // test. Minting one is the only way to reach the stale-session case, and
    // the assertion is still purely on what the HTTP response says.
    it('rejects an expired-shaped token', async () => {
      const { response } = await signUp(app);
      const userId = authBody(response).user.id;

      // Signed with the same secret .env.test configures, but already
      // expired — a client that possesses a stale session, not a forgery.
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not set — global-setup.ts should have.');
      }
      const expiredToken = sign({ sub: userId }, secret, {
        expiresIn: '-1h',
      });

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    // The other knowing exception: there is no delete-account endpoint yet, so
    // a vanished subject can only be arranged directly. Swap this for the real
    // endpoint once one exists.
    it('rejects a token whose subject no longer exists', async () => {
      const { response } = await signUp(app);
      const userId = authBody(response).user.id;

      await testDb().user.delete({ where: { id: userId } });

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authBody(response).accessToken}`)
        .expect(401);
    });

    it("returns the caller's own PrivateUser for a valid token", async () => {
      const { response, body } = await signUp(app);

      const me = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authBody(response).accessToken}`);
      const { id, createdAt, ...rest } = privateUserBody(me);

      expect(me.status).toBe(200);
      expect(isNonEmptyString(id)).toBe(true);
      expect(isIsoTimestamp(createdAt)).toBe(true);
      expect(rest).toEqual({
        username: body.username,
        displayName: body.displayName,
        email: body.email,
        preferredCurrency: body.preferredCurrency,
        locale: body.locale,
      });
      expect(me.text).not.toContain('passwordHash');
    });
  });

  describe('PATCH /users/me', () => {
    it('rejects a request with no token', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .send({ locale: 'vi' })
        .expect(401);
    });

    it('rejects a garbage token', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .send({ locale: 'vi' })
        .expect(401);
    });

    it('changes the Locale and returns the PrivateUser reflecting it', async () => {
      const { response } = await signUp(app, { locale: 'en' });
      const token = authBody(response).accessToken;

      const patched = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ locale: 'vi' });

      expect(patched.status).toBe(200);
      expect(privateUserBody(patched).locale).toBe('vi');
      expect(patched.text).not.toContain('passwordHash');

      // The change persists — a fresh GET agrees with the PATCH response.
      const me = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`);
      expect(privateUserBody(me).locale).toBe('vi');
    });

    it('changes the Preferred Currency and returns the PrivateUser reflecting it', async () => {
      const { response } = await signUp(app, { preferredCurrency: 'USD' });
      const token = authBody(response).accessToken;

      const patched = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ preferredCurrency: 'VND' });

      expect(patched.status).toBe(200);
      expect(privateUserBody(patched).preferredCurrency).toBe('VND');

      // The change persists — a fresh GET agrees with the PATCH response.
      const me = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`);
      expect(privateUserBody(me).preferredCurrency).toBe('VND');
    });

    it('changes Preferred Currency and Locale together in one request', async () => {
      const { response } = await signUp(app, {
        preferredCurrency: 'USD',
        locale: 'en',
      });
      const token = authBody(response).accessToken;

      const patched = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ preferredCurrency: 'EUR', locale: 'vi' });

      expect(patched.status).toBe(200);
      expect(privateUserBody(patched)).toMatchObject({
        preferredCurrency: 'EUR',
        locale: 'vi',
      });
    });

    it('rejects an unsupported Preferred Currency', async () => {
      const { response } = await signUp(app);
      const token = authBody(response).accessToken;

      // 'usd' is a Supported Currency spelled wrong: currencies are stored
      // and matched uppercase, so lowercase must not slip through as valid.
      for (const preferredCurrency of ['XYZ', 'usd']) {
        const patched = await request(app.getHttpServer())
          .patch('/users/me')
          .set('Authorization', `Bearer ${token}`)
          .send({ preferredCurrency });

        expect(patched.status).toBe(400);
      }
    });

    it('rejects a non-string Preferred Currency', async () => {
      const { response } = await signUp(app);
      const token = authBody(response).accessToken;

      const patched = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ preferredCurrency: 1 });

      expect(patched.status).toBe(400);
    });

    it('leaves the rest of the account untouched', async () => {
      const { response, body } = await signUp(app, { locale: 'en' });
      const token = authBody(response).accessToken;

      const patched = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ locale: 'vi' });

      expect(privateUserBody(patched)).toMatchObject({
        username: body.username,
        displayName: body.displayName,
        email: body.email,
        preferredCurrency: body.preferredCurrency,
      });
    });

    it('rejects an unsupported Locale', async () => {
      const { response } = await signUp(app);
      const token = authBody(response).accessToken;

      const patched = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ locale: 'fr' });

      expect(patched.status).toBe(400);
    });

    it('rejects a non-string Locale', async () => {
      const { response } = await signUp(app);
      const token = authBody(response).accessToken;

      const patched = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ locale: 1 });

      expect(patched.status).toBe(400);
    });

    // Every UpdateMeDto field is optional so each may change alone, but a
    // body with none of them is a caller bug, not a no-op success.
    it('rejects an empty body', async () => {
      const { response } = await signUp(app);
      const token = authBody(response).accessToken;

      const patched = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(patched.status).toBe(400);
    });

    // The route is named for the whole account, so it must never become a
    // blind-update vector for fields it does not own. That it isn't rests on
    // `forbidNonWhitelisted` in configureApp — global config a later refactor
    // could loosen without touching this module, hence a test here and not a
    // comment there.
    it('refuses to update a field outside UpdateMeDto', async () => {
      const { response, body } = await signUp(app);
      const token = authBody(response).accessToken;

      const patched = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ locale: 'vi', email: 'attacker@example.com' });

      expect(patched.status).toBe(400);

      // Rejected outright, not silently stripped down to the Locale — the
      // account is exactly as it was.
      const me = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`);
      expect(privateUserBody(me).email).toBe(body.email);
      expect(privateUserBody(me).locale).toBe(body.locale);
    });
  });

  describe('GET /users/:username', () => {
    it('returns a PublicUser with no email anywhere in the response', async () => {
      const { response: viewerSignUp } = await signUp(app);
      const { response: targetSignUp, body: target } = await signUp(app, {
        email: 'private-to-others@example.com',
        username: 'lookmeup',
      });

      const response = await request(app.getHttpServer())
        .get(`/users/${target.username}`)
        .set('Authorization', `Bearer ${authBody(viewerSignUp).accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: authBody(targetSignUp).user.id,
        username: target.username,
        displayName: target.displayName,
      });

      // Assert on the raw text, not just the parsed object, so an email
      // nested anywhere in the payload still fails this test.
      expect(response.text).not.toContain(target.email);
      expect(response.text).not.toContain('email');
      expect(response.text).not.toContain('passwordHash');
    });

    it('looks a Username up as an exact, case-insensitive match', async () => {
      const { response: viewerSignUp } = await signUp(app);
      const { response: targetSignUp } = await signUp(app, {
        username: 'MixedCase',
      });

      const response = await request(app.getHttpServer())
        .get('/users/MixedCase')
        .set('Authorization', `Bearer ${authBody(viewerSignUp).accessToken}`);

      expect(response.status).toBe(200);
      // The account was normalized to lowercase at sign-up; the lookup above
      // used the original mixed-case spelling and still found it.
      expect(publicUserBody(response).username).toBe(
        authBody(targetSignUp).user.username,
      );
      expect(publicUserBody(response).username).toBe('mixedcase');
    });

    it('404s for an unknown Username', async () => {
      const { response: viewerSignUp } = await signUp(app);

      const response = await request(app.getHttpServer())
        .get('/users/nobody-has-this-handle')
        .set('Authorization', `Bearer ${authBody(viewerSignUp).accessToken}`);

      expect(response.status).toBe(404);
    });

    it('rejects an unauthenticated request', async () => {
      const { body: target } = await signUp(app);

      await request(app.getHttpServer())
        .get(`/users/${target.username}`)
        .expect(401);
    });

    it('404s the same as an unknown Username when the caller blocked the target', async () => {
      const { response: viewerSignUp } = await signUp(app);
      const { body: target } = await signUp(app, { username: 'blockedtarget' });
      const viewerToken = authBody(viewerSignUp).accessToken;

      await request(app.getHttpServer())
        .post('/blocks')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ username: target.username });

      const response = await request(app.getHttpServer())
        .get(`/users/${target.username}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(404);
    });

    it('404s the same as an unknown Username when the target blocked the caller', async () => {
      const { response: viewerSignUp } = await signUp(app);
      const { response: targetSignUp, body: target } = await signUp(app, {
        username: 'blockerofviewer',
      });
      const viewerToken = authBody(viewerSignUp).accessToken;
      const targetToken = authBody(targetSignUp).accessToken;
      const viewerUsername = authBody(viewerSignUp).user.username;

      await request(app.getHttpServer())
        .post('/blocks')
        .set('Authorization', `Bearer ${targetToken}`)
        .send({ username: viewerUsername });

      const response = await request(app.getHttpServer())
        .get(`/users/${target.username}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(404);
    });
  });
});
