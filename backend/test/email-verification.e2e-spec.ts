import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { Email } from '../src/email/email-sender';
import { createTestApp } from './helpers/app';
import { signUp } from './helpers/auth';
import { FixedClock } from './helpers/clock';
import { FakeEmailSender, ThrowingEmailSender } from './helpers/email-sender';
import { authBody, errorMessage, privateUserBody } from './helpers/http';

// Midday ICT, well clear of any day boundary — see daily-rate-snapshot.e2e-spec.ts
// for why the other suites pin their FixedClock the same way.
const BASELINE_NOW = new Date('2026-08-17T05:00:00.000Z');

const HOUR_MS = 60 * 60 * 1000;

/**
 * Codes are read only from the fake sender's captured emails, never the
 * database (an explicit acceptance criterion for issue #20) — the templates
 * put the code on its own line (email-verification-email.ts), so this looks
 * for a line that is exactly six digits.
 */
function extractCode(email: Email): string {
  const match = /^(\d{6})$/m.exec(email.text);
  if (!match) {
    throw new Error(
      `No 6-digit code line found in email text: ${JSON.stringify(email.text)}`,
    );
  }
  return match[1];
}

/** A 6-digit code guaranteed to differ from `code`. */
function wrongCodeFor(code: string): string {
  return ((Number(code) + 1) % 1_000_000).toString().padStart(6, '0');
}

