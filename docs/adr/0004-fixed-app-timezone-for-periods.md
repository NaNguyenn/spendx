# Period boundaries use one fixed app timezone

Leaderboard Periods (ISO weeks, calendar months) are computed in a single fixed app timezone — Asia/Ho_Chi_Minh — not each user's device timezone. Per-user timezones would let two Friends disagree about which Period an Expense falls in, producing different standings per viewer and breaking the property (ADR-0003) that everyone sees the same leaderboard. The cost — an expense logged late at night abroad may land in the "wrong" local day — is acceptable for the MVP's Vietnam-centric user base.
