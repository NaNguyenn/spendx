import { Injectable, NotFoundException } from '@nestjs/common';
import { BlocksService } from '../blocks/blocks.service';
import { ExpensesService } from '../expenses/expenses.service';
import { FriendshipsService } from '../friends/friendships.service';
import { PublicUserDto } from '../users/dto/public-user.dto';
import { toPublicUser } from '../users/user-view';
import { LikesRepository } from './likes.repository';

@Injectable()
export class LikesService {
  constructor(
    private readonly likesRepository: LikesRepository,
    private readonly expensesService: ExpensesService,
    private readonly friendshipsService: FriendshipsService,
    private readonly blocksService: BlocksService,
  ) {}

  /** Likes an Expense the caller can see. Idempotent. */
  async like(viewerId: string, expenseId: string): Promise<void> {
    await this.assertVisible(viewerId, expenseId);
    await this.likesRepository.like(viewerId, expenseId);
  }

  /** Unlikes an Expense the caller can see. Idempotent. */
  async unlike(viewerId: string, expenseId: string): Promise<void> {
    await this.assertVisible(viewerId, expenseId);
    await this.likesRepository.unlike(viewerId, expenseId);
  }

  /**
   * The Expense's likers, newest Like first — same Visibility gate as
   * {@link like}, minus any liker mutually invisible with the viewer
   * (backend/CONTEXT.md — Block, issue #15).
   */
  async listLikers(
    viewerId: string,
    expenseId: string,
  ): Promise<PublicUserDto[]> {
    await this.assertVisible(viewerId, expenseId);
    const excludeUserIds =
      await this.blocksService.invisibleUserIdsFor(viewerId);
    const likers = await this.likesRepository.findLikers(
      expenseId,
      excludeUserIds,
    );
    return likers.map(toPublicUser);
  }

  /**
   * The one Visibility check every Like route shares (backend/CONTEXT.md —
   * Like: "visible ⇒ likeable" — the count and likers are visible to
   * exactly those who can see the Expense): the owner always qualifies;
   * otherwise `public` admits any authenticated caller and `friend_only`
   * admits an existing Friend (FriendshipsService.areFriends); `private`
   * admits no one else. Deliberately also gates `unlike`: a viewer later
   * excluded by a Visibility change cannot withdraw their Like, because
   * (backend/CONTEXT.md — Like) such Likes persist but turn invisible with
   * the Expense.
   *
   * A nonexistent Expense and one the viewer cannot see both throw the same
   * 404 — deliberately, unlike the Friends module's `getFriendExpenses`
   * (which 403s a stranger because a Username's account is already public
   * via GET /users/:username). No Username-style public anchor exists for
   * an individual Expense, so a 403 here would itself leak that a
   * private/friend-only Expense exists at that id; only 404 keeps
   * invisibility indistinguishable from nonexistence.
   *
   * A Block between the viewer and the owner, either direction
   * (backend/CONTEXT.md — Block, issue #15), makes the Expense invisible
   * the same way — "liking it is impossible" — checked before the owner
   * can even equal the viewer's own id, since a User cannot Block
   * themselves.
   */
  private async assertVisible(
    viewerId: string,
    expenseId: string,
  ): Promise<void> {
    const expense =
      await this.expensesService.findOwnerAndVisibility(expenseId);
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    if (
      expense.ownerId !== viewerId &&
      (await this.blocksService.isBlockedEitherDirection(
        viewerId,
        expense.ownerId,
      ))
    ) {
      throw new NotFoundException('Expense not found');
    }

    const visible =
      expense.ownerId === viewerId ||
      expense.visibility === 'public' ||
      (expense.visibility === 'friend_only' &&
        (await this.friendshipsService.areFriends(viewerId, expense.ownerId)));
    if (!visible) {
      throw new NotFoundException('Expense not found');
    }
  }
}
