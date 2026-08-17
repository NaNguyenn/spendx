import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { SupportedCurrency } from '../domain/currency';
import { toExpenseDto } from '../expenses/expense-view';
import { UsersRepository } from '../users/users.repository';
import { FeedItemDto } from './dto/feed-item.dto';
import { FEED_DEFAULT_LIMIT, type FeedQueryDto } from './dto/feed-query.dto';
import { FeedPageDto } from './dto/feed-page.dto';
import { decodeFeedCursor, encodeFeedCursor } from './feed-cursor';
import { FeedRepository, type FeedExpense } from './feed.repository';

@Injectable()
export class FeedService {
  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  /**
   * `GET /feed` (backend/CONTEXT.md — Feed): every Public Expense app-wide —
   * including the caller's own — newest first by Logged At, each shown in
   * the caller's own Preferred Currency via its frozen Conversion Snapshot
   * (ADR-0008). Friend-only and Private Expenses never appear, regardless of
   * Friendship. Block filtering (backend/CONTEXT.md — Block) is issue #15
   * and not applied here yet.
   *
   * Keyset-paginated on `(loggedAt DESC, id DESC)`: `query.cursor` is the
   * opaque token {@link encodeFeedCursor} produced for the previous page's
   * last item, so a page boundary never shifts as new Expenses are logged
   * mid-scroll — the way an offset would.
   */
  async getFeed(viewerId: string, query: FeedQueryDto): Promise<FeedPageDto> {
    const viewer = await this.usersRepository.findById(viewerId);
    if (!viewer) {
      // JwtAuthGuard already resolved viewerId to a live User — a miss here
      // is an invariant breach, not a client error. Same shape as
      // ExpensesService#preferredCurrencyOf.
      throw new InternalServerErrorException(
        `Authenticated user ${viewerId} no longer exists`,
      );
    }

    const limit = query.limit ?? FEED_DEFAULT_LIMIT;
    const cursor = query.cursor ? decodeFeedCursor(query.cursor) : undefined;

    // One extra row decides whether a nextCursor exists, without a second
    // round trip.
    const rows = await this.feedRepository.findPage(cursor, limit + 1);
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    const nextCursor =
      rows.length > limit && last
        ? encodeFeedCursor({ loggedAt: last.loggedAt, id: last.id })
        : null;

    return {
      items: page.map((row) =>
        this.toFeedItemDto(row, viewer.preferredCurrency),
      ),
      nextCursor,
    };
  }

  private toFeedItemDto(
    row: FeedExpense,
    viewerCurrency: SupportedCurrency,
  ): FeedItemDto {
    return {
      ...toExpenseDto(row, viewerCurrency),
      owner: {
        username: row.owner.username,
        displayName: row.owner.displayName,
      },
    };
  }
}
