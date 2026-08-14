import { ApiProperty } from '@nestjs/swagger';
import { CategoryTotalDto } from './category-total.dto';

/**
 * One Period's (backend/CONTEXT.md) worth of an owner's personal
 * statistics: its date range, the total spent, the immediately preceding
 * Period's total for comparison, and the Category breakdown — see
 * `StatisticsDto`.
 */
export class PeriodStatisticsDto {
  @ApiProperty({ description: 'YYYY-MM-DD, inclusive.', example: '2026-08-03' })
  start!: string;

  @ApiProperty({ description: 'YYYY-MM-DD, inclusive.', example: '2026-08-09' })
  end!: string;

  @ApiProperty({
    description:
      "The summed Converted Amount over the Period, in the owner's " +
      'Preferred Currency, as a fixed-scale decimal string (4 decimal ' +
      'places). Never a JSON number.',
    example: '4850000.0000',
  })
  total!: string;

  @ApiProperty({
    description:
      'The same total for the immediately preceding Period of the same ' +
      'length (previous ISO week or previous calendar month), for ' +
      'comparison.',
    example: '3200000.0000',
  })
  previousTotal!: string;

  @ApiProperty({
    type: CategoryTotalDto,
    isArray: true,
    description:
      'Every Category (backend/CONTEXT.md), including zero totals, sorted ' +
      'by total descending; ties broken by the canonical Category order.',
  })
  categories!: CategoryTotalDto[];
}
