import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './helpers/app';
import { signUp, validSignUpBody } from './helpers/auth';
import {
  authBody,
  errorMessage,
  isIsoTimestamp,
  isNonEmptyString,
} from './helpers/http';

describe('auth', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/sign-up', () => {
    it('creates an account that works immediately and returns a working token', async () => {
      const { response, body } = await signUp(app);
      const auth = authBody(response);
      const { id, createdAt, ...rest } = auth.user;

      expect(response.status).toBe(201);
      expect(isNonEmptyString(auth.accessToken)).toBe(true);
      expect(isNonEmptyString(id)).toBe(true);
      expect(isIsoTimestamp(createdAt)).toBe(true);
      expect(rest).toEqual({
        username: body.username,
        displayName: body.displayName,
        email: body.email,
        preferredCurrency: body.preferredCurrency,
        locale: body.locale,
        emailVerified: false,
      });

      // The account works immediately — no verification gate — proven by
      // using the token the sign-up response handed back.
      const me = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(200);

      expect(me.body).toEqual(auth.user);
    });

    it('never returns passwordHash', async () => {
      const { response } = await signUp(app);

      expect(response.text).not.toContain('passwordHash');
    });

    it('stores and compares email lowercased, trimmed', async () => {
      const { response, body } = await signUp(app, {
        email: '  Minh@Spendx.App  ',
      });

      expect(response.status).toBe(201);
      expect(authBody(response).user.email).toBe('minh@spendx.app');

      const signIn = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: 'MINH@SPENDX.APP', password: body.password })
        .expect(200);

      expect(authBody(signIn).user.email).toBe('minh@spendx.app');
    });

    it('stores and compares username lowercased, trimmed', async () => {
      const { response } = await signUp(app, { username: '  MinhTran  ' });

      expect(response.status).toBe(201);
      expect(authBody(response).user.username).toBe('minhtran');
    });

    it('rejects a duplicate email with 409', async () => {
      const { response: first } = await signUp(app, {
        email: 'taken@example.com',
      });
      expect(first.status).toBe(201);

      const { response } = await signUp(app, { email: 'taken@example.com' });

      expect(response.status).toBe(409);
      expect(errorMessage(response)).toBe('Email already registered');
    });

    it('rejects a case-insensitive duplicate email with 409', async () => {
      const { response: first } = await signUp(app, {
        email: 'Someone@Example.com',
      });
      expect(first.status).toBe(201);

      const { response } = await signUp(app, { email: 'someone@example.com' });

      expect(response.status).toBe(409);
      expect(errorMessage(response)).toBe('Email already registered');
    });

    it('rejects a duplicate username with 409', async () => {
      const { response: first } = await signUp(app, { username: 'taken' });
      expect(first.status).toBe(201);

      const { response } = await signUp(app, { username: 'taken' });

      expect(response.status).toBe(409);
      expect(errorMessage(response)).toBe('Username already taken');
    });

    it('rejects a case-insensitive duplicate username with 409', async () => {
      const { response: first } = await signUp(app, { username: 'MinhTran' });
      expect(first.status).toBe(201);

      const { response } = await signUp(app, { username: 'minhtran' });

      expect(response.status).toBe(409);
      expect(errorMessage(response)).toBe('Username already taken');
    });

    it('reports the email when both email and username collide', async () => {
      const { response: first } = await signUp(app, {
        email: 'both@example.com',
        username: 'bothtaken',
      });
      expect(first.status).toBe(201);

      const { response } = await signUp(app, {
        email: 'both@example.com',
        username: 'bothtaken',
      });

      expect(response.status).toBe(409);
      expect(errorMessage(response)).toBe('Email already registered');
    });

    it.each(['not-an-email', ''])(
      'rejects an invalid email %p',
      async (email) => {
        const response = await request(app.getHttpServer())
          .post('/auth/sign-up')
          .send(validSignUpBody({ email }));

        expect(response.status).toBe(400);
        expect(errorMessage(response)).toMatch(/email/i);
      },
    );

    it('rejects a password shorter than 8 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(validSignUpBody({ password: 'short1' }));

      expect(response.status).toBe(400);
      expect(errorMessage(response)).toMatch(/password/i);
    });

    it('rejects a password longer than 128 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(validSignUpBody({ password: 'a'.repeat(129) }));

      expect(response.status).toBe(400);
      expect(errorMessage(response)).toMatch(/password/i);
    });

    it.each([
      ['ab', 'too short'],
      ['a'.repeat(31), 'too long'],
      ['Has-Upper', 'uppercase'],
      ['has space', 'space'],
      ['has-dash', 'dash'],
    ])('rejects an invalid username: %s (%s)', async (username) => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(validSignUpBody({ username }));

      expect(response.status).toBe(400);
      expect(errorMessage(response)).toMatch(/username/i);
    });

    it('rejects a displayName that is empty after trimming', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(validSignUpBody({ displayName: '   ' }));

      expect(response.status).toBe(400);
      expect(errorMessage(response)).toMatch(/displayName/i);
    });

    it('rejects a displayName longer than 50 characters after trimming', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(validSignUpBody({ displayName: 'a'.repeat(51) }));

      expect(response.status).toBe(400);
      expect(errorMessage(response)).toMatch(/displayName/i);
    });

    it('rejects an unsupported preferredCurrency', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(validSignUpBody({ preferredCurrency: 'XXX' }));

      expect(response.status).toBe(400);
      expect(errorMessage(response)).toMatch(/preferredCurrency/i);
    });

    it('rejects an unsupported locale', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(validSignUpBody({ locale: 'fr' }));

      expect(response.status).toBe(400);
      expect(errorMessage(response)).toMatch(/locale/i);
    });
  });

  describe('POST /auth/sign-in', () => {
    it('returns a working token for correct credentials', async () => {
      const { body } = await signUp(app);

      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: body.email, password: body.password });
      const auth = authBody(response);
      const { id, createdAt, ...rest } = auth.user;

      expect(response.status).toBe(200);
      expect(isNonEmptyString(auth.accessToken)).toBe(true);
      expect(isNonEmptyString(id)).toBe(true);
      expect(isIsoTimestamp(createdAt)).toBe(true);
      expect(rest).toEqual({
        username: body.username,
        displayName: body.displayName,
        email: body.email,
        preferredCurrency: body.preferredCurrency,
        locale: body.locale,
        emailVerified: false,
      });

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(200);
    });

    it('never returns passwordHash', async () => {
      const { body } = await signUp(app);

      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: body.email, password: body.password });

      expect(response.text).not.toContain('passwordHash');
    });

    it('rejects a wrong password with 401 "Invalid email or password"', async () => {
      const { body } = await signUp(app);

      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: body.email, password: 'not the right password' });

      expect(response.status).toBe(401);
      expect(errorMessage(response)).toBe('Invalid email or password');
    });

    it('rejects an unknown email with the same 401 message as a wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: 'nobody@example.com', password: 'whatever12' });

      expect(response.status).toBe(401);
      expect(errorMessage(response)).toBe('Invalid email or password');
    });

    // Sign-in must not length-check the password. Answering a short guess with
    // a 400 that names the field, while a long one gets the uniform 401, would
    // hand back through validation the distinction that 401 exists to hide.
    it('rejects a too-short password with the same 401, not a 400', async () => {
      const { body } = await signUp(app);

      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: body.email, password: 'short' });

      expect(response.status).toBe(401);
      expect(errorMessage(response)).toBe('Invalid email or password');
    });

    it('signs in with an email in a different case than it was registered', async () => {
      const { body } = await signUp(app, { email: 'case@example.com' });

      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: 'CASE@EXAMPLE.COM', password: body.password });

      expect(response.status).toBe(200);
    });
  });
});
