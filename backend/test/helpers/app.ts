import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { CLOCK, type Clock } from '../../src/clock/clock';
import {
  DAILY_RATE_PROVIDER,
  type DailyRateProvider,
} from '../../src/daily-rates/daily-rate-provider';

export interface CreateTestAppOptions {
  /** Overrides the CLOCK provider — see `helpers/clock.ts`. */
  clock?: Clock;
  /** Overrides the DAILY_RATE_PROVIDER provider — see `helpers/daily-rate-provider.ts`. */
  dailyRateProvider?: DailyRateProvider;
}

/**
 * Boots the fully wired application, configured exactly as main.ts configures
 * it — a test that passes against a differently-configured app proves
 * nothing. `options` overrides the project's two internal DI seams
 * (issue #1, "Testing Decisions"); every other provider is the real one,
 * including a real Postgres.
 */
export async function createTestApp(
  options: CreateTestAppOptions = {},
): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({ imports: [AppModule] });

  if (options.clock) {
    builder.overrideProvider(CLOCK).useValue(options.clock);
  }
  if (options.dailyRateProvider) {
    builder
      .overrideProvider(DAILY_RATE_PROVIDER)
      .useValue(options.dailyRateProvider);
  }

  const moduleRef = await builder.compile();

  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return app;
}
