import { ApiError } from '@/api/client';
import type { TranslationKey } from '@/i18n/en';

/**
 * Nest's default error body is `{ statusCode, message, error }`, where
 * `message` is a string (our hand-written checks, e.g. "Invalid email or
 * password") or a string[] (class-validator's per-field messages). The API
 * doesn't localize that text (see backend/CONTEXT.md's Locale entry — it
 * covers UI strings and templates, not this), so it is relayed as-is rather
 * than run through translation; only this file's own fallbacks (no body, no
 * network) are `TranslationKey`s the UI translates. Keeps this pure — no
 * dependency on a translation provider — while still being drift-proof
 * against a renamed/removed key, via the `TranslationKey` import.
 */
export type ApiErrorMessage =
  { kind: 'server'; text: string } | { kind: 'key'; key: TranslationKey };

export function getErrorMessage(error: unknown): ApiErrorMessage {
  if (error instanceof ApiError) {
    const body = error.body;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === 'string' && message.length > 0) {
        return { kind: 'server', text: message };
      }
      if (
        Array.isArray(message) &&
        message.every((entry) => typeof entry === 'string')
      ) {
        return { kind: 'server', text: message.join(' ') };
      }
    }
    return { kind: 'key', key: 'apiError.generic' };
  }

  if (error instanceof TypeError) {
    // What `fetch` rejects with when it can't reach the server at all.
    return { kind: 'key', key: 'apiError.network' };
  }

  return { kind: 'key', key: 'apiError.generic' };
}

/**
 * Which Sign Up field a 409 conflict names, so the screen can attach the
 * error to that field instead of only showing a banner. Only meaningful for
 * a server-relayed message — a screen should not call this on a `'key'`
 * result.
 *
 * The API answers a duplicate with exactly "Email already registered" or
 * "Username already taken" (backend/src/auth/auth.service.ts); anything else
 * falls back to a banner, so a reworded message degrades rather than breaks.
 */
export function classifySignUpError(
  message: string,
): 'email' | 'username' | 'general' {
  const lower = message.toLowerCase();
  if (lower.includes('email')) return 'email';
  if (lower.includes('username')) return 'username';
  return 'general';
}
