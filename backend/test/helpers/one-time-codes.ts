import type { Email } from '../../src/email/email-sender';

/**
 * Codes are read only from the fake sender's captured emails, never the
 * database (an explicit acceptance criterion for issues #20 and #21) — the
 * templates put the code on its own line (src/email/templates), so this looks
 * for a line that is exactly six digits.
 */
export function extractCode(email: Email): string {
  const match = /^(\d{6})$/m.exec(email.text);
  if (!match) {
    throw new Error(
      `No 6-digit code line found in email text: ${JSON.stringify(email.text)}`,
    );
  }
  return match[1];
}

/** A 6-digit code guaranteed to differ from `code`. */
export function wrongCodeFor(code: string): string {
  return ((Number(code) + 1) % 1_000_000).toString().padStart(6, '0');
}
