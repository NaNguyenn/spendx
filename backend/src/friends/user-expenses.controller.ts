import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/current-user.decorator';
import { ExpenseDto } from '../expenses/dto/expense.dto';
import { UserExpensesQueryDto } from './dto/user-expenses-query.dto';
import { FriendshipsService } from './friendships.service';

// A second controller mounted at 'users' (alongside UsersController in the
// users module): it declares only the ':username/expenses' subpath, which
// Express 5 can never confuse with UsersController's ':username' — that
// route matches exactly one path segment, this one matches two. Living here
// rather than in the users module because it is a Friendship-gated read,
// not a User-profile concern (see backend/CONTEXT.md — Friendship, and
// FriendshipsService.getFriendExpenses for the authorization rules).
@ApiTags('friends')
@ApiBearerAuth()
@Controller('users')
export class UserExpensesController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Get(':username/expenses')
  @ApiOperation({
    summary: "A Friend's Shareable Expenses",
    description:
      'Friend-only and Public Expenses only, never Private — newest ' +
      "logged first, converted into the caller's own Preferred Currency. " +
      'Requires an existing Friendship with the owner. Optionally narrowed ' +
      'to a Period via `start`/`end` (each independent and inclusive, by ' +
      'Expense Date) — how the Leaderboard drills into a past Period.',
  })
  @ApiOkResponse({ type: ExpenseDto, isArray: true })
  @ApiForbiddenResponse({
    description:
      'Not Friends with this User (including a declined/cancelled Friend ' +
      "Request, an unfriended former Friend, or the caller's own Username).",
  })
  @ApiNotFoundResponse({ description: 'Unknown Username.' })
  findAll(
    @CurrentUserId() readerId: string,
    @Param('username') username: string,
    @Query() query: UserExpensesQueryDto,
  ): Promise<ExpenseDto[]> {
    return this.friendshipsService.getFriendExpenses(readerId, username, {
      start: query.start,
      end: query.end,
    });
  }
}
