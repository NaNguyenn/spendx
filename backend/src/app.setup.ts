import { type INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Application-wide wiring shared by main.ts and the integration tests, so the
 * app under test is the app that ships.
 */
export function configureApp<T extends INestApplication>(app: T): T {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.enableShutdownHooks();

  return app;
}
