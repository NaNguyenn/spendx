import { testDb } from './helpers/database';
import { databaseNameFrom } from './helpers/database-url';

/**
 * Tests the test harness itself: the two guarantees every other suite leans on.
 * If these fail, failures elsewhere are noise.
 */
describe('integration harness', () => {
  it('is pointed at a test database', () => {
    expect(databaseNameFrom(process.env.DATABASE_URL!)).toMatch(/_test$/);
  });

  // This test and the next one are a pair, in order: the first leaves a row
  // behind, the second asserts it is gone.
  it('persists rows written during a test', async () => {
    await testDb().user.create({
      data: {
        email: 'harness@example.com',
        username: 'harness',
        displayName: 'Harness',
      },
    });

    await expect(testDb().user.count()).resolves.toBe(1);
  });

  it('starts each test with an empty database', async () => {
    await expect(testDb().user.count()).resolves.toBe(0);
  });
});
