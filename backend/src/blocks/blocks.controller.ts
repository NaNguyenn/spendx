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
import { BlocksService } from './blocks.service';
import { BlockDto } from './dto/block.dto';
import { CreateBlockDto } from './dto/create-block.dto';

@ApiTags('blocks')
@ApiBearerAuth()
@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post()
  @ApiOperation({
    summary: 'Block a User',
    description: 'See backend/CONTEXT.md — Block.',
  })
  @ApiCreatedResponse({ type: BlockDto })
  @ApiNotFoundResponse({
    description:
      'Unknown Username, or the target has already blocked the caller ' +
      '(same response either way — no signal).',
  })
  @ApiBadRequestResponse({ description: 'Blocking yourself.' })
  @ApiConflictResponse({ description: 'Already blocked.' })
  create(
    @CurrentUserId() blockerId: string,
    @Body() dto: CreateBlockDto,
  ): Promise<BlockDto> {
    return this.blocksService.block(blockerId, dto.username);
  }

  @Get()
  @ApiOperation({
    summary: "The caller's blocked list",
    description: 'Newest first.',
  })
  @ApiOkResponse({ type: PublicUserDto, isArray: true })
  findAll(@CurrentUserId() blockerId: string): Promise<PublicUserDto[]> {
    return this.blocksService.listBlocked(blockerId);
  }

  @Delete(':username')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Unblock a User',
    description:
      'Restores visibility both ways, but not any severed Friendship — ' +
      'see backend/CONTEXT.md — Block.',
  })
  @ApiNoContentResponse({ description: 'Unblocked.' })
  @ApiNotFoundResponse({ description: 'No such Block.' })
  remove(
    @CurrentUserId() blockerId: string,
    @Param('username') username: string,
  ): Promise<void> {
    return this.blocksService.unblock(blockerId, username);
  }
}
