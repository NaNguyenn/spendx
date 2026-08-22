import { apiPost } from '@/api/client';

/**
 * Thin wrappers around the `/password-reset` endpoints — same shape as
 * email-verification.ts, minus the token: Password Reset happens signed out
 * (backend/CONTEXT.md — Password Reset), so both endpoints are public.
 */

/**
 * Asks for a 6-digit reset code, valid 15 minutes, emailed in the account's
 * Locale. Always answers 204 — known email, unknown email, and a request
 * inside the 60-second cooldown are deliberately indistinguishable, so the
 * caller drives its own resend countdown (lib/one-time-code.ts's
 * `RESEND_COOLDOWN_SECONDS`) instead of reading anything from the response.
 */
export function requestPasswordReset(email: string): Promise<void> {
  return apiPost('/password-reset/request', { email });
}

/**
 * Confirms a code and sets the new password. Success is a plain 200 with no
 * session — the user signs in with the new password, and every previously
 * issued token is revoked. Unknown email and wrong, expired, superseded, or
 * dead codes all answer the same 400 "Invalid or expired code".
 */
export function confirmPasswordReset(input: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<void> {
  return apiPost('/password-reset/confirm', input);
}
