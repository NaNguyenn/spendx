import type { Email, EmailSender } from '../../src/email/email-sender';

/**
 * An `EmailSender` test double: tests "assert an email was sent" through
 * this seam (issue #19) by reading `sent` after triggering a flow, never by
 * inspecting a real inbox — the third override seam in `createTestApp`
 * (`helpers/app.ts`), alongside `helpers/clock.ts` and
 * `helpers/daily-rate-provider.ts`.
 */
export class FakeEmailSender implements EmailSender {
  readonly sent: Email[] = [];

  send(email: Email): Promise<void> {
    this.sent.push(email);
    return Promise.resolve();
  }

  /** Clears every send recorded so far — call between tests sharing one app. */
  clear(): void {
    this.sent.length = 0;
  }
}

/**
 * An `EmailSender` whose every send rejects — for proving a flow that sends
 * email as a side effect (e.g. sign-up's auto Email Verification send)
 * survives the sender being down, rather than failing the caller's request.
 */
export class ThrowingEmailSender implements EmailSender {
  send(): Promise<void> {
    return Promise.reject(new Error('simulated email sender failure'));
  }
}
