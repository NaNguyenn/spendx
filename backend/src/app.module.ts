import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard, seconds } from '@nestjs/throttler';
import {
  AUTH_THROTTLER,
  skipUnlessAuthRateLimited,
} from './auth/auth-rate-limit.decorator';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './config/config.module';
import type { Env } from './config/env.schema';
import { ExpensesModule } from './expenses/expenses.module';
import { FriendsModule } from './friends/friends.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AppConfigModule,
    // Drives DailyRateSnapshotJob's daily @Cron (src/daily-rates).
    ScheduleModule.forRoot(),
    // Two named throttlers per RATE_LIMIT_MAX/AUTH_RATE_LIMIT_MAX (#18).
    // 'default' covers every route; 'auth' covers only the routes marked
    // @AuthRateLimited(), so a controller added later inherits the ordinary
    // allowance rather than silently inheriting the much tighter
    // credential-guessing one.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        {
          name: 'default',
          ttl: seconds(60),
          limit: config.get('RATE_LIMIT_MAX', { infer: true }),
        },
        {
          name: AUTH_THROTTLER,
          ttl: seconds(60),
          limit: config.get('AUTH_RATE_LIMIT_MAX', { infer: true }),
          skipIf: skipUnlessAuthRateLimited,
        },
      ],
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ExpensesModule,
    FriendsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
