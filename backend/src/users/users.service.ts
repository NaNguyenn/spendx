import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlocksService } from '../blocks/blocks.service';
import { PrivateUserDto } from './dto/private-user.dto';
import { PublicUserDto } from './dto/public-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { toPrivateUser, toPublicUser } from './user-view';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly blocksService: BlocksService,
  ) {}

  /** The authenticated caller's own account. */
  async getPrivateProfile(userId: string): Promise<PrivateUserDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toPrivateUser(user);
  }

  // The caller reaches here only through JwtAuthGuard, which already
  // resolved `userId` to a live User — no NotFoundException branch needed.
  async updateMe(userId: string, dto: UpdateMeDto): Promise<PrivateUserDto> {
    if (dto.preferredCurrency === undefined && dto.locale === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }
    const user = await this.usersRepository.update(userId, {
      preferredCurrency: dto.preferredCurrency,
      locale: dto.locale,
    });
    return toPrivateUser(user);
  }

  /**
   * Exact-match Username lookup (see backend/CONTEXT.md — Username: no fuzzy
   * search). Username is stored lowercased, so the lookup is lowercased too —
   * `MinhTran` and `minhtran` resolve to the same account.
   *
   * A Block between `viewerId` and the resolved User, either direction,
   * 404s identically to an unknown Username (backend/CONTEXT.md — Block:
   * "applied as a filter before all queries ... no signal beyond content
   * absence").
   */
  async getPublicProfile(
    viewerId: string,
    username: string,
  ): Promise<PublicUserDto> {
    const user = await this.usersRepository.findByUsername(
      username.toLowerCase(),
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (await this.blocksService.isBlockedEitherDirection(viewerId, user.id)) {
      throw new NotFoundException('User not found');
    }
    return toPublicUser(user);
  }
}