describe('email verification', () => {
  let app: INestApplication<App>;
  let clock: FixedClock;
  let emailSender: FakeEmailSender;

  beforeAll(async () => {
    clock = new FixedClock(BASELINE_NOW);
    emailSender = new FakeEmailSender();
    app = await createTestApp({ clock, emailSender });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    clock.set(BASELINE_NOW);
    emailSender.clear();
  });

  function authHeader(token: string): [string, string] {
    return ['Authorization', `Bearer ${token}`];
  }

  describe('sign-up auto-send', () => {
    it('sends exactly one Email Verification code, in an en account’s Locale', async () => {
      const { response } = await signUp(app, { locale: 'en' });
      expect(response.status).toBe(201);

      expect(emailSender.sent).toHaveLength(1);
      const email = emailSender.sent[0];
      expect(email.to).toBe(authBody(response).user.email);
      expect(email.subject).toMatch(/verify/i);
      expect(email.text).toMatch(/verify/i);
      expect(email.text).toMatch(/expires in 24 hours/i);
      expect(extractCode(email)).toMatch(/^\d{6}$/);
    });

    it('sends the vi copy for a locale: vi account', async () => {
      const { response } = await signUp(app, { locale: 'vi' });
      expect(response.status).toBe(201);

      expect(emailSender.sent).toHaveLength(1);
      const email = emailSender.sent[0];
      expect(email.to).toBe(authBody(response).user.email);
      expect(email.subject).toMatch(/Xác minh/);
      expect(email.text).toMatch(/xác minh/i);
      expect(email.text).toMatch(/hết hạn sau 24 giờ/);
      expect(extractCode(email)).toMatch(/^\d{6}$/);
    });

    it('never fails sign-up when the sender itself fails', async () => {
      const throwingApp = await createTestApp({
        clock: new FixedClock(BASELINE_NOW),
        emailSender: new ThrowingEmailSender(),
      });
      try {
        const { response } = await signUp(throwingApp);
        expect(response.status).toBe(201);

        await request(throwingApp.getHttpServer())
          .get('/users/me')
          .set(...authHeader(authBody(response).accessToken))
          .expect(200);
      } finally {
        await throwingApp.close();
      }
    });
  });

  describe('POST /email-verification/request', () => {
    it('429s with Retry-After inside the 60s cooldown, then 204s at/after it', async () => {
      const { response: signUpResponse } = await signUp(app);
      const token = authBody(signUpResponse).accessToken;
      expect(emailSender.sent).toHaveLength(1);

      clock.set(new Date(BASELINE_NOW.getTime() + 20_000));
      const tooSoon = await request(app.getHttpServer())
        .post('/email-verification/request')
        .set(...authHeader(token));

      expect(tooSoon.status).toBe(429);
      expect(tooSoon.headers['retry-after']).toBe('40');
      expect(emailSender.sent).toHaveLength(1);

      clock.set(new Date(BASELINE_NOW.getTime() + 60_000));
      const onCooldownEdge = await request(app.getHttpServer())
        .post('/email-verification/request')
        .set(...authHeader(token));

      expect(onCooldownEdge.status).toBe(204);
      expect(emailSender.sent).toHaveLength(2);
    });

    it('409s once the account is already verified', async () => {
      const { response: signUpResponse } = await signUp(app);
      const token = authBody(signUpResponse).accessToken;
      const code = extractCode(emailSender.sent[0]);

      await request(app.getHttpServer())
        .post('/email-verification/confirm')
        .set(...authHeader(token))
        .send({ code })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/email-verification/request')
        .set(...authHeader(token));

      expect(response.status).toBe(409);
      expect(errorMessage(response)).toBe('Email already verified');
    });
  });

  describe('POST /email-verification/confirm', () => {
    it('verifies the account, reflected on /users/me but not on another caller’s view', async () => {
      const { response: signUpResponse, body: signUpBody } = await signUp(app);
      const token = authBody(signUpResponse).accessToken;
      const code = extractCode(emailSender.sent[0]);

      const confirmResponse = await request(app.getHttpServer())
        .post('/email-verification/confirm')
        .set(...authHeader(token))
        .send({ code });

      expect(confirmResponse.status).toBe(200);
      expect(privateUserBody(confirmResponse)).toMatchObject({
        username: signUpBody.username,
        emailVerified: true,
      });

      const me = await request(app.getHttpServer())
        .get('/users/me')
        .set(...authHeader(token))
        .expect(200);
      expect(privateUserBody(me)).toMatchObject({ emailVerified: true });

      const { response: otherSignUp } = await signUp(app);
      const otherToken = authBody(otherSignUp).accessToken;
      const lookup = await request(app.getHttpServer())
        .get(`/users/${signUpBody.username}`)
        .set(...authHeader(otherToken))
        .expect(200);
      expect(lookup.body).not.toHaveProperty('emailVerified');
    });

    it('rejects a malformed code with a plain 400, distinct from the uniform failure', async () => {
      const { response: signUpResponse } = await signUp(app);
      const token = authBody(signUpResponse).accessToken;

      const response = await request(app.getHttpServer())
        .post('/email-verification/confirm')
        .set(...authHeader(token))
        .send({ code: 'abc' });

      expect(response.status).toBe(400);
      expect(errorMessage(response)).not.toBe('Invalid or expired code');
    });

    it('is single-use: confirming the same code twice fails the second time', async () => {
      const { response: signUpResponse } = await signUp(app);
      const token = authBody(signUpResponse).accessToken;
      const code = extractCode(emailSender.sent[0]);

      await request(app.getHttpServer())
        .post('/email-verification/confirm')
        .set(...authHeader(token))
        .send({ code })
        .expect(200);

      const second = await request(app.getHttpServer())
        .post('/email-verification/confirm')
        .set(...authHeader(token))
        .send({ code });

      expect(second.status).toBe(400);
      expect(errorMessage(second)).toBe('Invalid or expired code');
    });

    it('still works just under 24 hours after issuance', async () => {
      const { response: signUpResponse } = await signUp(app);
      const token = authBody(signUpResponse).accessToken;
      const code = extractCode(emailSender.sent[0]);

      clock.set(new Date(BASELINE_NOW.getTime() + 24 * HOUR_MS - 1_000));

      await request(app.getHttpServer())
        .post('/email-verification/confirm')
        .set(...authHeader(token))
        .send({ code })
        .expect(200);
    });

    it('fails just over 24 hours after issuance', async () => {
      const { response: signUpResponse } = await signUp(app);
      const token = authBody(signUpResponse).accessToken;
      const code = extractCode(emailSender.sent[0]);

      clock.set(new Date(BASELINE_NOW.getTime() + 24 * HOUR_MS + 1_000));

      const response = await request(app.getHttpServer())
        .post('/email-verification/confirm')
        .set(...authHeader(token))
        .send({ code });

      expect(response.status).toBe(400);
      expect(errorMessage(response)).toBe('Invalid or expired code');
    });

    it('newest code wins: a superseded code fails, the latest one works', async () => {
      const { response: signUpResponse } = await signUp(app);
      const token = authBody(signUpResponse).accessToken;
      const oldCode = extractCode(emailSender.sent[0]);

      clock.set(new Date(BASELINE_NOW.getTime() + 60_000));
      await request(app.getHttpServer())
        .post('/email-verification/request')
        .set(...authHeader(token))
        .expect(204);
      const newCode = extractCode(emailSender.sent[1]);

      const usingOld = await request(app.getHttpServer())
        .post('/email-verification/confirm')
        .set(...authHeader(token))
        .send({ code: oldCode });
      expect(usingOld.status).toBe(400);
      expect(errorMessage(usingOld)).toBe('Invalid or expired code');

      await request(app.getHttpServer())
        .post('/email-verification/confirm')
        .set(...authHeader(token))
        .send({ code: newCode })
        .expect(200);
    });

    it('kills the code after 5 failed attempts, rejecting even the correct code after', async () => {
      const { response: signUpResponse } = await signUp(app);
      const token = authBody(signUpResponse).accessToken;
      const code = extractCode(emailSender.sent[0]);
      const wrong = wrongCodeFor(code);

      for (let attempt = 0; attempt < 5; attempt++) {
        const response = await request(app.getHttpServer())
          .post('/email-verification/confirm')
          .set(...authHeader(token))
          .send({ code: wrong });
        expect(response.status).toBe(400);
      }

      const finalAttempt = await request(app.getHttpServer())
        .post('/email-verification/confirm')
        .set(...authHeader(token))
        .send({ code });

      expect(finalAttempt.status).toBe(400);
      expect(errorMessage(finalAttempt)).toBe('Invalid or expired code');
    });
  });

  describe('unverified accounts', () => {
    it('stay fully usable — PATCH /users/me still works unverified', async () => {
      const { response: signUpResponse } = await signUp(app);
      const token = authBody(signUpResponse).accessToken;

      await request(app.getHttpServer())
        .patch('/users/me')
        .set(...authHeader(token))
        .send({ locale: 'vi' })
        .expect(200);
    });
  });
});
