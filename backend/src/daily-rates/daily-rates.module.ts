import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConversionService } from './conversion.service';
import { DAILY_RATE_PROVIDER } from './daily-rate-provider';
import { DailyRateSnapshotService } from './daily-rate-snapshot.service';
import { DailyRatesRepository } from './daily-rates.repository';
import { StubDailyRateProvider } from './stub-daily-rate-provider';

@Module({
  imports: [PrismaModule],
  providers: [
    DailyRatesRepository,
    { provide: DAILY_RATE_PROVIDER, useClass: StubDailyRateProvider },
    DailyRateSnapshotService,
    ConversionService,
  ],
  // DailyRatesRepository stays internal (rules/arch-module-sharing.md): the
  // Daily Rate table is reached only through ConversionService (reads) and
  // DailyRateSnapshotService (writes), so no consumer can query it directly.
  exports: [ConversionService, DailyRateSnapshotService],
})
export class DailyRatesModule {}
