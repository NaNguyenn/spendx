import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { OneTimeCodeCooldownException } from './one-time-code-cooldown.exception';

/**
 * Turns `OneTimeCodeCooldownException` into a 429 carrying the standard
 * `Retry-After` header — the one piece of HTTP shape a thrown `HttpException`
 * can't carry on its own (its JSON body can, a header needs the raw
 * response). Apply with `@UseFilters` on whichever controller calls
 * `OneTimeCodesService.issue` (see `EmailVerificationController`); scoped,
 * not global, since nothing else throws this exception.
 */
@Catch(OneTimeCodeCooldownException)
export class RetryAfterExceptionFilter implements ExceptionFilter {
  catch(exception: OneTimeCodeCooldownException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response
      .status(exception.getStatus())
      .set('Retry-After', String(exception.retryAfterSeconds))
      .json({
        statusCode: exception.getStatus(),
        message: exception.message,
      });
  }
}
