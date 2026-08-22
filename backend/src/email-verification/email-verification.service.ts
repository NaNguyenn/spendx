import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CLOCK, type Clock } from '../clock/clock';
import type { OneTimeCodePurpose } from '../domain/one-time-code-purpose';
import { EMAIL_SENDER, type EmailSender } from '../email/email-sender';
import { renderEmailVerificationEmail } from '../email/templates/email-verification-email';
import { OneTimeCodesService } from '../one-time-codes/one-time-codes.service';
import { PrivateUserDto } from '../users/dto/private-user.dto';
import { toPrivateUser } from '../users/user-view';
import { UsersRepository } from '../users/users.repository';

/** Email Verification codes live 24 hours (backend/CONTEXT.md — One-Time Code). */
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

const PURPOSE: OneTimeCodePurpose = 'email_verification';

const INVALID_OR_EXPIRED_CODE_MESSAGE = 'Invalid or expired code';

/**
 * Email Verification (backend/CONTEXT.md): confirming a One-Time Code marks
 * `User.emailVerifiedAt`. Gates nothing — accounts are fully usable
 * unverified; the state is visible only to the owner, on `PrivateUserDto`.
 */
@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly oneTimeCodesService: OneTimeCodesService,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Issues a fresh 24h One-Time Code and emails it to the caller's own
   * address, in their Locale. Lets `OneTimeCodeCooldownException` (429)
   * propagate unchanged — this method makes no HTTP decision beyond the
   * 409 below.
   */
  async requestVerification(userId: string): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      // Unreachable through JwtAuthGuard, which already resolved userId to a
      // live User — kept so this method has no unsound branch of its own.
      throw new NotFoundException('User not found');
    }
    if (user.emailVerifiedAt !== null) {
      throw new ConflictException('Email already verified');
    }

    const code = await this.oneTimeCodesService.issue({
      userId,
      purpose: PURPOSE,
      ttlMs: VERIFICATION_TTL_MS,
    });

    const { subject, text } = renderEmailVerificationEmail(user.locale, {
      code,
    });
    await this.emailSender.send({ to: user.email, subject, text });
  }

  /**
   * Confirms `code` and, on success, stamps `User.emailVerifiedAt`. Every
   * failure — wrong, expired, superseded, dead, or none outstanding — reports
   * the same 400 so this endpoint is never an oracle for which happened
   * (backend/CONTEXT.md — One-Time Code).
   */
  async confirmVerification(
    userId: string,
    code: string,
  ): Promise<PrivateUserDto> {
    const confirmed = await this.oneTimeCodesService.confirm({
      userId,
      purpose: PURPOSE,
      code,
    });
    if (!confirmed) {
      throw new BadRequestException(INVALID_OR_EXPIRED_CODE_MESSAGE);
    }

    const user = await this.usersRepository.markEmailVerified(
      userId,
      this.clock.now(),
    );
    return toPrivateUser(user);
  }
}
