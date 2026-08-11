import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

let client: PrismaClient | undefined;

/**
 * A Prisma client for arranging and inspecting data directly, separate from the
 * one the application under test uses.
 */
export function testDb(): PrismaClient {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set — global-setup.ts should have.');
    }
    client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  return client;
}

/**
 * Empties every application table.
 *
 * Discovered from the catalog rather than listed by hand, so a new model can
 * never quietly opt out of isolation. The suite runs serially (maxWorkers: 1),
 * so truncating between tests is safe.
 */
export async function truncateAll(): Promise<void> {
  const db = testDb();

  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const list = tables
    .map(({ tablename }) => `"public"."${tablename}"`)
    .join(', ');
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function disconnectTestDb(): Promise<void> {
  await client?.$disconnect();
  client = undefined;
}
