# Prisma is the persistence layer

The backend reaches Postgres through Prisma. Money columns are `Decimal` — Prisma returns them as `Decimal.js` instances, never JavaScript numbers, which is how the spec's "decimal-safe end to end, never binary floats" survives contact with the database driver. The visibility-filtered aggregates behind the Leaderboard (ADR-0003) are written as raw SQL through `$queryRaw`, because the predicate that decides what a viewer may see is the thing under test and it should be legible as SQL rather than assembled by a query builder.

Migrations are Prisma's: `prisma migrate dev` locally, `prisma migrate deploy` in test setup and CI. The seed is `prisma/seed.ts`.

The alternatives were Drizzle (SQL-first, and an empty `backend/drizzle/` directory in the repo was a leftover of that intent — since removed), TypeORM, and Kysely. Drizzle and Kysely would have kept everything closer to SQL; TypeORM is the most Nest-idiomatic and therefore the default an unguided agent drifts toward, but its money handling is lossy unless configured with transformers, which is precisely the trap this project cannot afford. Prisma was chosen for its migration and seeding story and its typed client, accepting two known costs: a separate schema language, and a query engine that must be generated (`prisma generate`) in every environment, including CI.

The deployment consequence, recorded here so it is not discovered on a deploy day: Prisma ships platform-specific engine binaries, so `binaryTargets` must name the deploy platform's libc. An Alpine/musl host that was never listed is the standard first-deploy failure. There is no backend container image yet (ADR-0006), so this is a note for whoever writes one.
