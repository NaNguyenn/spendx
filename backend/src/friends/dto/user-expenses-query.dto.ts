import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsCalendarDate } from '../../domain/calendar-date';

/**
 * `GET /users/:username/expenses`'s optional Period filter: both bounds are
 * independent and inclusive, filtering by Expense Date (never Logged At) —
 * the same filter the Leaderboard's drill-down uses to browse a specific
 * Period's Shareable Expenses.
 */
export class UserExpensesQueryDto {
  @ApiPropertyOptional({
    example: '2026-08-03',
    description:
      'Only Expenses whose Expense Date is on or after this date ' +
      '(YYYY-MM-DD), inclusive. Independent of `end`.',
  })
  @IsOptional()
  @IsCalendarDate()
  start?: string;

  @ApiPropertyOptional({
    example: '2026-08-09',
    description:
      'Only Expenses whose Expense Date is on or before this date ' +
      '(YYYY-MM-DD), inclusive. Independent of `start`.',
  })
  @IsOptional()
  @IsCalendarDate()
  end?: string;
}
