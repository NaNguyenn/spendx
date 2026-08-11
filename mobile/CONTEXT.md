# Mobile

The Expo app's presentation vocabulary. Domain concepts (Expense, Leaderboard, Feed, …) come from the [Backend context](../backend/CONTEXT.md); terms here are screens and navigation only.

## Design source of truth

The UI design lives in [`designs/spendx-mock.pen`](../designs/spendx-mock.pen) — a pen.dev file (structured JSON), authored with the `pen` CLI via the `/pen-design` skill. The brief it was generated from is [`designs/prompt.md`](../designs/prompt.md).

It contains a **Design System — spendx** sheet (color tokens, type scale, visibility language, spacing/radii/elevation/icons, component library) plus full screens: Expenses, Leaderboard, Feed, Profile, Log Expense, Auth (Sign In / Sign Up), and Blocked Accounts — each in light and dark, with Vietnamese variants of the Expenses tab.

Treat it as the reference when building or changing screens: take tokens, component anatomy, and screen layout from it rather than inventing new ones. To read it, inspect the JSON directly or export images with the pen CLI (`pen --help`); it is not a binary format. When the implemented UI and the file diverge, say which one is intended to win instead of silently following either.

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
