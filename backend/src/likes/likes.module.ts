import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { FriendsModule } from '../friends/friends.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LikesController } from './likes.controller';
import { LikesRepository } from './likes.repository';
import { LikesService } from './likes.service';

// Likes (backend/CONTEXT.md — Like; issue #14): "visible ⇒ likeable" — one
// Visibility gate (LikesService.assertVisible) shared by like/unlike/list.
// Depends on ExpensesModule (ExpensesService.findOwnerAndVisibility),
// FriendsModule (FriendshipsService.areFriends, for Friend-only Expenses)
// and BlocksModule (backend/CONTEXT.md — Block, issue #15: a blocked-either-
// direction author's Expense is invisible, and a blocked-either-direction
// liker's Like is excluded from the count and the likers list) through
// providers those modules export — see rules/arch-module-sharing.md.
@Module({
  imports: [PrismaModule, ExpensesModule, FriendsModule, BlocksModule],
  controllers: [LikesController],
  providers: [LikesService, LikesRepository],
})
export class LikesModule {}
