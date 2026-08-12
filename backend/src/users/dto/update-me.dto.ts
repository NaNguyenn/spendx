import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { LOCALES, type Locale } from '../../domain/locale';

/**
 * `PATCH /users/me`. Locale is the only field this ticket updates; the route
 * is account-wide (not `/users/me/locale`) because later tickets extend it
 * with Preferred Currency and Display Name — locale is required for now
 * rather than optional, since a partial-update shape without any optional
 * field would be indistinguishable from this one anyway.
 */
export class UpdateMeDto {
  @ApiProperty({ enum: LOCALES, enumName: 'Locale' })
  @IsIn(LOCALES)
  locale!: Locale;
}
