import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/current-user.decorator';
import { FeedPageDto } from './dto/feed-page.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { FeedService } from './feed.service';

@ApiTags('feed')
@ApiBearerAuth()
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({
    summary: 'The Feed: every Public Expense app-wide, newest first',
    description:
      "Every Public Expense app-wide — including the caller's own — newest " +
      'first by Logged At, each converted into the ' +
      "caller's own Preferred Currency via its frozen Conversion Snapshot " +
      '(ADR-0008). Friend-only and Private Expenses never appear, ' +
      'regardless of Friendship. Block filtering (backend/CONTEXT.md — ' +
      'Block, issue #15) is not applied here yet — every Public Expense is ' +
      'visible to every caller for now. Keyset-paginated: pass a previous ' +
      "page's `nextCursor` to continue.",
  })
  @ApiOkResponse({ type: FeedPageDto })
  @ApiBadRequestResponse({
    description: 'Invalid `limit`, or a malformed `cursor`.',
  })
  get(
    @CurrentUserId() viewerId: string,
    @Query() query: FeedQueryDto,
  ): Promise<FeedPageDto> {
    return this.feedService.getFeed(viewerId, query);
  }
}
