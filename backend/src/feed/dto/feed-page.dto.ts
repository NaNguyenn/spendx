import { ApiProperty } from '@nestjs/swagger';
import { FeedItemDto } from './feed-item.dto';

/**
 * `GET /feed` (backend/CONTEXT.md — Feed): one keyset page of every Public
 * Expense app-wide, newest first by Logged At. See `../feed.service.ts`.
 */
export class FeedPageDto {
  @ApiProperty({ type: FeedItemDto, isArray: true })
  items!: FeedItemDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Pass as `?cursor=` to fetch the next page; `null` once the Feed is ' +
      'exhausted.',
  })
  nextCursor!: string | null;
}
