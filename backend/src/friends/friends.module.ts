import { Module } from '@nestjs/common';
import { ExpensesModule } from '../expenses/expenses.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { FriendRequestsController } from './friend-requests.controller';
import { FriendRequestsRepository } from './friend-requests.repository';
import { FriendRequestsService } from './friend-requests.service';
import { FriendshipsController } from './friendships.controller';
import { FriendshipsRepository } from './friendships.repository';
import { FriendshipsService } from './friendships.service';
import { UserExpensesController } from './user-expenses.controller';

// The Friendship graph (backend/CONTEXT.md — Friendship, Friend Request):
// Friend Requests, Friendships, and the Friend-gated Expenses read path.
// Depends on UsersModule (Username lookup) and ExpensesModule (the
// Shareable Expenses read path) through providers those modules export
// (see rules/arch-module-sharing.md).
@Module({
  imports: [PrismaModule, UsersModule, ExpensesModule],
  controllers: [
    FriendRequestsController,
    FriendshipsController,
    UserExpensesController,
  ],
  providers: [
    FriendRequestsRepository,
    FriendRequestsService,
    FriendshipsRepository,
    FriendshipsService,
  ],
  // FriendshipsService only: the Leaderboard module (issue #12) needs a
  // viewer's Friend list, and reaches it through this exported service,
  // never FriendshipsRepository directly — see rules/arch-module-sharing.md.
  // LikesService (issue #14) goes through the service too, via
  // FriendshipsService.areFriends, for its per-Expense Visibility gate.
  exports: [FriendshipsService],
})
export class FriendsModule {}
