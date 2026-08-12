import { ApiError } from '@/api/client';

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_MESSAGE =
  "Couldn't reach the server. Check your connection and try again.";

/**
 * Nest's default error body is `{ statusCode, message, error }`, where
 * `message` is a string (our hand-written checks, e.g. "Invalid email or
 * password") or a string[] (class-validator's per-field messages). Turns
 * either into one line fit for a form's error banner.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
      if (
        Array.isArray(message) &&
        message.every((entry) => typeof entry === 'string')
      ) {
        return message.join(' ');
      }
    }
    return GENERIC_MESSAGE;
  }

  if (error instanceof TypeError) {
    // What `fetch` rejects with when it can't reach the server at all.
    return NETWORK_MESSAGE;
  }

  return GENERIC_MESSAGE;
}

/**
 * Which Sign Up field a 409 conflict names, so the screen can attach the
 * error to that field instead of only showing a banner.
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
