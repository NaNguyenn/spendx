import { Body, Controller, HttpCode, Post, UseFilters } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthRateLimited } from '../auth/auth-rate-limit.decorator';
import { CurrentUserId } from '../auth/current-user.decorator';
import { RetryAfterExceptionFilter } from '../one-time-codes/retry-after.exception-filter';
import { PrivateUserDto } from '../users/dto/private-user.dto';
import { ConfirmEmailVerificationDto } from './dto/confirm-email-verification.dto';
import { EmailVerificationService } from './email-verification.service';

@ApiTags('email-verification')
@ApiBearerAuth()
@Controller('email-verification')
// Requesting a code is email-spammable and confirming is code-guessable —
// both earn the same tighter throttler AuthController opts into, for the
// same reason.
@AuthRateLimited()
@SkipThrottle({ default: true })
// Turns OneTimeCodeCooldownException (thrown from `request` below) into a
// 429 with a Retry-After header — see the filter's own doc comment.
@UseFilters(RetryAfterExceptionFilter)
export class EmailVerificationController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Post('request')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Send (or resend) an Email Verification One-Time Code',
    description:
      "Emails a fresh 6-digit code, valid 24 hours, to the caller's own " +
      'address in their account Locale. At most one send every 60 seconds.',
  })
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'Email already verified' })
  @ApiTooManyRequestsResponse({
    description:
      'A code was already sent within the last 60 seconds — see the ' +
      'Retry-After header (seconds) for how much longer to wait.',
  })
  requestVerification(@CurrentUserId() userId: string): Promise<void> {
    return this.emailVerificationService.requestVerification(userId);
  }

  @Post('confirm')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Confirm an Email Verification One-Time Code',
    description:
      'On success, marks the account verified and returns it. Wrong, ' +
      'expired, superseded, or dead (5 failed attempts) codes all report ' +
      'the same error — there is no way to tell which happened.',
  })
  @ApiOkResponse({ type: PrivateUserDto })
  @ApiBadRequestResponse({ description: 'Invalid or expired code' })
  confirmVerification(
    @CurrentUserId() userId: string,
    @Body() dto: ConfirmEmailVerificationDto,
  ): Promise<PrivateUserDto> {
    return this.emailVerificationService.confirmVerification(userId, dto.code);
  }
}
