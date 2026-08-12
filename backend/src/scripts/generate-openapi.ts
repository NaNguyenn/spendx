import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { buildOpenApiDocument } from '../openapi';

/**
 * Writes the OpenAPI document the mobile app's types are generated from
 * (ADR-0007). The application is created but never initialised or listened on,
 * so no database connection is opened — configuration still has to be valid,
 * which is why CI copies .env.example into place first.
 */
async function generate(): Promise<void> {
  // abortOnError would have Nest swallow a bootstrap failure, log it through
  // the logger disabled on the line above, and exit(1) with no output at all —
  // leaving a CI failure with nothing to read. Reject instead, and print below.
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  const document = buildOpenApiDocument(app);
  const target = resolve(__dirname, '../../openapi.json');

  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();

  console.log(`Wrote ${target}`);
}

generate().catch((error: unknown) => {
  console.error('Failed to generate openapi.json:');
  console.error(error);
  process.exitCode = 1;
});
