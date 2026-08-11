/** The database name a connection string points at, e.g. `spendx_test`. */
export function databaseNameFrom(url: string): string {
  return new URL(url).pathname.replace(/^\//, '');
}
