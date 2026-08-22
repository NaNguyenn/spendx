import { ApiError } from '@/api/client';
import { RESEND_COOLDOWN_SECONDS } from '@/lib/one-time-code';

/**
 * Pure decisions specific to the Verify Email screen (app/verify-email.tsx,
 * issue #20). The purpose-generic pieces (code shape, the cooldown constant)
 * live in lib/one-time-code.ts, shared with Password Reset — what stays here
 * is the one thing only verification has: a resend endpoint that *answers*
 * with a 429, since its caller is signed in and there is no account
 * existence to hide.
 */

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
