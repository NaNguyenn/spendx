import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { CATEGORIES, type Category } from '../../domain/category';
import { IsCalendarDate } from '../../domain/calendar-date';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../../domain/currency';
import { IsMoneyAmount } from '../../domain/money';
import { VISIBILITIES, type Visibility } from '../../domain/visibility';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** `POST /expenses`. See backend/CONTEXT.md — Expense. */
export class CreateExpenseDto {
  @ApiProperty({ example: 'Coffee with a friend' })
  @Transform(trim)
  @IsString()
  @Length(1, 500)
  description!: string;

  @ApiProperty({
    example: '45000.0000',
    description:
      'The Original Amount, exactly as entered: a positive decimal string ' +
      'with at most 4 decimal places. Never a JSON number.',
  })
  @IsMoneyAmount()
  originalAmount!: string;

  @ApiProperty({ enum: SUPPORTED_CURRENCIES, enumName: 'SupportedCurrency' })
  @IsIn(SUPPORTED_CURRENCIES)
  originalCurrency!: SupportedCurrency;

  @ApiProperty({ enum: CATEGORIES, enumName: 'Category' })
  @IsIn(CATEGORIES)
  category!: Category;

  @ApiProperty({ enum: VISIBILITIES, enumName: 'Visibility' })
  @IsIn(VISIBILITIES)
  visibility!: Visibility;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description:
      'The Expense Date (YYYY-MM-DD). Defaults to the logging day in the ' +
      'fixed app timezone (Asia/Ho_Chi_Minh) when omitted. Backdating is ' +
      'allowed; this never affects the Converted Amount (ADR-0002).',
  })
  @IsOptional()
  @IsCalendarDate()
  expenseDate?: string;
}
