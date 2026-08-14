import { ApiProperty } from '@nestjs/swagger';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../../domain/currency';
import { PeriodStatisticsDto } from './period-statistics.dto';

/**
 * An owner's personal statistics (issue #7): weekly and monthly totals and
 * Category breakdowns, in their own Preferred Currency, over every
 * Visibility of their own Expenses (ADR-0003 — full spending appears only in
 * the owner's personal statistics). See `../expenses.service.ts#statistics`.
 */
export class StatisticsDto {
  @ApiProperty({
    enum: SUPPORTED_CURRENCIES,
    enumName: 'SupportedCurrency',
    description: "The owner's Preferred Currency — every total below is in it.",
  })
  currency!: SupportedCurrency;

  @ApiProperty({ description: 'The current ISO week (Monday through Sunday).' })
  week!: PeriodStatisticsDto;

  @ApiProperty({ description: 'The current calendar month.' })
  month!: PeriodStatisticsDto;
}
