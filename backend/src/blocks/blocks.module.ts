import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BlocksController } from './blocks.controller';
import { BlocksRepository } from './blocks.repository';
import { BlocksService } from './blocks.service';

// Blocks (backend/CONTEXT.md — Block; issue #15): full mutual invisibility,
// applied as a filter before every other module's query surface. Depends on
// PrismaModule only — deliberately not UsersModule (see
// BlocksRepository's doc comment) — so it stays a leaf every visibility-
// gated module (Users, Friends, Expenses, Feed, Leaderboard, Likes) can
// import BlocksService from without a circular module dependency (see
// rules/arch-avoid-circular-deps.md and rules/arch-module-sharing.md).
@Module({
  imports: [PrismaModule],
  controllers: [BlocksController],
  providers: [BlocksRepository, BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}
