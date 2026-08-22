import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './helpers/app';
import { signUp } from './helpers/auth';
import { FixedClock } from './helpers/clock';
import { FakeEmailSender, ThrowingEmailSender } from './helpers/email-sender';
import { authBody, errorMessage } from './helpers/http';
import { extractCode, wrongCodeFor } from './helpers/one-time-codes';

// Midday ICT, well clear of any day boundary — see daily-rate-snapshot.e2e-spec.ts
// for why the other suites pin their FixedClock the same way.
const BASELINE_NOW = new Date('2026-08-17T05:00:00.000Z');

const MINUTE_MS = 60 * 1000;

const NEW_PASSWORD = 'entirely new password';

describe('password reset', () => {
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

  function requestReset(email: string) {
    return request(app.getHttpServer())
      .post('/password-reset/request')
      .send({ email });
  }

  function confirmReset(body: {
    email: string;
    code: string;
    newPassword: string;
  }) {
    return request(app.getHttpServer())
      .post('/password-reset/confirm')
      .send(body);
  }

  function signIn(email: string, password: string) {
    return request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email, password });
  }

  function authHeader(token: string): [string, string] {
    return ['Authorization', `Bearer ${token}`];
  }

  describe('POST /password-reset/request', () => {
    it('emails a reset code in an en account’s Locale', async () => {
      const { body: account } = await signUp(app, { locale: 'en' });
      emailSender.clear();

      await requestReset(account.email).expect(204);

      expect(emailSender.sent).toHaveLength(1);
      const email = emailSender.sent[0];
      expect(email.to).toBe(account.email);
      expect(email.subject).toMatch(/reset/i);
      expect(email.text).toMatch(/reset/i);
      expect(email.text).toMatch(/expires in 15 minutes/i);
      expect(extractCode(email)).toMatch(/^\d{6}$/);
    });

    it('sends the vi copy for a locale: vi account', async () => {
      const { body: account } = await signUp(app, { locale: 'vi' });
      emailSender.clear();

      await requestReset(account.email).expect(204);

      expect(emailSender.sent).toHaveLength(1);
      const email = emailSender.sent[0];
      expect(email.to).toBe(account.email);
      expect(email.subject).toMatch(/Đặt lại mật khẩu/);
      expect(email.text).toMatch(/đặt lại mật khẩu/i);
      expect(email.text).toMatch(/hết hạn sau 15 phút/);
      expect(extractCode(email)).toMatch(/^\d{6}$/);
    });

    it('responds byte-identically for known, unknown, and cooldown-suppressed emails', async () => {
      const { body: account } = await signUp(app);
      emailSender.clear();

      const known = await requestReset(account.email);
      const unknown = await requestReset('nobody@example.com');
      // Same email again, inside the 60s cooldown — suppressed, not 429.
      const suppressed = await requestReset(account.email);

      for (const response of [known, unknown, suppressed]) {
        expect(response.status).toBe(204);
        expect(response.text).toBe(known.text);
        expect(response.headers['retry-after']).toBeUndefined();
      }
      // Only the first known-email request actually sent anything.
      expect(emailSender.sent).toHaveLength(1);
    });

    it('suppresses resends inside the 60s cooldown, sends again at/after it', async () => {
      const { body: account } = await signUp(app);
      emailSender.clear();

      await requestReset(account.email).expect(204);
      expect(emailSender.sent).toHaveLength(1);

      clock.set(new Date(BASELINE_NOW.getTime() + 30_000));
      await requestReset(account.email).expect(204);
      expect(emailSender.sent).toHaveLength(1);

      clock.set(new Date(BASELINE_NOW.getTime() + 60_000));
      await requestReset(account.email).expect(204);
      expect(emailSender.sent).toHaveLength(2);
    });

    it('stays indistinguishable when the sender itself fails', async () => {
      const throwingApp = await createTestApp({
        clock: new FixedClock(BASELINE_NOW),
        emailSender: new ThrowingEmailSender(),
      });
      try {
        const { body: account } = await signUp(throwingApp);

        const known = await request(throwingApp.getHttpServer())
          .post('/password-reset/request')
          .send({ email: account.email });
        const unknown = await request(throwingApp.getHttpServer())
          .post('/password-reset/request')
          .send({ email: 'nobody@example.com' });

        expect(known.status).toBe(204);
        expect(unknown.status).toBe(204);
        expect(known.text).toBe(unknown.text);
      } finally {
        await throwingApp.close();
      }
    });
  });

  describe('POST /password-reset/confirm', () => {
    it('resets the password: old one stops working, new one signs in, no auto-sign-in', async () => {
      const { body: account } = await signUp(app);
      emailSender.clear();

      await requestReset(account.email).expect(204);
      const code = extractCode(emailSender.sent[0]);

      const confirmResponse = await confirmReset({
        email: account.email,
        code,
        newPassword: NEW_PASSWORD,
      });
      expect(confirmResponse.status).toBe(200);
      expect(confirmResponse.body).not.toHaveProperty('accessToken');

      await signIn(account.email, account.password).expect(401);

      const signInResponse = await signIn(account.email, NEW_PASSWORD);
      expect(signInResponse.status).toBe(200);

      // The fresh token survives the guard's credentials-changed check: its
      // real-clock iat (today) postdates the BASELINE_NOW stamp (in the past).
      await request(app.getHttpServer())
        .get('/users/me')
        .set(...authHeader(authBody(signInResponse).accessToken))
        .expect(200);
    });

    it('rejects an unknown email with the uniform error', async () => {
      const response = await confirmReset({
        email: 'nobody@example.com',
        code: '123456',
        newPassword: NEW_PASSWORD,
      });

      expect(response.status).toBe(400);
      expect(errorMessage(response)).toBe('Invalid or expired code');
    });

    it('rejects a wrong code with the uniform error', async () => {
      const { body: account } = await signUp(app);
      emailSender.clear();
      await requestReset(account.email).expect(204);
      const code = extractCode(emailSender.sent[0]);

      const response = await confirmReset({
        email: account.email,
        code: wrongCodeFor(code),
        newPassword: NEW_PASSWORD,
      });

      expect(response.status).toBe(400);
      expect(errorMessage(response)).toBe('Invalid or expired code');
      await signIn(account.email, account.password).expect(200);
    });

    it('still works just under 15 minutes after issuance', async () => {
      const { body: account } = await signUp(app);
      emailSender.clear();
      await requestReset(account.email).expect(204);
      const code = extractCode(emailSender.sent[0]);

      clock.set(new Date(BASELINE_NOW.getTime() + 15 * MINUTE_MS - 1_000));

      await confirmReset({
        email: account.email,
        code,
        newPassword: NEW_PASSWORD,
      }).expect(200);
    });

    it('fails just over 15 minutes after issuance, with the uniform error', async () => {
      const { body: account } = await signUp(app);
      emailSender.clear();
      await requestReset(account.email).expect(204);
      const code = extractCode(emailSender.sent[0]);

      clock.set(new Date(BASELINE_NOW.getTime() + 15 * MINUTE_MS + 1_000));

      const response = await confirmReset({
        email: account.email,
        code,
        newPassword: NEW_PASSWORD,
      });

      expect(response.status).toBe(400);
      expect(errorMessage(response)).toBe('Invalid or expired code');
    });

    it('is single-use: replaying a consumed code fails and changes nothing', async () => {
      const { body: account } = await signUp(app);
      emailSender.clear();
      await requestReset(account.email).expect(204);
      const code = extractCode(emailSender.sent[0]);

      await confirmReset({
        email: account.email,
        code,
        newPassword: NEW_PASSWORD,
      }).expect(200);

      const replay = await confirmReset({
        email: account.email,
        code,
        newPassword: 'attacker chosen password',
      });

      expect(replay.status).toBe(400);
      expect(errorMessage(replay)).toBe('Invalid or expired code');
      await signIn(account.email, 'attacker chosen password').expect(401);
      await signIn(account.email, NEW_PASSWORD).expect(200);
    });

    it('newest code wins: a superseded code fails, the latest one works', async () => {
      const { body: account } = await signUp(app);
      emailSender.clear();
      await requestReset(account.email).expect(204);
      const oldCode = extractCode(emailSender.sent[0]);

      clock.set(new Date(BASELINE_NOW.getTime() + 60_000));
      await requestReset(account.email).expect(204);
      const newCode = extractCode(emailSender.sent[1]);

      const usingOld = await confirmReset({
        email: account.email,
        code: oldCode,
        newPassword: NEW_PASSWORD,
      });
      expect(usingOld.status).toBe(400);
      expect(errorMessage(usingOld)).toBe('Invalid or expired code');

      await confirmReset({
        email: account.email,
        code: newCode,
        newPassword: NEW_PASSWORD,
      }).expect(200);
    });

    it('kills the code after 5 failed attempts, rejecting even the correct code after', async () => {
      const { body: account } = await signUp(app);
      emailSender.clear();
      await requestReset(account.email).expect(204);
      const code = extractCode(emailSender.sent[0]);
      const wrong = wrongCodeFor(code);

      for (let attempt = 0; attempt < 5; attempt++) {
        const response = await confirmReset({
          email: account.email,
          code: wrong,
          newPassword: NEW_PASSWORD,
        });
        expect(response.status).toBe(400);
      }

      const finalAttempt = await confirmReset({
        email: account.email,
        code,
        newPassword: NEW_PASSWORD,
      });

      expect(finalAttempt.status).toBe(400);
      expect(errorMessage(finalAttempt)).toBe('Invalid or expired code');
      await signIn(account.email, account.password).expect(200);
    });

    it('rejects a malformed code with a plain 400, distinct from the uniform failure', async () => {
      const response = await confirmReset({
        email: 'whoever@example.com',
        code: 'abc',
        newPassword: NEW_PASSWORD,
      });

      expect(response.status).toBe(400);
      expect(errorMessage(response)).not.toBe('Invalid or expired code');
    });

    it('rejects a too-short new password with a field-naming 400, distinct from the uniform failure', async () => {
      const response = await confirmReset({
        email: 'whoever@example.com',
        code: '123456',
        newPassword: 'short',
      });

      expect(response.status).toBe(400);
      expect(errorMessage(response)).toContain('newPassword');
      expect(errorMessage(response)).not.toBe('Invalid or expired code');
    });
  });

  describe('session revocation (ADR-0010)', () => {
    it('a completed reset rejects every previously issued token', async () => {
      const { response: signUpResponse, body: account } = await signUp(app);
      const preResetToken = authBody(signUpResponse).accessToken;

      await request(app.getHttpServer())
        .get('/users/me')
        .set(...authHeader(preResetToken))
        .expect(200);

      // The token's iat comes from the real clock (inside jsonwebtoken); the
      // credentials-changed stamp comes from the app's injected clock. Pinning
      // the fake clock a day into the real future is what makes the pre-reset
      // token demonstrably predate the stamp.
      const future = new Date(Date.now() + 24 * 60 * MINUTE_MS);
      clock.set(future);
      emailSender.clear();

      await requestReset(account.email).expect(204);
      const code = extractCode(emailSender.sent[0]);
      await confirmReset({
        email: account.email,
        code,
        newPassword: NEW_PASSWORD,
      }).expect(200);

      await request(app.getHttpServer())
        .get('/users/me')
        .set(...authHeader(preResetToken))
        .expect(401);

      // Sign-in itself never consults iat — only the new password works. (A
      // token issued now would carry a real-clock iat behind the future stamp,
      // so the fresh-token-works half of the story is asserted in the confirm
      // suite above, where the stamp sits at BASELINE_NOW.)
      await signIn(account.email, account.password).expect(401);
      await signIn(account.email, NEW_PASSWORD).expect(200);
    });
  });
});
