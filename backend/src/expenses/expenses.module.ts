import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
import { ClockModule } from '../clock/clock.module';
import { DailyRatesModule } from '../daily-rates/daily-rates.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesRepository } from './expenses.repository';
import { ExpensesService } from './expenses.service';

// BlocksModule (backend/CONTEXT.md — Block, issue #15): every read's
// likeCount excludes Likes from a User mutually invisible with the viewer —
// see ExpensesRepository's likeStateInclude.
@Module({
  imports: [
    PrismaModule,
    ClockModule,
    DailyRatesModule,
    UsersModule,
    BlocksModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpensesRepository],
  // ExpensesService only: cross-feature access (the Friends module's
  // GET /users/:username/expenses) goes through the service, never the
  // repository — see rules/arch-module-sharing.md.
  exports: [ExpensesService],
})
export class ExpensesModule {}
