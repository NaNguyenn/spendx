import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
import { ClockModule } from '../clock/clock.module';
import { FriendsModule } from '../friends/friends.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardRepository } from './leaderboard.repository';
import { LeaderboardService } from './leaderboard.service';

// The Leaderboard (backend/CONTEXT.md — Leaderboard, Shareable Spend,
// Period; issue #12). Depends on FriendsModule (the viewer's Friend list,
// via its exported FriendshipsService), UsersModule (the viewer's own
// PublicUserDto and Preferred Currency, via its exported UsersRepository)
// and BlocksModule (backend/CONTEXT.md — Block, issue #15: a defensive
// participant filter — a severed Friendship already covers the steady
// state, but a Block "applies as a filter before all queries", so this
// belongs here too) — through providers those modules export, never their
// repositories directly (see rules/arch-module-sharing.md).
@Module({
  imports: [
    PrismaModule,
    ClockModule,
    FriendsModule,
    UsersModule,
    BlocksModule,
  ],
  controllers: [LeaderboardController],
  providers: [LeaderboardService, LeaderboardRepository],
})
export class LeaderboardModule {}
