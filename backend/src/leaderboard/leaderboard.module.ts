import { Module } from '@nestjs/common';
import { ClockModule } from '../clock/clock.module';
import { FriendsModule } from '../friends/friends.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardRepository } from './leaderboard.repository';
import { LeaderboardService } from './leaderboard.service';

// The Leaderboard (backend/CONTEXT.md — Leaderboard, Shareable Spend,
// Period; issue #12). Depends on FriendsModule (the viewer's Friend list,
// via its exported FriendshipsService) and UsersModule (the viewer's own
// PublicUserDto and Preferred Currency, via its exported UsersRepository) —
// through providers those modules export, never their repositories
// directly (see rules/arch-module-sharing.md).
@Module({
  imports: [PrismaModule, ClockModule, FriendsModule, UsersModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService, LeaderboardRepository],
})
export class LeaderboardModule {}
