import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthRateLimited } from '../auth/auth-rate-limit.decorator';
import { Public } from '../auth/public.decorator';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { PasswordResetService } from './password-reset.service';

@ApiTags('password-reset')
// Both routes serve a user who cannot sign in — public by definition.
@Public()
@Controller('password-reset')
// Requesting is email-spammable and confirming is code-guessable — the same
// tighter throttler AuthController opts into, for the same reason.
@AuthRateLimited()
@SkipThrottle({ default: true })
// Unlike EmailVerificationController, no RetryAfterExceptionFilter: the
// cooldown never escapes PasswordResetService, because a 429 here would
// reveal that the email has an account.
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post('request')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Send a Password Reset One-Time Code',
    description:
      'Emails a fresh 6-digit code, valid 15 minutes, in the account Locale. ' +
      'Responds 204 identically whether the email is known, unknown, or ' +
      'inside the 60-second resend cooldown — this endpoint deliberately ' +
      'reveals nothing about which emails have accounts.',
  })
  @ApiNoContentResponse()
  requestReset(@Body() dto: RequestPasswordResetDto): Promise<void> {
    return this.passwordResetService.requestReset(dto.email);
  }

  @Post('confirm')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Confirm a Password Reset One-Time Code and set a new password',
    description:
      'On success, replaces the password and ends every existing session; ' +
      'the caller signs in with the new password — no session is issued ' +
      'here. Unknown email and wrong, expired, superseded, or dead codes ' +
      'all report the same error.',
  })
  @ApiOkResponse()
  @ApiBadRequestResponse({ description: 'Invalid or expired code' })
  confirmReset(@Body() dto: ConfirmPasswordResetDto): Promise<void> {
    return this.passwordResetService.confirmReset({
      email: dto.email,
      code: dto.code,
      newPassword: dto.newPassword,
    });
  }
}
