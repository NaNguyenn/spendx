import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Email, EmailSender } from './email-sender';

export interface SmtpEmailSenderConfig {
  host: string;
  port: number;
  /** The `From:` header on every message — see `EMAIL_FROM` in env.schema.ts. */
  from: string;
}

/**
 * The real `EmailSender` (issue #19): delivers over SMTP via nodemailer, to
 * Mailpit in development (see compose.yaml) and a real relay in production.
 *
 * `nodemailer.createTransport` is lazy — it opens no connection until a
 * send — which is why this needs no special handling in e2e, where no SMTP
 * server runs at all.
 */
@Injectable()
export class SmtpEmailSender implements EmailSender {
  private readonly transporter: ReturnType<typeof nodemailer.createTransport>;

  constructor(private readonly config: SmtpEmailSenderConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
    });
  }

  async send(email: Email): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: email.to,
      subject: email.subject,
      text: email.text,
    });
  }
}
