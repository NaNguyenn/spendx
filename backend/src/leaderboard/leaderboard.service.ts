import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CLOCK, type Clock } from '../clock/clock';
import {
  calendarDateInAppTimezone,
  calendarDateToDate,
} from '../domain/calendar-date';
import type { SupportedCurrency } from '../domain/currency';
import { periodRangeOf, type DateRange, type Period } from '../domain/period';
import type { ExpenseCategoryAmount } from '../expenses/expenses.repository';
import { summarizeCategoryTotals } from '../expenses/statistics-view';
import { FriendshipsService } from '../friends/friendships.service';
import { Prisma } from '../generated/prisma/client';
import { PublicUserDto } from '../users/dto/public-user.dto';
import { toPublicUser } from '../users/user-view';
import { UsersRepository } from '../users/users.repository';
import { LeaderboardDto } from './dto/leaderboard.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { LeaderboardRowDto } from './dto/leaderboard-row.dto';
import { LeaderboardRepository } from './leaderboard.repository';

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly leaderboardRepository: LeaderboardRepository,
    private readonly friendshipsService: FriendshipsService,
    private readonly usersRepository: UsersRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * `GET /leaderboard` (backend/CONTEXT.md — Leaderboard): the viewer and
   * every Friend ranked by Shareable Spend within one Period, in the
   * viewer's Preferred Currency. Rows are always all present — every
   * Friend appears even with zero matching Expenses (ADR-0003) — sorted
   * total descending, ties broken by Username ascending.
   */
  async getLeaderboard(
    viewerId: string,
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardDto> {
    const viewer = await this.usersRepository.findById(viewerId);
    if (!viewer) {
      // JwtAuthGuard already resolved viewerId to a live User — a miss here
      // is an invariant breach (the account vanished mid-request), not a
      // client error. Same shape as ExpensesService#preferredCurrencyOf.
      throw new InternalServerErrorException(
        `Authenticated user ${viewerId} no longer exists`,
      );
    }

    const period: Period = query.period ?? 'week';
    const anchor = query.anchor ?? calendarDateInAppTimezone(this.clock.now());
    const range = periodRangeOf(period, anchor);

    const friends = await this.friendshipsService.listFriends(viewerId);
    const participants: PublicUserDto[] = [toPublicUser(viewer), ...friends];

    const rows = await this.rowsFor(
      participants,
      viewerId,
      viewer.preferredCurrency,
      range,
    );

    return {
      period,
      start: range.start,
      end: range.end,
      currency: viewer.preferredCurrency,
      rows,
    };
  }

  /**
   * Builds one row per `participant` (viewer + every Friend), sorted total
   * descending with a Username-ascending tie-break.
   */
  private async rowsFor(
    participants: PublicUserDto[],
    viewerId: string,
    currency: SupportedCurrency,
    range: DateRange,
  ): Promise<LeaderboardRowDto[]> {
    const totals =
      await this.leaderboardRepository.sumShareableByOwnerAndCategory(
        participants.map((participant) => participant.id),
        currency,
        {
          start: calendarDateToDate(range.start),
          end: calendarDateToDate(range.end),
        },
      );

    const entriesByOwner = new Map<string, ExpenseCategoryAmount[]>();
    for (const row of totals) {
      const entries = entriesByOwner.get(row.ownerId) ?? [];
      entries.push({
        // Already grouped by (owner, Category) — this synthetic id only
        // ever surfaces in summarizeCategoryTotals' impossible-branch error
        // message, never in a normal response.
        expenseId: `${row.ownerId}:${row.category}`,
        category: row.category,
        amount: row.total,
      });
      entriesByOwner.set(row.ownerId, entries);
    }

    const unsorted = participants.map((participant) => {
      const periodTotals = summarizeCategoryTotals(
        entriesByOwner.get(participant.id) ?? [],
        participant.id,
        currency,
      );
      return {
        row: {
          user: participant,
          isViewer: participant.id === viewerId,
          total: periodTotals.total,
          categories: periodTotals.categories,
        } satisfies LeaderboardRowDto,
        total: new Prisma.Decimal(periodTotals.total),
      };
    });

    unsorted.sort((a, b) => {
      const byTotal = b.total.comparedTo(a.total);
      return byTotal !== 0
        ? byTotal
        : a.row.user.username.localeCompare(b.row.user.username);
    });

    return unsorted.map(({ row }) => row);
  }
}
