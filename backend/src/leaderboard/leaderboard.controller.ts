import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/current-user.decorator';
import { LeaderboardDto } from './dto/leaderboard.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('leaderboard')
@ApiBearerAuth()
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @ApiOperation({
    summary: 'The Leaderboard: the caller and every Friend by Shareable Spend',
    description:
      'Ranks the caller and every one of their Friends by Shareable Spend ' +
      "(Friend-only and Public Expenses, never Private — even the caller's " +
      "own row) within one Period, in the caller's Preferred Currency. " +
      'Every Friend appears, zero-filled when they have no matching ' +
      'Expenses (ADR-0003). Defaults to the current ISO week; `anchor` ' +
      'browses any past Period.',
  })
  @ApiOkResponse({ type: LeaderboardDto })
  @ApiBadRequestResponse({ description: 'Invalid `period` or `anchor`.' })
  get(
    @CurrentUserId() viewerId: string,
    @Query() query: LeaderboardQueryDto,
  ): Promise<LeaderboardDto> {
    return this.leaderboardService.getLeaderboard(viewerId, query);
  }
}
