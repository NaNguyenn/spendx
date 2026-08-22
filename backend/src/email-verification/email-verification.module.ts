import { Module } from '@nestjs/common';
import { ClockModule } from '../clock/clock.module';
import { EmailModule } from '../email/email.module';
import { OneTimeCodesModule } from '../one-time-codes/one-time-codes.module';
import { UsersModule } from '../users/users.module';
import { EmailVerificationController } from './email-verification.controller';
import { EmailVerificationService } from './email-verification.service';

/**
 * Email Verification (backend/CONTEXT.md): confirming a One-Time Code marks
 * `User.emailVerifiedAt`. Gates nothing — see `EmailVerificationService`.
 *
 * Imported by `AuthModule` (to auto-send on sign-up) — never the reverse.
 * This module only imports `UsersModule`/`EmailModule`/`OneTimeCodesModule`,
 * none of which import `AuthModule`, so the graph stays a DAG
 * (rules/arch-avoid-circular-deps.md).
 */
@Module({
  imports: [UsersModule, EmailModule, OneTimeCodesModule, ClockModule],
  controllers: [EmailVerificationController],
  providers: [EmailVerificationService],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}
