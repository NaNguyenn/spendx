import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { FeedController } from './feed.controller';
import { FeedRepository } from './feed.repository';
import { FeedService } from './feed.service';

// The Feed (backend/CONTEXT.md — Feed; issue #13): every Public Expense
// app-wide, newest first. Depends on UsersModule only for the viewer's own
// Preferred Currency, via its exported UsersRepository — no Friendship
// dependency, since Visibility alone (not Friendship) gates what appears.
@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [FeedController],
  providers: [FeedService, FeedRepository],
})
export class FeedModule {}
