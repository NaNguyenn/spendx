import { apiPost, type OkJson } from '@/api/client';
import type { paths } from '@/api/schema';

/**
 * Thin wrappers around the `/email-verification` endpoints — same shape as
 * blocks.ts. Domain vocabulary (One-Time Code, Email Verification) is
 * backend/CONTEXT.md's Email Verification section: gates nothing, visible
 * only to the owner on Profile.
 */

export type ConfirmedEmailVerificationUser = OkJson<
  paths['/email-verification/confirm']['post']
>;

/**
 * Sends (or resends) the 6-digit code to the caller's own address. 204 on
 * success; the caller handles 409 (already verified) and 429 (inside the
 * 60-second cooldown — see the thrown ApiError's `retryAfterSeconds`) itself,
 * per lib/email-verification.ts's `resendCooldownSeconds`.
 */
export function requestVerificationEmail(token: string): Promise<void> {
  return apiPost('/email-verification/request', undefined, { token });
}

/**
 * Confirms a code and returns the now-verified account. A wrong, expired,
 * superseded, or dead (5 failed attempts) code all answer the same 400
 * "Invalid or expired code" — there is no way to tell which happened, so the
 * caller can't either.
 */
export function confirmEmailVerification(
  code: string,
  token: string,
): Promise<ConfirmedEmailVerificationUser> {
  return apiPost('/email-verification/confirm', { code }, { token });
}
