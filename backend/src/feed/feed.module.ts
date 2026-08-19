import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { FeedController } from './feed.controller';
import { FeedRepository } from './feed.repository';
import { FeedService } from './feed.service';

// The Feed (backend/CONTEXT.md — Feed; issue #13): every Public Expense
// app-wide, newest first, minus Block filtering (issue #15). Depends on
// UsersModule for the viewer's own Preferred Currency, via its exported
// UsersRepository — no Friendship dependency, since Visibility alone (not
// Friendship) gates what appears — and BlocksModule for the mutual-
// invisibility filter, via its exported BlocksService.
@Module({
  imports: [PrismaModule, UsersModule, BlocksModule],
  controllers: [FeedController],
  providers: [FeedService, FeedRepository],
})
export class FeedModule {}
