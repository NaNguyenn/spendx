import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * The development dataset. Deterministic on purpose: the same rows every run,
 * so a screenshot or a manual click-through means something and two runs can be
 * compared.
 *
 * The integration suite deliberately does NOT use this — tests arrange through
 * the public API so a viewer's expected view is visible in the test itself.
 *
 * The cast grows with the feature tickets: Expenses and Daily Rates arrive with
 * #4, Friendships and Friend Requests with #11, Blocks with #15. Add them here
 * as those models land, keeping every value fixed.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set — see backend/.env.example.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/** The people. Fixed ids so seeded data is stable across runs. */
const users = [
  {
    id: '01920000-0000-7000-8000-000000000001',
    email: 'you@example.com',
    username: 'you',
    displayName: 'You',
  },
  {
    id: '01920000-0000-7000-8000-000000000002',
    email: 'mai@example.com',
    username: 'mai',
    displayName: 'Mai',
  },
  {
    id: '01920000-0000-7000-8000-000000000003',
    email: 'tuan@example.com',
    username: 'tuan',
    displayName: 'Tuấn',
  },
  {
    id: '01920000-0000-7000-8000-000000000004',
    email: 'linh@example.com',
    username: 'linh',
    displayName: 'Linh',
  },
  {
    // Blocks you once #15 lands; here so the blocked-viewer cases have a body.
    id: '01920000-0000-7000-8000-000000000005',
    email: 'blocked@example.com',
    username: 'blocked',
    displayName: 'Blocked Stranger',
  },
  {
    id: '01920000-0000-7000-8000-000000000006',
    email: 'stranger@example.com',
    username: 'stranger',
    displayName: 'Stranger',
  },
];

async function main(): Promise<void> {
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: user,
      update: user,
    });
  }

  console.log(`Seeded ${users.length} users.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
