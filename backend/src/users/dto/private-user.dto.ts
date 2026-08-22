import { ApiProperty } from '@nestjs/swagger';
import { LOCALES, type Locale } from '../../domain/locale';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../../domain/currency';
import { PublicUserDto } from './public-user.dto';

/**
 * How a User appears in a response describing *themselves*. Returned only for
 * the authenticated caller's own account — never for anybody else, that's
 * `PublicUserDto`. See `../user-view.ts`.
 */
export class PrivateUserDto extends PublicUserDto {
  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: SUPPORTED_CURRENCIES, enumName: 'SupportedCurrency' })
  preferredCurrency!: SupportedCurrency;

  @ApiProperty({ enum: LOCALES, enumName: 'Locale' })
  locale!: Locale;

  @ApiProperty({ description: 'ISO 8601' })
  createdAt!: string;

  @ApiProperty({
    description:
      'Whether the owner has confirmed an Email Verification One-Time ' +
      'Code (backend/CONTEXT.md — Email Verification). Gates nothing — ' +
      'owner-only, never shown on PublicUserDto.',
  })
  emailVerified!: boolean;
}
