# spendx

A social expense tracker: an Expo app and a NestJS API where every Expense carries a Visibility, friends compare Shareable Spend on a Leaderboard, and a public Feed shows what people spend.

- **What it does and why** — [issue #1](https://github.com/NaNguyenn/spendx/issues/1) (the MVP spec)
- **The words we use** — [`CONTEXT-MAP.md`](./CONTEXT-MAP.md) → [`backend/CONTEXT.md`](./backend/CONTEXT.md), [`mobile/CONTEXT.md`](./mobile/CONTEXT.md)
- **Decisions and their reasons** — [`docs/adr/`](./docs/adr)
- **The UI** — [`designs/spendx-mock.pen`](./designs/spendx-mock.pen)

## Layout

```
backend/    NestJS API — owns the domain model. Prisma + Postgres.
mobile/     Expo app — presentation only. Consumes the API.
compose.yaml  Postgres, Mailpit (and, later, object storage).
docs/adr/   Decision records.
```

`backend/` and `mobile/` are two independent npm projects, deliberately not a workspace. What crosses between them is a generated type contract ([ADR-0007](./docs/adr/0007-generated-contract-with-drift-check.md)).

## First run

You need [podman](https://podman.io) (or Docker), `make`, and Node — the version is pinned in [`.nvmrc`](./.nvmrc):

```bash
nvm use              # Node 24 LTS
make setup           # installs both projects, wires git hooks, creates backend/.env
```

With podman, enable its API socket once so `podman compose` can reach the runtime:

```bash
systemctl --user enable --now podman.socket
```

Then, in two terminals:

```bash
make dev             # Postgres → migrations → API in watch mode, on :3000
make mobile          # Expo dev server (needs its own TTY for r / a / i)
```

Seed some data to look at:

```bash
make seed
```

## Everyday commands

`make help` lists them all. The ones you'll actually type:

| Command       | What it does                                                        |
| ------------- | ------------------------------------------------------------------- |
| `make dev`    | Services up, migrations applied, API in watch mode                   |
| `make mobile` | Expo dev server                                                      |
| `make test`   | Backend integration suite + mobile unit tests                        |
| `make check`  | Every check CI runs: lint, typecheck, contract drift, all tests      |
| `make seed`   | Load the deterministic development dataset                           |
| `make db-reset` | Drop, recreate, migrate and reseed the development database        |
| `make psql`   | A psql shell on the development database                             |
| `make down`   | Stop the containers (data survives); `make clean` also drops the volume |

## How the pieces fit

### Databases

One Postgres container, two databases: `spendx` for development and `spendx_test` for the integration suite. Port **55432** on the host, so it cannot collide with a system Postgres. Credentials are `spendx` / `spendx` — local only, and the compose file is the source of truth.

The test database is not a convention you have to remember: `backend/.env.test` pins it, and `test/global-setup.ts` refuses to run against any database whose name does not end in `_test`.

### Configuration

`backend/.env.example` is the complete list of variables, all validated by a zod schema at boot ([`src/config/env.schema.ts`](./backend/src/config/env.schema.ts)). A missing or malformed value stops the process with a message naming it. `make setup` copies the example to `backend/.env`; edit that file, never the example, for local changes.

### Email

Outbound email goes through an `EMAIL_SENDER` seam ([`backend/src/email`](./backend/src/email)): `SmtpEmailSender` delivers via nodemailer to Mailpit locally (SMTP on 1025, web UI at [http://localhost:8025](http://localhost:8025)) and a real relay in production. No application flow sends email yet — this is a prefactor for email verification and password reset. `make mail-smoke` sends one test email and prints where to look for it; e2e tests get a fake sender instead (`test/helpers/email-sender.ts`), so nothing in the suite depends on Mailpit being up.

### Tests

The backend's primary seam is its HTTP API: supertest against the fully wired app and a real Postgres. The suite runs serially and truncates every table between tests, so each test arranges exactly the world it asserts on — including the multi-actor cases (owner / friend / stranger / blocked) that the visibility rules in [ADR-0003](./docs/adr/0003-aggregates-never-leak-invisible-expenses.md) live or die by. The development seed is deliberately not used by tests.

Mobile tests are logic-only: pure functions, `jest-expo`, no component or simulator tests.

```bash
npm --prefix backend run test:e2e -- test/health.e2e-spec.ts   # one file
npm --prefix mobile test -- --watch                            # watch mode
```

### The API contract

The backend writes `backend/openapi.json`; `mobile/src/api/schema.d.ts` is generated from it; both are committed. After changing an endpoint:

```bash
make openapi api-types    # then commit both files
```

CI regenerates them and fails if the result differs, so mobile types cannot silently drift from the API. The only hand-written runtime piece is [`mobile/src/api/client.ts`](./mobile/src/api/client.ts).

### How mobile finds the API

`mobile/src/api/base-url.ts` derives the host from Metro's own `hostUri`, so a physical device gets your machine's LAN address and a simulator gets loopback — with Android rewritten to `10.0.2.2`, because `localhost` there means the emulated device, not your laptop. Set `EXPO_PUBLIC_API_URL` to override (staging, production, a tunnel).

### Hooks

`make setup` points `core.hooksPath` at [`.githooks/`](./.githooks). The pre-commit hook runs Prettier and ESLint over staged files only, per project. Formatting rules are shared: one [`.prettierrc`](./.prettierrc) at the root.

## Gotchas

- **npm 11 blocks dependency install scripts.** Approvals are recorded per package *and version* in `package.json` (`allowScripts`). After bumping a dependency that has an install script — Prisma's engines, esbuild — `npm ci` warns and skips it; re-approve with `npm approve-scripts <pkg>`. Prisma's client will not generate without it.
- **Prisma 7 is ESM-first, this backend is CommonJS.** The generator is configured with `moduleFormat = "cjs"`; don't drop that without converting the app. The client is generated into `backend/src/generated/prisma` (gitignored, rebuilt by `postinstall`).
- **Jest needs `--experimental-vm-modules` for Prisma 7.** Baked into the `test:e2e` script.
- **Use `ts-node`, not `tsx`, for scripts that boot Nest.** esbuild drops `emitDecoratorMetadata`, and the failure is silent.
- **`make db-reset` stops for consent when an AI agent is driving.** Prisma refuses destructive commands in an agent session until the human says so explicitly; run it yourself, or pass the consent variable the CLI prints. `make seed` is safe either way — it only inserts rows that are missing.
- **`make check` cannot catch a broken migration order.** Your databases already have every migration applied, so `prisma migrate deploy` reports nothing pending and never replays them; CI starts from an empty database and does. A migration whose timestamp sorts *before* one it depends on fails there with `42704 type ... does not exist`. Check a new migration against a truly empty database before pushing:

  ```bash
  podman exec spendx-pg psql -U spendx -d postgres -c 'CREATE DATABASE spendx_freshcheck_test;'
  DATABASE_URL='postgresql://spendx:spendx@localhost:55432/spendx_freshcheck_test' npx prisma migrate deploy
  ```

  To repair one already applied locally, rename the directory and relabel the row — `UPDATE _prisma_migrations SET migration_name='<new>' WHERE migration_name='<old>';` on both `spendx` and `spendx_test` — rather than resetting, which would drop your development data. The checksum covers `migration.sql`, not the directory name, so a rename keeps it valid.

- **No backend Dockerfile yet** — deliberate, see [ADR-0006](./docs/adr/0006-containerize-backing-services-only.md).
