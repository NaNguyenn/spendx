import { Controller, Delete, Get, HttpCode, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/current-user.decorator';
import { PublicUserDto } from '../users/dto/public-user.dto';
import { FriendshipsService } from './friendships.service';

@ApiTags('friends')
@ApiBearerAuth()
@Controller('friends')
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Get()
  @ApiOperation({
    summary: "The caller's Friends",
    description: 'Ordered by Username. See backend/CONTEXT.md — Friendship.',
  })
  @ApiOkResponse({ type: PublicUserDto, isArray: true })
  findAll(@CurrentUserId() userId: string): Promise<PublicUserDto[]> {
    return this.friendshipsService.listFriends(userId);
  }

  @Delete(':username')
  @HttpCode(204)
  @ApiOperation({ summary: 'Unfriend a User' })
  @ApiNoContentResponse({ description: 'Unfriended.' })
  @ApiNotFoundResponse({ description: 'No such Friendship.' })
  remove(
    @CurrentUserId() userId: string,
    @Param('username') username: string,
  ): Promise<void> {
    return this.friendshipsService.unfriend(userId, username);
  }
}
