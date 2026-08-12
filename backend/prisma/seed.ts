import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { ScryptPasswordHasher } from '../src/auth/scrypt-password-hasher';

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

// Every seeded account signs in with this password. Never used outside a
// local development database.
const DEV_PASSWORD = 'spendx-dev-password';

/** The people. Fixed ids so seeded data is stable across runs. */
const users = [
  {
    id: '01920000-0000-7000-8000-000000000001',
    email: 'you@example.com',
    username: 'you',
    displayName: 'You',
    preferredCurrency: 'VND' as const,
    locale: 'en' as const,
  },
  {
    id: '01920000-0000-7000-8000-000000000002',
    email: 'mai@example.com',
    username: 'mai',
    displayName: 'Mai',
    preferredCurrency: 'VND' as const,
    locale: 'vi' as const,
  },
  {
    id: '01920000-0000-7000-8000-000000000003',
    email: 'tuan@example.com',
    username: 'tuan',
    displayName: 'Tuấn',
    preferredCurrency: 'VND' as const,
    locale: 'vi' as const,
  },
  {
    id: '01920000-0000-7000-8000-000000000004',
    email: 'linh@example.com',
    username: 'linh',
    displayName: 'Linh',
    preferredCurrency: 'VND' as const,
    locale: 'vi' as const,
  },
  {
    // Blocks you once #15 lands; here so the blocked-viewer cases have a body.
    id: '01920000-0000-7000-8000-000000000005',
    email: 'blocked@example.com',
    username: 'blocked',
    displayName: 'Blocked Stranger',
    preferredCurrency: 'USD' as const,
    locale: 'en' as const,
  },
  {
    id: '01920000-0000-7000-8000-000000000006',
    email: 'stranger@example.com',
    username: 'stranger',
    displayName: 'Stranger',
    preferredCurrency: 'USD' as const,
    locale: 'en' as const,
  },
];

async function main(): Promise<void> {
  const passwordHasher = new ScryptPasswordHasher();
  const passwordHash = await passwordHasher.hash(DEV_PASSWORD);

  // skipDuplicates rather than upsert: re-seeding leaves existing rows exactly
  // as they are, instead of bumping every updatedAt on every run. Use
  // `make db-reset` when you want the dataset rebuilt from scratch.
  const { count } = await prisma.user.createMany({
    data: users.map((user) => ({ ...user, passwordHash })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${count} of ${users.length} users (the rest existed).`);
  console.log(`Every seeded account's password is "${DEV_PASSWORD}".`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
