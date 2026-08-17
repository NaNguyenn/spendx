import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { IsFeedCursor } from '../feed-cursor';

export const FEED_MIN_LIMIT = 1;
export const FEED_MAX_LIMIT = 50;
export const FEED_DEFAULT_LIMIT = 20;

/** `GET /feed`'s query params — keyset pagination over the Feed. */
export class FeedQueryDto {
  @ApiPropertyOptional({
    description:
      "Opaque pagination token from a previous page's `nextCursor`. Omit " +
      'for the first page.',
  })
  @IsOptional()
  @IsFeedCursor()
  cursor?: string;

  @ApiPropertyOptional({
    minimum: FEED_MIN_LIMIT,
    maximum: FEED_MAX_LIMIT,
    default: FEED_DEFAULT_LIMIT,
    description: `Page size, ${FEED_MIN_LIMIT}-${FEED_MAX_LIMIT}. Defaults to ${FEED_DEFAULT_LIMIT}.`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(FEED_MIN_LIMIT)
  @Max(FEED_MAX_LIMIT)
  limit?: number;
}
