import { resolve } from 'node:path';
import { config as loadEnvFile } from 'dotenv';
import { disconnectTestDb, truncateAll } from './helpers/database';

// Jest workers inherit the environment global-setup.ts prepared, but loading
// the file here too keeps a worker self-sufficient (and `jest -t` runs honest).
loadEnvFile({
  path: resolve(__dirname, '../.env.test'),
  override: true,
  quiet: true,
});

// Every test starts from an empty database. Arrange what you need inside the
// test — fixtures shared across tests turn expectations into magic numbers.
beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await disconnectTestDb();
});
