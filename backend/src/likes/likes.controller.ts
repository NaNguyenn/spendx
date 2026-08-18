import { Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common';
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
import { LikesService } from './likes.service';

// A second controller mounted at 'expenses' (alongside ExpensesController in
// the expenses module — same precedent as UserExpensesController mounting
// at 'users'): it declares only the ':id/like' and ':id/likes' subpaths,
// which Express 5 can never confuse with ExpensesController's ':id' or
// ':id' + one more segment routes. Living here rather than in the expenses
// module because Like is its own domain concept (backend/CONTEXT.md —
// Like), not an Expense-editing concern.
@ApiTags('likes')
@ApiBearerAuth()
@Controller('expenses')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Put(':id/like')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Like an Expense',
    description:
      'Visible ⇒ likeable (backend/CONTEXT.md — Like): the caller may ' +
      'Like any Expense they can see — their own, any Public Expense, or ' +
      "a Friend's Friend-only Expense. Idempotent: liking an " +
      'already-liked Expense stays a single Like.',
  })
  @ApiNoContentResponse({ description: 'Liked (or already was).' })
  @ApiNotFoundResponse({
    description: 'No such Expense, or the caller cannot see it.',
  })
  like(
    @CurrentUserId() viewerId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.likesService.like(viewerId, id);
  }

  @Delete(':id/like')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Unlike an Expense',
    description: 'Idempotent: 204s even when the caller had not Liked it.',
  })
  @ApiNoContentResponse({ description: 'Unliked (or already was not).' })
  @ApiNotFoundResponse({
    description: 'No such Expense, or the caller cannot see it.',
  })
  unlike(
    @CurrentUserId() viewerId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.likesService.unlike(viewerId, id);
  }

  @Get(':id/likes')
  @ApiOperation({
    summary: 'Who liked this Expense',
    description:
      'The likers, newest Like first, visible to exactly those who can ' +
      'see the Expense (backend/CONTEXT.md — Like).',
  })
  @ApiOkResponse({ type: PublicUserDto, isArray: true })
  @ApiNotFoundResponse({
    description: 'No such Expense, or the caller cannot see it.',
  })
  findLikers(
    @CurrentUserId() viewerId: string,
    @Param('id') id: string,
  ): Promise<PublicUserDto[]> {
    return this.likesService.listLikers(viewerId, id);
  }
}
