import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { IsCalendarDate } from '../../domain/calendar-date';
import { PERIODS, type Period } from '../../domain/period';

/** `GET /leaderboard`'s query params. */
export class LeaderboardQueryDto {
  @ApiPropertyOptional({
    enum: PERIODS,
    enumName: 'Period',
    default: 'week',
    description: 'The Period to rank. Defaults to the current ISO week.',
  })
  @IsOptional()
  @IsIn(PERIODS)
  period?: Period;

  @ApiPropertyOptional({
    example: '2026-08-05',
    description:
      'Any calendar date (YYYY-MM-DD) inside the desired Period — the ' +
      'response covers the ISO week or calendar month containing it, ' +
      "letting a caller browse a past Period. Defaults to today's date " +
      'in the fixed app timezone (Asia/Ho_Chi_Minh, ADR-0004).',
  })
  @IsOptional()
  @IsCalendarDate()
  anchor?: string;
}
