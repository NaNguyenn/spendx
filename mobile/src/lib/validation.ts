/**
 * The client-side mirror of the rules the API enforces on sign-up
 * (backend/src/auth/dto/sign-up.dto.ts). Pure functions only, so a screen can
 * block a submit before spending a round-trip on it — the server remains the
 * source of truth and re-validates everything, so the worst a drift here can
 * do is show a message the server would also have produced.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

/** 8–128 characters, no composition rules. */
export function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}

/** 3–30 chars, `^[a-z0-9_]+$`, case-insensitive (compared lowercased). */
export function isValidUsername(username: string): boolean {
  const normalized = normalizeUsername(username);
  return (
    normalized.length >= 3 &&
    normalized.length <= 30 &&
    USERNAME_PATTERN.test(normalized)
  );
}

/** 1–50 chars after trimming. */
export function isValidDisplayName(displayName: string): boolean {
  const trimmed = displayName.trim();
  return trimmed.length >= 1 && trimmed.length <= 50;
}

export interface SignUpFormValues {
  displayName: string;
  username: string;
  email: string;
  password: string;
}

export interface SignUpFormErrors {
  displayName?: string;
  username?: string;
  email?: string;
  password?: string;
}

export function validateSignUpForm(values: SignUpFormValues): SignUpFormErrors {
  const errors: SignUpFormErrors = {};

  if (!isValidDisplayName(values.displayName)) {
    errors.displayName = 'Enter a display name up to 50 characters.';
  }
  if (!isValidUsername(values.username)) {
    errors.username =
      '3–30 characters: lowercase letters, numbers, and underscore only.';
  }
  if (!isValidEmail(values.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!isValidPassword(values.password)) {
    errors.password = 'Password must be 8–128 characters.';
  }

  return errors;
}
