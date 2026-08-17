import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../../domain/currency';
import { LOCALES, type Locale } from '../../domain/locale';

/**
 * `PATCH /users/me` — partial update of the caller's own account. Every field
 * is optional so each may change alone, but an empty body is rejected in
 * UsersService.updateMe: with nothing to update, "success" would only mask a
 * caller bug. Display Name joins this shape when its ticket lands.
 */
export class UpdateMeDto {
  @ApiPropertyOptional({
    enum: SUPPORTED_CURRENCIES,
    enumName: 'SupportedCurrency',
  })
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  preferredCurrency?: SupportedCurrency;

  @ApiPropertyOptional({ enum: LOCALES, enumName: 'Locale' })
  @IsOptional()
  @IsIn(LOCALES)
  locale?: Locale;
}
