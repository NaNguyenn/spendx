import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/current-user.decorator';
import { PrivateUserDto } from './dto/private-user.dto';
import { PublicUserDto } from './dto/public-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Declared before the ':username' route: Express matches static segments
  // literally, but a fixed route must still come first in source order to
  // win over a param route it could otherwise shadow.
  @Get('me')
  @ApiOperation({ summary: "The caller's own account" })
  @ApiOkResponse({ type: PrivateUserDto })
  getMe(@CurrentUserId() userId: string): Promise<PrivateUserDto> {
    return this.usersService.getPrivateProfile(userId);
  }

  // The one account-update route (see UpdateMeDto) — Display Name lands here
  // later rather than growing its own.
  @Patch('me')
  @ApiOperation({ summary: "Update the caller's own account" })
  @ApiOkResponse({ type: PrivateUserDto })
  updateMe(
    @CurrentUserId() userId: string,
    @Body() dto: UpdateMeDto,
  ): Promise<PrivateUserDto> {
    return this.usersService.updateMe(userId, dto);
  }

  // When Blocks arrive, this becomes a query surface they must filter: per
  // ADR-0003 and CONTEXT.md, a Block makes two Users mutually invisible
  // everywhere, search included. Today there is no Block to apply; the ticket
  // that adds one has to come back here.
  @Get(':username')
  @ApiOperation({
    summary: 'Look up a User by Username',
    description: 'Exact match only — see backend/CONTEXT.md on Username.',
  })
  @ApiOkResponse({ type: PublicUserDto })
  getByUsername(@Param('username') username: string): Promise<PublicUserDto> {
    return this.usersService.getPublicProfile(username);
  }
}
