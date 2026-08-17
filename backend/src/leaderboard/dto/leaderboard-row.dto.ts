import { ApiProperty } from '@nestjs/swagger';
import { CategoryTotalDto } from '../../expenses/dto/category-total.dto';
import { PublicUserDto } from '../../users/dto/public-user.dto';

/**
 * One User's standing within a Leaderboard (backend/CONTEXT.md —
 * Leaderboard, Shareable Spend): always present for the viewer and every
 * Friend, zero-filled when a User has no matching Expenses. Position in
 * `LeaderboardDto.rows` — sorted total descending, ties broken by Username
 * ascending — is the rank; there is no explicit rank field.
 */
export class LeaderboardRowDto {
  @ApiProperty({ type: PublicUserDto })
  user!: PublicUserDto;

  @ApiProperty({
    description: 'True when this row is the requesting viewer themselves.',
  })
  isViewer!: boolean;

  @ApiProperty({
    description:
      "This User's Shareable Spend for the Period, in the viewer's " +
      'Preferred Currency, as a fixed-scale decimal string (4 decimal ' +
      'places). Never a JSON number. Zero when they have no matching ' +
      'Expenses — every row is always present (ADR-0003).',
    example: '450000.0000',
  })
  total!: string;

  @ApiProperty({
    type: CategoryTotalDto,
    isArray: true,
    description:
      'Every Category (backend/CONTEXT.md), including zero totals, sorted ' +
      'by total descending; ties broken by the canonical Category order.',
  })
  categories!: CategoryTotalDto[];
}
