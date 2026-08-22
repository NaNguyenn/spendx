import { ApiError } from '@/api/client';

import { resendCooldownSeconds } from './email-verification';
import { RESEND_COOLDOWN_SECONDS } from './one-time-code';

describe('resendCooldownSeconds', () => {
  it('uses the server-reported remaining cooldown from a 429', () => {
    const error = new ApiError(429, undefined, 12);
    expect(resendCooldownSeconds(error)).toBe(12);
  });

  it('falls back to the full cooldown for a 429 with no parsed Retry-After', () => {
    const error = new ApiError(429, undefined, undefined);
    expect(resendCooldownSeconds(error)).toBe(RESEND_COOLDOWN_SECONDS);
  });

  it('falls back to the full cooldown after a fresh, successful send (no error)', () => {
    expect(resendCooldownSeconds(undefined)).toBe(RESEND_COOLDOWN_SECONDS);
  });

  it('ignores retryAfterSeconds on a non-429 ApiError', () => {
    const error = new ApiError(409, undefined, 12);
    expect(resendCooldownSeconds(error)).toBe(RESEND_COOLDOWN_SECONDS);
  });

  it('falls back to the full cooldown for a non-ApiError value', () => {
    expect(resendCooldownSeconds(new TypeError('Network request failed'))).toBe(
      RESEND_COOLDOWN_SECONDS,
    );
  });
});
