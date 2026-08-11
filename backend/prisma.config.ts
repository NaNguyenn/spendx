import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// DATABASE_URL comes from .env (development) or .env.test (integration suite,
// loaded by test/global-setup.ts before the CLI is invoked).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
