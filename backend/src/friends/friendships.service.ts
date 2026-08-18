import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseDto } from '../expenses/dto/expense.dto';
import {
  ExpensesService,
  type CalendarDateRangeFilter,
} from '../expenses/expenses.service';
import { PublicUserDto } from '../users/dto/public-user.dto';
import { toPublicUser } from '../users/user-view';
import { UsersRepository } from '../users/users.repository';
import { FriendshipsRepository } from './friendships.repository';

@Injectable()
export class FriendshipsService {
  constructor(
    private readonly friendshipsRepository: FriendshipsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly expensesService: ExpensesService,
  ) {}

  /** The caller's Friends, ordered by Username. */
  async listFriends(userId: string): Promise<PublicUserDto[]> {
    const friends = await this.friendshipsRepository.listFriendsOf(userId);
    return friends.map(toPublicUser);
  }

  /** Unfriends by Username; 404 when no such Friendship exists. */
  async unfriend(userId: string, usernameRaw: string): Promise<void> {
    const other = await this.usersRepository.findByUsername(
      usernameRaw.toLowerCase(),
    );
    if (!other) {
      throw new NotFoundException('Friendship not found');
    }

    const deleted = await this.friendshipsRepository.deleteBetween(
      userId,
      other.id,
    );
    if (!deleted) {
      throw new NotFoundException('Friendship not found');
    }
  }

  /**
   * A Friend's Shareable Expenses (backend/CONTEXT.md — Shareable Spend):
   * Friend-only and Public, never Private. 404 for an unknown Username; 403
   * for a stranger, a requester whose Friend Request was declined or
   * cancelled, or the caller's own Username — existence of the *account*
   * is not hidden here (Usernames are already public via
   * GET /users/:username), only whether a Friendship exists.
   *
   * `range` optionally narrows to Expense Date (issue #12's Leaderboard
   * drill-down, browsing a specific Period).
   */
  async getFriendExpenses(
    readerId: string,
    usernameRaw: string,
    range?: CalendarDateRangeFilter,
  ): Promise<ExpenseDto[]> {
    const owner = await this.usersRepository.findByUsername(
      usernameRaw.toLowerCase(),
    );
    if (!owner) {
      throw new NotFoundException('User not found');
    }
    if (owner.id === readerId) {
      throw new ForbiddenException(
        'Use GET /expenses to list your own Expenses',
      );
    }

    const areFriends = await this.friendshipsRepository.areFriends(
      readerId,
      owner.id,
    );
    if (!areFriends) {
      throw new ForbiddenException('Not Friends with this User');
    }

    return this.expensesService.findShareableForOwner(
      owner.id,
      readerId,
      range,
    );
  }

  /**
   * The cross-module seam LikesService's Visibility gate uses for a
   * Friend-only Expense (issue #14), without exposing FriendshipsRepository
   * — see rules/arch-module-sharing.md.
   */
  areFriends(userId: string, otherUserId: string): Promise<boolean> {
    return this.friendshipsRepository.areFriends(userId, otherUserId);
  }
}
