import { ApiError } from '@/api/client';

/**
 * Pure decisions for the Verify Email screen (app/verify-email.tsx, issue
 * #20): the code's shape, and how long the resend countdown should run for
 * after a request attempt. Kept out of the screen so both branches — a fresh
 * send and a cooldown 429 — are unit-tested without mounting anything (see
 * this file's own .test.ts).
 */

/**
 * The full resend cooldown, in seconds — backend/CONTEXT.md's Email
 * Verification: "at most one send every 60 seconds". Also the countdown a
 * screen starts after a successful send, since the server enforces the same
 * window from that moment.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Exactly 6 ASCII digits — the shape the One-Time Code is emailed in. */
export function isValidVerificationCode(input: string): boolean {
  return /^[0-9]{6}$/.test(input);
}

/**
 * How long to start the resend countdown at after a request attempt: the
 * server's own remaining cooldown when the 429 carries a parsed
 * `Retry-After` (client.ts's `ApiError#retryAfterSeconds`), otherwise the
 * full cooldown — including for a 429 whose header this client couldn't
 * parse, since the server is still inside *some* cooldown even when the
 * exact remainder is unknown.
 */
export function resendCooldownSeconds(error: unknown): number {
  if (
    error instanceof ApiError &&
    error.status === 429 &&
    error.retryAfterSeconds !== undefined
  ) {
    return error.retryAfterSeconds;
  }
  return RESEND_COOLDOWN_SECONDS;
}
