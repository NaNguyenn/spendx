import { Module } from '@nestjs/common';
import { PASSWORD_HASHER } from '../auth/password-hasher';
import { ScryptPasswordHasher } from '../auth/scrypt-password-hasher';
import { ClockModule } from '../clock/clock.module';
import { EmailModule } from '../email/email.module';
import { OneTimeCodesModule } from '../one-time-codes/one-time-codes.module';
import { UsersModule } from '../users/users.module';
import { PasswordResetController } from './password-reset.controller';
import { PasswordResetService } from './password-reset.service';

/**
 * Password Reset (backend/CONTEXT.md): a One-Time Code flow that replaces a
 * forgotten password and ends every existing session — see
 * `PasswordResetService`.
 *
 * `PASSWORD_HASHER` is provided here from the plain `ScryptPasswordHasher`
 * class rather than by importing `AuthModule`, the same reasoning as
 * `OneTimeCodesModule`: `AuthModule` sits downstream of the One-Time Code
 * machinery, and reaching back up to it would invite a cycle
 * (rules/arch-avoid-circular-deps.md).
 */
@Module({
  imports: [UsersModule, EmailModule, OneTimeCodesModule, ClockModule],
  controllers: [PasswordResetController],
  providers: [
    PasswordResetService,
    { provide: PASSWORD_HASHER, useClass: ScryptPasswordHasher },
  ],
})
export class PasswordResetModule {}
