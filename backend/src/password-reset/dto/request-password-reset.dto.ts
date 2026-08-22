import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

/**
 * `POST /password-reset/request` body. The email is normalized exactly as
 * sign-in normalizes it (trim + lowercase), so the lookup matches the
 * lowercased stored value — see `UsersRepository`'s doc comment.
 */
export class RequestPasswordResetDto {
  @ApiProperty({ example: 'minh@spendx.app' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;
}
