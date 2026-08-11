import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';

/**
 * The OpenAPI document: served at /docs in development and written to
 * openapi.json by `npm run openapi:generate`, which is the contract the mobile
 * app's types are generated from (ADR-0007).
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('spendx API')
    .setDescription(
      'The API owning the spendx domain model: users, expenses, and the ' +
        'social graph between them.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
}
