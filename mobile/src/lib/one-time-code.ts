/**
 * Purpose-generic One-Time Code decisions (backend/CONTEXT.md — One-Time
 * Code), shared by the Verify Email screen (issue #20) and the Password Reset
 * screens (issue #21). Kept out of the screens so they're unit-tested without
 * mounting anything (see this file's own .test.ts).
 */

/**
 * The full resend cooldown, in seconds — the machinery allows at most one
 * send every 60 seconds per purpose. Also the countdown a screen starts
 * after a successful send, since the server enforces the same window from
 * that moment. For Password Reset this client-side start is the *only*
 * countdown source: the request endpoint deliberately answers a cooldown
 * with the same 204 as a fresh send, so nothing reveals whether an email has
 * an account.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Exactly 6 ASCII digits — the shape every One-Time Code is emailed in. */
export function isValidOneTimeCode(input: string): boolean {
  return /^[0-9]{6}$/.test(input);
}
