import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PASSWORD_HASHER, type PasswordHasher } from '../auth/password-hasher';
import { CLOCK, type Clock } from '../clock/clock';
import type { OneTimeCodePurpose } from '../domain/one-time-code-purpose';
import { EMAIL_SENDER, type EmailSender } from '../email/email-sender';
import { renderPasswordResetEmail } from '../email/templates/password-reset-email';
import { OneTimeCodeCooldownException } from '../one-time-codes/one-time-code-cooldown.exception';
import {
  INVALID_OR_EXPIRED_CODE_MESSAGE,
  OneTimeCodesService,
} from '../one-time-codes/one-time-codes.service';
import { UsersRepository } from '../users/users.repository';

/** Password Reset codes live 15 minutes (backend/CONTEXT.md — One-Time Code). */
const RESET_TTL_MS = 15 * 60 * 1000;

const PURPOSE: OneTimeCodePurpose = 'password_reset';

// Hashed in place of a real code when the request names an unknown email, so
// both branches pay the one scrypt call that dominates their CPU cost — the
// same discipline as AuthService's sign-in dummy. The known-email branch
// still does I/O (a row upsert, the send) the unknown one doesn't, so this
// narrows the timing oracle for "does this email have an account" rather
// than closing it; the byte-identical response is the guarantee the spec
// actually makes.
const DUMMY_CODE_FOR_TIMING_SAFETY = 'spendx-password-reset-timing-dummy';

/**
 * Password Reset (backend/CONTEXT.md): replaces a forgotten password via a
 * One-Time Code sent to the account email, without being signed in.
 * Requesting one for an unknown email must be indistinguishable from a known
 * one, so `requestReset` answers identically — and never throws — no matter
 * what happened. Completing a reset stamps `User.credentialsChangedAt`,
 * which is what ends every existing session (docs/adr/0010).
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly oneTimeCodesService: OneTimeCodesService,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Issues a fresh 15-minute One-Time Code and emails it, in the account's
   * Locale. Every outcome — unknown email, cooldown still running, even the
   * sender failing — returns the same void success, because any distinct
   * response (the 429 Email Verification surfaces, a 500 from SMTP) would
   * confirm the email has an account. The cost is that a genuine delivery
   * failure is only visible in the logs.
   */
  async requestReset(email: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      await this.passwordHasher.hash(DUMMY_CODE_FOR_TIMING_SAFETY);
      return;
    }

    try {
      const code = await this.oneTimeCodesService.issue({
        userId: user.id,
        purpose: PURPOSE,
        ttlMs: RESET_TTL_MS,
      });
      const { subject, text } = renderPasswordResetEmail(user.locale, {
        code,
      });
      await this.emailSender.send({ to: user.email, subject, text });
    } catch (error: unknown) {
      if (error instanceof OneTimeCodeCooldownException) {
        // Suppressed, not surfaced: the mobile resend countdown is
        // client-driven for exactly this reason.
        return;
      }
      this.logger.error(
        'Failed to send the Password Reset code',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Confirms `code` for the account behind `email` and, on success, replaces
   * the password and stamps `credentialsChangedAt` in the same write. Unknown
   * email and every code failure — wrong, expired, superseded, dead — report
   * the same 400, so this endpoint is never an oracle for which happened, nor
   * for whether the email has an account. Success is a plain 200: no session
   * is issued, the caller signs in with the new password.
   */
  async confirmReset(params: {
    email: string;
    code: string;
    newPassword: string;
  }): Promise<void> {
    const { email, code, newPassword } = params;
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      // Costs the same as a known email with no outstanding code — the only
      // cheap branch confirm() itself has — so timing stays quiet too.
      throw new BadRequestException(INVALID_OR_EXPIRED_CODE_MESSAGE);
    }

    const confirmed = await this.oneTimeCodesService.confirm({
      userId: user.id,
      purpose: PURPOSE,
      code,
    });
    if (!confirmed) {
      throw new BadRequestException(INVALID_OR_EXPIRED_CODE_MESSAGE);
    }

    const passwordHash = await this.passwordHasher.hash(newPassword);
    await this.usersRepository.changePassword(
      user.id,
      passwordHash,
      this.clock.now(),
    );
  }
}
