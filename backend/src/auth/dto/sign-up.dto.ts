import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsEmail, IsString, Length, Matches } from 'class-validator';
import { LOCALES, type Locale } from '../../domain/locale';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../../domain/currency';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimAndLowercase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class SignUpDto {
  @ApiProperty({ example: 'minh@spendx.app' })
  @Transform(trimAndLowercase)
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  password!: string;

  @ApiProperty({
    example: 'minhtran',
    description:
      "The User's unique public handle: 3-30 characters, lowercase letters, digits, and underscores.",
  })
  @Transform(trimAndLowercase)
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'username must contain only lowercase letters, numbers, and underscores',
  })
  username!: string;

  @ApiProperty({ example: 'Minh Trần' })
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  displayName!: string;

  @ApiProperty({ enum: SUPPORTED_CURRENCIES, enumName: 'SupportedCurrency' })
  @IsIn(SUPPORTED_CURRENCIES)
  preferredCurrency!: SupportedCurrency;

  @ApiProperty({ enum: LOCALES, enumName: 'Locale' })
  @IsIn(LOCALES)
  locale!: Locale;
}
