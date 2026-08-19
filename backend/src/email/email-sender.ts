export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

/** One outbound email — the from-address is the sender's own config, not per-call. */
export interface Email {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends outbound email — a prefactor (issue #19) for the two flows that will
 * use it (issue #17, email verification + password reset). No application
 * flow sends email yet; this seam exists so those flows are written against
 * an interface from day one rather than nodemailer directly.
 *
 * `SmtpEmailSender` is the sole real implementation, delivering over SMTP to
 * Mailpit in development and a real relay in production (see EmailModule).
 * A test fake (`test/helpers/email-sender.ts`) records every send instead.
 *
 * A Symbol injection token because the interface is erased at compile time
 * (rules/di-use-interfaces-tokens.md).
 */
export interface EmailSender {
  send(email: Email): Promise<void>;
}
