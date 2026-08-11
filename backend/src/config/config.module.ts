import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.schema';

/**
 * Global configuration, validated at boot.
 *
 * In tests, .env.test is the only file read — so a stale development .env
 * cannot point a test run at development data.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: process.env.NODE_ENV === 'test' ? ['.env.test'] : ['.env'],
      validate: validateEnv,
    }),
  ],
})
export class AppConfigModule {}
