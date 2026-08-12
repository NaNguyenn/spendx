# spendx

## Running and testing this project

`README.md` at the root is the operational guide: `make help` lists every command, `make dev` runs the API, `make mobile` runs the Expo app, `make check` runs every check CI runs (CI differs only in getting its Postgres from a service container instead of compose). Read the "Gotchas" section before debugging tooling — Prisma 7 + CommonJS, npm 11 install-script approvals, and `ts-node` vs `tsx` each have a non-obvious failure mode already recorded there.

Decisions about the environment itself live in `docs/adr/0005`–`0007`.

## Agent skills

### Issue tracker

Issues live as GitHub issues on `NaNguyenn/spendx`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context — root `CONTEXT-MAP.md` pointing at per-app `CONTEXT.md` files in `backend/` and `mobile/`. See `docs/agents/domain.md`.
