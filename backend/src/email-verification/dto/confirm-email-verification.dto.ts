import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/**
 * `POST /email-verification/confirm` body. Format validation (exactly 6
 * digits) fails with a plain `ValidationPipe` 400; a well-formed but
 * wrong/expired/superseded/dead code is `EmailVerificationService`'s uniform
 * `'Invalid or expired code'` 400 instead — two different 400s for two
 * different reasons, never conflated (backend/CONTEXT.md — One-Time Code).
 */
export class ConfirmEmailVerificationDto {
  @ApiProperty({
    example: '123456',
    description: 'The 6-digit One-Time Code emailed to the account.',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code!: string;
}
