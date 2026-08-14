import { ApiProperty } from '@nestjs/swagger';
import { CATEGORIES, type Category } from '../../domain/category';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../../domain/currency';
import { VISIBILITIES, type Visibility } from '../../domain/visibility';

/**
 * How an Expense appears in a response. Every amount is paired with its
 * explicit currency — nothing about it is implied by locale. See
 * `../expense-view.ts`, the single place an Expense row becomes this.
 */
export class ExpenseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({
    description:
      'The Original Amount, exactly as entered and immutable after logging ' +
      '(ADR-0008), as a fixed-scale decimal string (4 decimal places). ' +
      'Never a JSON number.',
    example: '45000.0000',
  })
  originalAmount!: string;

  @ApiProperty({ enum: SUPPORTED_CURRENCIES, enumName: 'SupportedCurrency' })
  originalCurrency!: SupportedCurrency;

  @ApiProperty({
    description:
      "The Converted Amount: the Conversion Snapshot's entry for the " +
      "reader's Preferred Currency — derived at the logging date's Daily " +
      'Rate and frozen (ADR-0008). A fixed-scale decimal string (4 decimal ' +
      'places).',
    example: '1.9565',
  })
  convertedAmount!: string;

  @ApiProperty({ enum: SUPPORTED_CURRENCIES, enumName: 'SupportedCurrency' })
  convertedCurrency!: SupportedCurrency;

  @ApiProperty({ enum: CATEGORIES, enumName: 'Category' })
  category!: Category;

  @ApiProperty({ enum: VISIBILITIES, enumName: 'Visibility' })
  visibility!: Visibility;

  @ApiProperty({ description: 'YYYY-MM-DD', example: '2026-08-01' })
  expenseDate!: string;

  @ApiProperty({ description: 'ISO 8601 — the immutable Logged At.' })
  loggedAt!: string;
}
