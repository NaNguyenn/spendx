import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { EMAIL_SENDER } from './email-sender';
import { SmtpEmailSender } from './smtp-email-sender';

/**
 * Wires the EMAIL_SENDER seam (issue #19), a prefactor for issue #17's
 * email verification and password reset flows — no application flow sends
 * email yet.
 *
 * There is only ONE real implementation: SmtpEmailSender, talking to
 * Mailpit in development/test (see compose.yaml) and a real relay in
 * production, both by SMTP_HOST/SMTP_PORT/EMAIL_FROM (env.schema.ts) — a
 * factory (not `useClass`) so those settings are read from config once, the
 * same shape as DAILY_RATE_PROVIDER in daily-rates.module.ts. There is no
 * stub here: the fake sender that stands in for it in e2e tests lives in
 * test/helpers/email-sender.ts and overrides this same EMAIL_SENDER token
 * (test/helpers/app.ts) instead of being a second provider in src.
 */
@Module({
  providers: [
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new SmtpEmailSender({
          host: config.get('SMTP_HOST', { infer: true }),
          port: config.get('SMTP_PORT', { infer: true }),
          from: config.get('EMAIL_FROM', { infer: true }),
        }),
    },
  ],
  exports: [EMAIL_SENDER],
})
export class EmailModule {}
