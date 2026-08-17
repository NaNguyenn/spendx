import { Module } from '@nestjs/common';
import { ClockModule } from '../clock/clock.module';
import { DailyRatesModule } from '../daily-rates/daily-rates.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesRepository } from './expenses.repository';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [PrismaModule, ClockModule, DailyRatesModule, UsersModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpensesRepository],
  // ExpensesService only: cross-feature access (the Friends module's
  // GET /users/:username/expenses) goes through the service, never the
  // repository — see rules/arch-module-sharing.md.
  exports: [ExpensesService],
})
export class ExpensesModule {}
