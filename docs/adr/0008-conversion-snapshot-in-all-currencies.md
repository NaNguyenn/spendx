# Conversion Snapshot: freeze every Supported Currency at logging time

Partially supersedes ADR-0001. Instead of storing one Converted Amount in the owner's Preferred Currency and re-converting for viewers at today's rate, every Expense now stores a **Conversion Snapshot**: its Original Amount expressed in all Supported Currencies, each derived at the logging date's Daily Rate (most-recent-earlier fallback) and frozen. Every read — owner summaries, friend feed, Leaderboard — shows the snapshot entry for the reader's Preferred Currency. This buys log-date-stable numbers for viewers (not just owners), makes a Preferred Currency change a pure read-path switch (ADR-0001's recompute job is never built), and removes rate lookups from every read path.

## Decisions folded in

- **Snapshot writes are all-or-nothing.** An Expense and its full snapshot persist in one transaction; if any needed pair has no Daily Rate coverage at all (the fallback finds nothing), logging fails with 503 and nothing persists. A snapshot therefore always exists in full — reads never handle a missing entry. The same-currency entry is exact identity, never a lookup.
- **Original Amount and Original Currency are immutable after logging.** Edits touch only description, category, visibility, and Expense Date — none affect conversion, so the snapshot is write-once and edits never call the conversion service. Fixing a wrong amount means delete + re-log, which freezes at the *new* logging date's rates. Accepted: social comparison, not accounting (ADR-0001's stance, unchanged).
- **Rate anchoring is unchanged** (ADR-0002): the logging date, never the Expense Date.
- **Storage is a child table** (one row per Expense × Supported Currency, fixed 4-decimal scale, rounded per value at write) rather than per-currency columns or JSON — aggregates parameterize by currency *value* so one query serves every viewer, and adding a currency is data, not DDL.
- **The Daily Rate table must carry every ordered pair each day** (~90 rows/day for 10 currencies); the provider adapter derives inverses if the provider publishes only one direction. Conversion stays a direct pair lookup — no cross-rate derivation at conversion time. The adapter and its cron are still the later ticket ADR-0001 named; until they land, nothing enforces the every-ordered-pair invariant and a coverage gap simply surfaces as the 503 below.
- **Adding a Supported Currency backfills legacy Expenses at the earliest known rate** for the new pairs (at-or-before the logging date when history exists, else the earliest rate on record). This bends "frozen at log date" for legacy rows only; the alternative — gating a currency launch on provider history back to the oldest Expense — couples product to data a provider may not have.
- **The API shape is unchanged**: responses still carry a single converted amount + currency, now served as the snapshot entry for the requester (later, the viewer). The snapshot never crosses the wire.

## Considered Options

- **Keep ADR-0001's two-stage model** (frozen owner value + today's-rate viewer conversion): fewer stored values, viewer rankings consistent across currencies, but viewer numbers drift with rates, Preferred Currency changes need a recompute job, and viewer reads need rate lookups. Rejected — the reasons this change exists.
- **Convert for viewers per-expense at read time** (ADR-0001's rejected option): unchanged verdict — makes every aggregate viewer- and date-dependent.
- **Snapshot only owner + a few "popular" currencies**: saves little and reintroduces a missing-entry read path for everyone else. Rejected.

## Consequences

- Two viewers with different Preferred Currencies can see **different Leaderboard orderings** of the same friends: each currency's totals accumulated different historical rates, so there is no single "who spent most" fact. Accepted for a social feature.
- A single Supported-Currency pair with no rate history blocks **all** expense logging (previously only cross-currency logs into that pair failed). Mitigated by the fallback — only a pair with no rows ever trips it — and surfaced as 503, matching the existing "our data pipeline's gap, retry later" semantics.
- Existing dev-era Expense rows predating the snapshot are not migrated: the migration deletes them (their logging dates have no Daily Rate coverage to derive a snapshot from). Users and Daily Rates survive; no production data exists.
- `expense_conversions` grows at 10× the Expense rate — trivial at this scale, revisit if the currency list grows an order of magnitude.
