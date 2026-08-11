# Conversion rate anchored to logging date, not Expense Date

An Expense has two dates: Logged At (immutable creation timestamp) and Expense Date (user-settable, defaults to today, allows backdating for batch-entered receipts). Grouping — statistics, summaries, leaderboard periods — always uses Expense Date. But the Daily Rate for computing the Converted Amount uses the **logging date**, not the Expense Date: the conversion answers "what was this worth when I recorded it," and never needs to change when the user edits the Expense Date.

## Consequences

- Editing an Expense's date moves it between statistic/leaderboard buckets but never changes its Converted Amount.
- A backdated Expense can retroactively change a past period's leaderboard standings. Accepted — defending a friends leaderboard against backdating isn't worth the complexity.
- A batch-entered old receipt is converted at the entry day's rate, not the spend day's. Accepted imprecision, consistent with ADR-0001's stance that social comparison doesn't need accounting-grade accuracy.
