import { Module } from '@nestjs/common';
import { ScryptPasswordHasher } from '../auth/scrypt-password-hasher';
import { ClockModule } from '../clock/clock.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ONE_TIME_CODE_HASHER } from './one-time-code-hasher';
import { OneTimeCodesRepository } from './one-time-codes.repository';
import { OneTimeCodesService } from './one-time-codes.service';

/**
 * Purpose-generic One-Time Code machinery (backend/CONTEXT.md — One-Time
 * Code), shared by Email Verification (this issue, `EmailVerificationModule`)
 * and Password Reset (issue #21). No controller here — each flow's own
 * module owns the HTTP surface.
 *
 * `ScryptPasswordHasher` is imported as a plain class, not via `AuthModule`:
 * `EmailVerificationModule` imports this module and `AuthModule` imports
 * `EmailVerificationModule` (to auto-send on sign-up), so importing
 * `AuthModule` from here would close a cycle
 * (rules/arch-avoid-circular-deps.md).
 */
@Module({
  imports: [PrismaModule, ClockModule],
  providers: [
    OneTimeCodesRepository,
    OneTimeCodesService,
    { provide: ONE_TIME_CODE_HASHER, useClass: ScryptPasswordHasher },
  ],
  exports: [OneTimeCodesService],
})
export class OneTimeCodesModule {}
