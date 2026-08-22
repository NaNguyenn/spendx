import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown by `OneTimeCodesService.issue` when a code for the same
 * (userId, purpose) was issued less than the cooldown ago (see
 * `ONE_TIME_CODE_COOLDOWN_MS` in `one-time-codes.service.ts`). Lives here,
 * not in either flow's own module, because the cooldown is machinery-level —
 * shared by Email Verification and Password Reset (backend/CONTEXT.md).
 *
 * `retryAfterSeconds` is read by `RetryAfterExceptionFilter` to set the
 * standard `Retry-After` header — a plain `HttpException` body can carry the
 * number in its JSON, but not in a header, so the caller needs a filter
 * (rules/error-use-exception-filters.md) rather than the exception alone.
 */
export class OneTimeCodeCooldownException extends HttpException {
  constructor(public readonly retryAfterSeconds: number) {
    super(
      `A code was already sent — try again in ${retryAfterSeconds} second(s)`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
