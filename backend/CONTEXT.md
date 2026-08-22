# Backend

The API owning spendx's domain model: users, their expenses, and the social graph between them.

## Language

### Money

**Expense**:
A single spending record logged by a User: what was spent, on what, and who may see it.
_Avoid_: Transaction, purchase, entry

**Logged At**:
The immutable timestamp when an Expense was created. Anchors the Daily Rate used for conversion — and nothing else.

**Expense Date**:
The user-settable calendar date an Expense belongs to (defaults to the logging day). Drives all grouping: statistics, summaries, and leaderboard periods.
_Avoid_: Spend date, transaction date

**Original Amount**:
The amount and currency of an Expense exactly as the User entered it. Immutable after logging — correcting it means deleting the Expense and logging a new one.

**Conversion Snapshot**:
An Expense's Original Amount expressed in every Supported Currency, each value derived at the Daily Rate of the logging date, then frozen. Created once when the Expense is logged; never recomputed.
_Avoid_: Conversion matrix, exchange table

**Converted Amount**:
The Conversion Snapshot's entry for a given currency — a reader sees the entry for their own Preferred Currency. Feeds every summary, statistic, and leaderboard total, for owners and Friends alike.
_Avoid_: Normalized amount, base amount

**Preferred Currency**:
The single currency a User has chosen for all of their summaries, statistics, and leaderboard figures.
_Avoid_: Home currency, base currency

**Daily Rate**:
The exchange rate for a currency pair on a given calendar date, snapshotted once daily from an external provider into our own table — conversions never call the provider live. A date with no rate falls back to the most recent earlier rate.

**Supported Currency**:
One of the curated list of currencies (≈10, VND included) a User may pick for an Original Amount or as Preferred Currency. Every Supported Currency has guaranteed Daily Rate coverage.

**Attachment**:
The at-most-one image attached to an Expense. Part of the Expense: inherits its Visibility exactly, appears wherever it appears, deleted with it. Never has its own visibility setting.
_Avoid_: Gallery, photo (as a domain term)

**Category**:
One of eleven fixed, app-curated spending kinds shared by all Users — the vocabulary that makes cross-user categorized views possible. Stored as language-neutral slugs; a slug is frozen once introduced while its localized (en/vi) label may evolve, so slug and label can diverge (ADR-0011). Users cannot create Categories. The kinds, in canonical order, with their boundaries:

- **Food & Drinks** (`food`) — groceries, restaurants, cafés, delivery.
- **Housing** (`housing`) — rent, mortgage, repairs, furnishing, and utilities including phone plans and home internet.
- **Transportation** (`transportation`) — paying someone else to move you: bus, train, taxi, ride-hailing. Flights belong to Travel.
- **Vehicle** (`vehicle`) — the costs of owning one: fuel, maintenance, parts, insurance, parking, registration.
- **Shopping** (`shopping`) — bought goods: clothes, electronics, household products.
- **Life & Entertainment** (`leisure`) — discretionary fun, personal care, and social life: going out, streaming, hobbies, haircuts, gym, gifts & charity, and all pet spending (vet included).
- **Health** (`health`) — human medical only: doctor, dentist, pharmacy, health insurance. Wellness-by-choice (gym, spa, yoga) is Life & Entertainment.
- **Education** (`education`) — tuition, courses, study materials.
- **Travel** (`travel`) — trips as a unit: flights, lodging, holiday spending.
- **Investments** (`investment`) — money put into assets: deposits, stocks, funds.
- **Others** (`other`) — the deliberate catch-all, kept small and meaningless; heavy use of it signals the next Category to add.

_Avoid_: Tag, custom category

**Visibility**:
Who may see an Expense: **Private** (owner only), **Friend-only** (owner and their Friends), or **Public** (anyone). Set per Expense.
_Avoid_: Privacy level, audience

**Shareable Spend**:
The sum of a User's Friend-only and Public expenses for a period — the only total Friends ever see. A User's leaderboard row shows Shareable Spend for every viewer, including the owner.

**Leaderboard**:
The ranking of a User and their Friends by total Shareable Spend (all Categories, highest first) within a Period, expressed in the viewer's Preferred Currency (the sum of the frozen Converted Amounts in that currency). Viewers with different Preferred Currencies may see different orderings.

**Period**:
The window a Leaderboard covers: an ISO calendar week (default) or a calendar month, with boundaries computed in the fixed app timezone.
_Avoid_: Timeframe, cycle

### Social graph

**Username**:
A User's unique public handle — the only way to look someone up (exact match; no fuzzy search, no contact sync). Shown, with display name, wherever a User appears; email is never public.
_Avoid_: Handle (informal), user ID (that's internal)

**Display Name**:
A User's non-unique friendly name, shown alongside the Username.

**Locale**:
A User's account-level language (en or vi), defaulting to the device locale at signup, stored server-side so emails and notifications speak it. Localizes UI strings, Category labels, templates, and formatting — never user content (descriptions and names are shown as written).
_Avoid_: Language setting (informal)

**Friendship**:
A mutual, consented relationship between two Users. Exists only after one side's Friend Request is accepted by the other; both sides see each other's friend-only expenses.
_Avoid_: Follow, follower, connection

**Friend Request**:
A pending offer of Friendship from one User to another. Becomes a Friendship when accepted.

**Block**:
Full mutual invisibility between two Users, initiated by one of them: neither sees the other's content anywhere, neither can send a Friend Request, and any existing Friendship is severed. Applied as a filter before all queries (feed, Leaderboard, search). The blocked User is not notified.
_Avoid_: Mute (a possible future, feed-only concept — not this)

**Like**:
A User's endorsement of an Expense they can see. Visible ⇒ likeable; the count and likers are visible to exactly those who can see the Expense. Likes from viewers later excluded by a Visibility change persist but turn invisible with the Expense.

**Report**:
A User's flag on an Expense they can see, with a reason (spam, inappropriate image, harassment, other). Files into a manual admin review queue — dismiss, hide the Expense, or ban the author. No automatic action at any report count. Reports target Expenses, never Users.
_Avoid_: Flag (as a noun)

**Feed**:
The app-wide stream of every Public expense, newest first (by Logged At), shown to all Users minus Block filtering.
_Avoid_: Timeline, discover (as a noun)

### Account

**One-Time Code**:
A 6-digit code emailed to a User to prove control of their email address, for exactly one purpose: Email Verification or Password Reset. Single-use, expiring (15 minutes for reset, 24 hours for verification), superseded by any newer code for the same purpose, and dead after 5 failed attempts.
_Avoid_: OTP (informal), token (that's a session concern), magic link

**Email Verification**:
The act of confirming a One-Time Code to mark a User's email address as verified. Gates nothing — accounts are fully usable unverified; the state is visible only to the owner on their Profile.
_Avoid_: Activation, confirmation (overloaded)

**Password Reset**:
The flow that replaces a forgotten password via a One-Time Code sent to the account email, without being signed in. Completing it ends all of the User's existing sessions. Requesting one for an unknown email is indistinguishable from requesting one for a known email.
_Avoid_: Password recovery, forgot-password (as a domain term)
