import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/current-user.decorator';
import { PublicUserDto } from '../users/dto/public-user.dto';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { FriendRequestDto } from './dto/friend-request.dto';
import { FriendRequestsDto } from './dto/friend-requests.dto';
import { FriendRequestsService } from './friend-requests.service';

@ApiTags('friends')
@ApiBearerAuth()
@Controller('friend-requests')
export class FriendRequestsController {
  constructor(private readonly friendRequestsService: FriendRequestsService) {}

  @Post()
  @ApiOperation({
    summary: 'Send a Friend Request',
    description: 'See backend/CONTEXT.md — Friend Request.',
  })
  @ApiCreatedResponse({ type: FriendRequestDto })
  @ApiNotFoundResponse({ description: 'Unknown Username.' })
  @ApiBadRequestResponse({ description: 'Sending to yourself.' })
  @ApiConflictResponse({
    description:
      'Already Friends, or a Friend Request is already pending between ' +
      'the two, in either direction.',
  })
  create(
    @CurrentUserId() senderId: string,
    @Body() dto: CreateFriendRequestDto,
  ): Promise<FriendRequestDto> {
    return this.friendRequestsService.send(senderId, dto.username);
  }

  @Get()
  @ApiOperation({
    summary: "The caller's pending Friend Requests",
    description: 'Both directions, each newest first.',
  })
  @ApiOkResponse({ type: FriendRequestsDto })
  findAll(@CurrentUserId() userId: string): Promise<FriendRequestsDto> {
    return this.friendRequestsService.listForUser(userId);
  }

  @Post(':id/accept')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Accept a Friend Request',
    description: 'Recipient only. Creates the Friendship.',
  })
  @ApiOkResponse({ type: PublicUserDto })
  @ApiNotFoundResponse({
    description: 'No such Friend Request, or the caller is not its recipient.',
  })
  accept(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<PublicUserDto> {
    return this.friendRequestsService.accept(id, userId);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Decline or cancel a Friend Request',
    description:
      'The recipient declines or the sender cancels — the same endpoint, ' +
      'role checked.',
  })
  @ApiNoContentResponse({ description: 'Removed.' })
  @ApiNotFoundResponse({
    description: 'No such Friend Request, or the caller is neither party.',
  })
  remove(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.friendRequestsService.remove(id, userId);
  }
}
