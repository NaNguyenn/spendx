import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import { EMAIL_SENDER, type EmailSender } from '../src/email/email-sender';
import { createTestApp } from './helpers/app';
import { FakeEmailSender } from './helpers/email-sender';

/**
 * Proves the EMAIL_SENDER seam (issue #19) is actually wired through DI: a
 * fake handed to `createTestApp` is the instance the app resolves, not a
 * separate object the override silently no-ops on. No application flow
 * sends email yet (that's issue #17), so this is the harness for the seam
 * itself — the same role daily-rate-snapshot.e2e-spec.ts plays for
 * DAILY_RATE_PROVIDER, kept in its own file because harness.e2e-spec.ts is
 * scoped to the database guarantees only.
 */
describe('email sender seam', () => {
  let app: INestApplication<App>;
  let emailSender: FakeEmailSender;

  beforeAll(async () => {
    emailSender = new FakeEmailSender();
    app = await createTestApp({ emailSender });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    emailSender.clear();
  });

  it('captures a send made through the resolved EMAIL_SENDER token', async () => {
    const resolved = app.get<EmailSender>(EMAIL_SENDER);

    await resolved.send({
      to: 'user@example.com',
      subject: 'Welcome to spendx',
      text: 'Hello!',
    });

    expect(emailSender.sent).toEqual([
      {
        to: 'user@example.com',
        subject: 'Welcome to spendx',
        text: 'Hello!',
      },
    ]);
  });
});
