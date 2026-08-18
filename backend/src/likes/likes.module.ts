import { Module } from '@nestjs/common';
import { ExpensesModule } from '../expenses/expenses.module';
import { FriendsModule } from '../friends/friends.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LikesController } from './likes.controller';
import { LikesRepository } from './likes.repository';
import { LikesService } from './likes.service';

// Likes (backend/CONTEXT.md — Like; issue #14): "visible ⇒ likeable" — one
// Visibility gate (LikesService.assertVisible) shared by like/unlike/list.
// Depends on ExpensesModule (ExpensesService.findOwnerAndVisibility) and
// FriendsModule (FriendshipsService.areFriends, for Friend-only Expenses)
// through providers those modules export — see rules/arch-module-sharing.md.
@Module({
  imports: [PrismaModule, ExpensesModule, FriendsModule],
  controllers: [LikesController],
  providers: [LikesService, LikesRepository],
})
export class LikesModule {}
