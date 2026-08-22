# Category slugs are frozen wire identifiers; labels evolve client-side

When the Category set grew from five to eleven (2026-08), two existing kinds were re-scoped: `food` is now labelled "Food & Drinks" and `leisure` is now "Life & Entertainment". We kept the original slugs and changed only the client-side labels, and made that the standing rule: a Category slug is frozen at introduction — future relabels touch localization files only, never the enum. Renaming the Postgres enum value instead would buy cosmetic slug/label parity at the cost of an enum migration, a data migration over every existing expense row, and a breaking wire-contract change — for zero user-visible benefit, since labels are already localized per Locale and no user ever sees a slug.

Consequence: the enum can read oddly against the UI (`leisure` renders as "Life & Entertainment"). The Category entry in `backend/CONTEXT.md` maps each slug to its current label and boundary.
