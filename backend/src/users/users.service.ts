import { Injectable, NotFoundException } from '@nestjs/common';
import { PrivateUserDto } from './dto/private-user.dto';
import { PublicUserDto } from './dto/public-user.dto';
import { toPrivateUser, toPublicUser } from './user-view';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /** The authenticated caller's own account. */
  async getPrivateProfile(userId: string): Promise<PrivateUserDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toPrivateUser(user);
  }

  /**
   * Exact-match Username lookup (see backend/CONTEXT.md — Username: no fuzzy
   * search). Username is stored lowercased, so the lookup is lowercased too —
   * `MinhTran` and `minhtran` resolve to the same account.
   */
  async getPublicProfile(username: string): Promise<PublicUserDto> {
    const user = await this.usersRepository.findByUsername(
      username.toLowerCase(),
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toPublicUser(user);
  }
}
