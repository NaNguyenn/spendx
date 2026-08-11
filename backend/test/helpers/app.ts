import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';

/**
 * Boots the fully wired application, configured exactly as main.ts configures
 * it — a test that passes against a differently-configured app proves nothing.
 */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return app;
}
