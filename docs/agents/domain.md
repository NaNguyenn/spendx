# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** at the repo root — system-wide decisions. Read ADRs that touch the area you're about to work in.
- **`backend/docs/adr/`** and **`mobile/docs/adr/`** — context-scoped decisions for the app you're working in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

This is a **multi-context** repo — two deployable apps with their own vocabularies:

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
├── backend/                           ← NestJS API
│   ├── CONTEXT.md
│   ├── docs/adr/                      ← API-specific decisions
│   └── src/
└── mobile/                            ← Expo app
    ├── CONTEXT.md
    ├── docs/adr/                      ← app-specific decisions
    └── src/
```

A decision that constrains both apps (a shared API contract, an auth scheme, a money representation) belongs in the root `docs/adr/`. A decision internal to one app belongs in that app's `docs/adr/`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
