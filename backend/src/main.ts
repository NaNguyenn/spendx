import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import type { Env } from './config/env.schema';
import { buildOpenApiDocument } from './openapi';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));
  const config = app.get(ConfigService<Env, true>);

  SwaggerModule.setup('docs', app, buildOpenApiDocument(app));

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
}

void bootstrap();
