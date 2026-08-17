# Daily Rates come from the fawazahmed0 exchange-api dataset

Completes the pipeline ADR-0001 designed and ADR-0008 tightened: the production `DailyRateProvider` adapter fetches from the [fawazahmed0 exchange-api](https://github.com/fawazahmed0/exchange-api) open dataset — per-date JSON documents served from two independent CDNs (jsDelivr primary, Cloudflare Pages fallback). Chosen because it is the only candidate that clears every bar at once: **VND coverage** (the ECB-backed options, e.g. Frankfurter, lack it), **no API key** (nothing to provision, rotate, or leak; one less env variable that can brick a deployment), **per-date historical URLs** (the snapshot job can backfill history so backdated Expenses don't all convert at first-deployment rates), and **no request budget** (a 10-currency snapshot is ten document fetches a day; a backfill is a few dozen).

A once-daily job (`DailyRateSnapshotJob`) drives the existing `DailyRateSnapshotService` seam. It runs a *catch-up*, not a single-date fetch: every date in a trailing window (`DAILY_RATES_BACKFILL_DAYS`, default 7) that doesn't yet hold the full ordered-pair matrix gets snapshotted — on the daily cron tick and once at application bootstrap. Coverage is judged by row count against the full matrix size, not by "any row", so a date left partial by an older seed or a since-added currency is re-snapshotted rather than skipped forever. That one shape gives first-deploy backfill, self-healing after a provider outage or missed tick, and idempotent re-runs (the repository upserts) without separate code paths.

## Decisions folded in

- **The adapter owns the every-ordered-pair invariant** (ADR-0008). It fetches all ten base documents, derives the inverse (`1/rate`) for any pair published in only one direction, and throws if any of the ~90 ordered pairs is still missing — so the table only ever receives complete matrices, and conversion stays a direct pair lookup.
- **A provider failure writes nothing.** Any base document failing on both CDNs fails the whole fetch before a single row is touched; the repository write was already transactional. Conversions ride the existing most-recent-earlier fallback until the next catch-up heals the gap.
- **The cron fires at 15:00 Asia/Ho_Chi_Minh** (08:00 UTC). The dataset's file for calendar date *D* appears during *D*'s UTC morning; ICT runs 7 hours ahead, so an early-ICT run would ask for a file that doesn't exist yet. Until the tick lands, the day converts at yesterday's rate — exactly the domain's fallback rule, not a special case.
- **Dev and test default to the stub provider** (`DAILY_RATES_PROVIDER`, defaulted from `NODE_ENV`); production defaults to the real adapter with zero configuration. Tests keep injecting `FakeDailyRateProvider` through the DI seam regardless.

## Considered Options

- **Frankfurter / ECB reference rates**: institutional source, but no VND — disqualifying for this product (backend/CONTEXT.md — Supported Currency).
- **Keyed commercial APIs (exchangerate.host, ExchangeRate-API keyed tier, currencyapi)**: real SLAs, but an API key plus quota management for what is ten cached-CDN fetches a day; free tiers restrict historical access, which the backfill needs.
- **Scraping a central-bank feed for VND**: bespoke parser per currency, the opposite of a curated multi-currency list.

## Consequences

- The source is a community-maintained dataset, not a contracted feed: no SLA, and rates are indicative rather than bank-settlement grade. Acceptable for social comparison (ADR-0001's stance); the two-CDN fallback, all-or-nothing writes, and the self-healing catch-up bound the damage of a bad day to "yesterday's rates for a while".
- If the dataset ever dies, the blast radius is one file: a replacement adapter behind `DailyRateProvider`, plus this ADR's successor.
- Rate values are stored at the column's 10-decimal scale; derived inverses are computed in floating point before formatting — ~15 significant digits, far inside what an indicative daily rate carries.
