import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EMAIL_SENDER, type EmailSender } from '../email/email-sender';

/**
 * Dev smoke test for the EMAIL_SENDER seam (issue #19): sends one real email
 * through whichever EmailSender is wired — SmtpEmailSender talking to
 * Mailpit by default (compose.yaml, .env.example) — and exits. Never run by
 * CI or the test suite; those go through FakeEmailSender instead
 * (test/helpers/email-sender.ts). Run via `make mail-smoke` after `make up`.
 */
async function sendSmokeEmail(): Promise<void> {
  // createApplicationContext, not create: this script never serves HTTP, so
  // no Express adapter is needed (unlike generate-openapi.ts, which needs
  // the HTTP app for Swagger). abortOnError: false — see generate-openapi.ts
  // for why (a swallowed bootstrap failure with no output is worse than a
  // rejected promise here).
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });

  const sender = app.get<EmailSender>(EMAIL_SENDER);
  await sender.send({
    to: 'smoke-test@spendx.local',
    subject: 'spendx email smoke test',
    text: `Sent at ${new Date().toISOString()}. If you can read this in Mailpit (http://localhost:8025), SmtpEmailSender is wired correctly.`,
  });
  await app.close();

  console.log('Sent smoke email — check Mailpit at http://localhost:8025');
}

sendSmokeEmail().catch((error: unknown) => {
  console.error('Failed to send smoke email:');
  console.error(error);
  process.exitCode = 1;
});
