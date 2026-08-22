import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

/**
 * `POST /password-reset/confirm` body. Format validation (a malformed email,
 * a code that isn't 6 digits, a too-short new password) fails with a plain
 * `ValidationPipe` 400 naming the field; a well-formed submission whose
 * email/code pair doesn't check out is the uniform `'Invalid or expired
 * code'` 400 instead — two different 400s for two different reasons, never
 * conflated (backend/CONTEXT.md — One-Time Code).
 *
 * Unlike sign-in's deliberately unchecked password, `newPassword` gets the
 * same `@Length` rule as sign-up: it is a password being set, not a guess
 * being checked, so validating it leaks nothing.
 */
export class ConfirmPasswordResetDto {
  @ApiProperty({ example: 'minh@spendx.app' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'The 6-digit One-Time Code emailed to the account.',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  newPassword!: string;
}
