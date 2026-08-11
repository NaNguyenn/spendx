# Mobile

The Expo app's presentation vocabulary. Domain concepts (Expense, Leaderboard, Feed, …) come from the [Backend context](../backend/CONTEXT.md); terms here are screens and navigation only.

## Language

**Expenses Tab**:
The user's own expense list plus personal summary and statistics — the only place full spending (including Private) is shown.

**Leaderboard Tab**:
The Friends ranking for the selected Period (week default / month toggle) with category breakdowns; also surfaces pending Friend Requests.

**Feed Tab**:
The public stream, with Like, Report, and Block actions.

**Profile Tab**:
Account settings: Preferred Currency, Locale, Username/Display Name, blocked list, sign out.

**Log Button**:
The central button in the tab bar — the single entry point for creating an Expense (description, amount + currency, Category, Visibility, optional Attachment, Expense Date).
_Avoid_: FAB, add button
