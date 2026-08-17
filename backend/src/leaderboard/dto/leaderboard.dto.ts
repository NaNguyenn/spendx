import { ApiProperty } from '@nestjs/swagger';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../../domain/currency';
import { PERIODS, type Period } from '../../domain/period';
import { LeaderboardRowDto } from './leaderboard-row.dto';

/**
 * `GET /leaderboard` (backend/CONTEXT.md — Leaderboard): the viewer and
 * every Friend ranked by Shareable Spend within one Period, in the viewer's
 * Preferred Currency. See `../leaderboard.service.ts`.
 */
export class LeaderboardDto {
  @ApiProperty({ enum: PERIODS, enumName: 'Period' })
  period!: Period;

  @ApiProperty({ description: 'YYYY-MM-DD, inclusive.', example: '2026-08-03' })
  start!: string;

  @ApiProperty({ description: 'YYYY-MM-DD, inclusive.', example: '2026-08-09' })
  end!: string;

  @ApiProperty({
    enum: SUPPORTED_CURRENCIES,
    enumName: 'SupportedCurrency',
    description:
      "The viewer's Preferred Currency — every total below is in it.",
  })
  currency!: SupportedCurrency;

  @ApiProperty({
    type: LeaderboardRowDto,
    isArray: true,
    description:
      'The viewer and every Friend, always all present, sorted by total ' +
      'descending with ties broken by Username ascending. Position is the ' +
      'rank.',
  })
  rows!: LeaderboardRowDto[];
}
