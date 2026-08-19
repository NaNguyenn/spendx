import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlocksService } from '../blocks/blocks.service';
import { PublicUserDto } from '../users/dto/public-user.dto';
import { toPublicUser } from '../users/user-view';
import { UsersRepository } from '../users/users.repository';
import { FriendRequestDto } from './dto/friend-request.dto';
import { FriendRequestsDto } from './dto/friend-requests.dto';
import { toFriendRequestDto } from './friend-request-view';
import { FriendRequestsRepository } from './friend-requests.repository';
import { FriendshipsRepository } from './friendships.repository';

@Injectable()
export class FriendRequestsService {
  constructor(
    private readonly friendRequestsRepository: FriendRequestsRepository,
    private readonly friendshipsRepository: FriendshipsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly blocksService: BlocksService,
  ) {}

  /**
   * Sends a Friend Request (backend/CONTEXT.md — "a pending offer of
   * Friendship"). Username is stored lowercased, so the lookup is
   * lowercased too — same rule as UsersService.getPublicProfile.
   */
  async send(senderId: string, usernameRaw: string): Promise<FriendRequestDto> {
    const recipient = await this.usersRepository.findByUsername(
      usernameRaw.toLowerCase(),
    );
    if (!recipient) {
      throw new NotFoundException('User not found');
    }
    if (recipient.id === senderId) {
      throw new BadRequestException('Cannot send a Friend Request to yourself');
    }

    // backend/CONTEXT.md — Block: "neither can send a Friend Request" — 404s
    // identically to an unknown Username, same as GET /users/:username, no
    // signal for either direction.
    if (
      await this.blocksService.isBlockedEitherDirection(senderId, recipient.id)
    ) {
      throw new NotFoundException('User not found');
    }

    const alreadyFriends = await this.friendshipsRepository.areFriends(
      senderId,
      recipient.id,
    );
    if (alreadyFriends) {
      throw new ConflictException('Already Friends');
    }

    const existing = await this.friendRequestsRepository.findBetween(
      senderId,
      recipient.id,
    );
    if (existing) {
      if (existing.senderId === recipient.id) {
        // The other side already sent the caller one — accepting is the
        // right move, not a second request in the opposite direction.
        throw new ConflictException(
          `${recipient.username} already sent you a Friend Request — accept it instead of sending a new one`,
        );
      }
      throw new ConflictException('A Friend Request is already pending');
    }

    const created = await this.friendRequestsRepository.create(
      senderId,
      recipient.id,
    );
    if (!created) {
      // Lost a race against a concurrent duplicate the checks above missed.
      throw new ConflictException('A Friend Request is already pending');
    }

    return toFriendRequestDto(created);
  }

  /** The caller's pending requests, newest first, in both directions. */
  async listForUser(userId: string): Promise<FriendRequestsDto> {
    const { incoming, outgoing } =
      await this.friendRequestsRepository.findForUser(userId);
    return {
      incoming: incoming.map(toFriendRequestDto),
      outgoing: outgoing.map(toFriendRequestDto),
    };
  }

  /**
   * Accepts a pending Friend Request — recipient only. Creates the
   * Friendship and returns the new friend, PublicUserDto-shaped.
   */
  async accept(requestId: string, userId: string): Promise<PublicUserDto> {
    const friend = await this.friendRequestsRepository.accept(
      requestId,
      userId,
    );
    if (!friend) {
      throw new NotFoundException('Friend Request not found');
    }
    return toPublicUser(friend);
  }

  /**
   * Declines (called by the recipient) or cancels (called by the sender) —
   * the same endpoint either way; ownership is resolved inside the
   * repository's atomic delete.
   */
  async remove(requestId: string, userId: string): Promise<void> {
    const deleted = await this.friendRequestsRepository.deleteForParty(
      requestId,
      userId,
    );
    if (!deleted) {
      throw new NotFoundException('Friend Request not found');
    }
  }
}
