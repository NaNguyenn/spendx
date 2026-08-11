import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { config as loadEnvFile } from 'dotenv';
import { databaseNameFrom } from './helpers/database-url';

const backendRoot = resolve(__dirname, '..');

/**
 * Runs once before the whole integration suite.
 *
 * Loads .env.test (overriding any development .env already exported into the
 * shell), refuses to continue unless the target database is a test database,
 * then brings its schema up to date.
 */
export default function globalSetup(): void {
  loadEnvFile({
    path: resolve(backendRoot, '.env.test'),
    override: true,
    quiet: true,
  });

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Expected backend/.env.test to provide it.',
    );
  }

  // The guard that makes "tests can never touch development data" true rather
  // than merely intended.
  const database = databaseNameFrom(url);
  if (!database.endsWith('_test')) {
    throw new Error(
      `Refusing to run the integration suite against "${database}": the ` +
        'database name must end in _test. Check backend/.env.test.',
    );
  }

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: backendRoot,
    env: process.env,
    stdio: 'inherit',
  });
}
