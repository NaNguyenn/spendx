# Two-stage currency conversion for multi-currency expenses

Expenses may be logged in any currency, but summaries, statistics, and the friends leaderboard need a single unit. We convert twice: (1) at logging time, the Original Amount is converted into the owner's Preferred Currency at that day's Daily Rate and **frozen** as the Converted Amount — the source of truth for all of the owner's own aggregates; (2) at view time, the friends leaderboard converts each friend's total (already in that friend's Preferred Currency) into the viewer's Preferred Currency at **today's** rate.

## Considered Options

- **Per-expense re-conversion for viewers** (convert every friend expense's Original Amount at its log-date rate into the viewer's currency): most historically accurate, but makes every aggregate viewer- and date-dependent — nothing can be summed once and reused, and each viewer currency needs a parallel set of totals. Rejected: structural cost for precision a social leaderboard doesn't need.
- **Currency-free ranking** (rank by count/streaks instead of amounts): dodges conversion entirely but guts the "compare spending" core of the leaderboard. Rejected.

## Consequences

- A friend's expense may display slightly differently for a viewer than what the owner logged, and leaderboard rankings can shift with exchange rates alone. Accepted as fine for a social (not accounting) feature.
- A historical Daily Rate table keyed by (currency pair, date) is required from day one, filled by a once-daily snapshot job from an external provider (chosen for VND coverage, behind an interface); conversions read only our table. Missing dates fall back to the most recent earlier rate.
- Changing Preferred Currency triggers a one-off recompute of all of that user's Converted Amounts, each re-derived from its Original Amount at the Daily Rate of its original date — preserving the invariant that all of a user's Converted Amounts are in their current Preferred Currency.
