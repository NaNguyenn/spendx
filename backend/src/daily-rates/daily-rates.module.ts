import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClockModule } from '../clock/clock.module';
import type { Env } from '../config/env.schema';
import { PrismaModule } from '../prisma/prisma.module';
import { ConversionService } from './conversion.service';
import { DAILY_RATE_PROVIDER } from './daily-rate-provider';
import { DailyRateSnapshotJob } from './daily-rate-snapshot.job';
import { DailyRateSnapshotService } from './daily-rate-snapshot.service';
import { DailyRatesRepository } from './daily-rates.repository';
import { ExchangeApiDailyRateProvider } from './exchange-api-daily-rate-provider';
import { StubDailyRateProvider } from './stub-daily-rate-provider';

@Module({
  imports: [PrismaModule, ClockModule],
  providers: [
    DailyRatesRepository,
    // 'exchange-api' in production (or wherever DAILY_RATES_PROVIDER opts in);
    // the honestly-empty stub everywhere else — see DAILY_RATES_PROVIDER in
    // env.schema.ts. A factory (not `useClass`) so the choice is made once,
    // from config, without a second provider entry per implementation; e2e
    // tests still override this same DAILY_RATE_PROVIDER token
    // (test/helpers/app.ts) regardless of which branch this factory takes.
    {
      provide: DAILY_RATE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        config.get('DAILY_RATES_PROVIDER', { infer: true }) === 'exchange-api'
          ? new ExchangeApiDailyRateProvider()
          : new StubDailyRateProvider(),
    },
    DailyRateSnapshotService,
    // Not exported: it's a self-driving cron + boot hook, not a collaborator
    // any other module has a reason to call.
    DailyRateSnapshotJob,
    ConversionService,
  ],
  // DailyRatesRepository stays internal (rules/arch-module-sharing.md): the
  // Daily Rate table is reached only through ConversionService (reads) and
  // DailyRateSnapshotService (writes), so no consumer can query it directly.
  exports: [ConversionService, DailyRateSnapshotService],
})
export class DailyRatesModule {}
