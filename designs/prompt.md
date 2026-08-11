Design a mobile UI + design system for **spendx**, a
social expense tracker (Expo/React Native app, iOS + Android).

## The product

Every expense the user logs carries a Visibility: Private, Friend-only, or Public.
People log spending in any of ~10 Supported Currencies; the app shows their own
statistics in one Preferred Currency (VND is a first-class case). Friends — mutual,
consent-based — are ranked on a weekly/monthly Leaderboard by "Shareable Spend"
(their Friend-only + Public totals only; Private spending never leaks into any number
a friend sees). A public Feed streams everyone's Public expenses with Like, Report,
and Block. The whole app is bilingual English/Vietnamese.

## Navigation shell

Four tabs — Expenses, Leaderboard, Feed, Profile — with a prominent central **Log
Button** in the tab bar as the single entry point for creating an expense.

## Screens to design

1. **Log Expense** (sheet/modal from the Log Button): description, amount + currency
   picker, Category (fixed set: Housing, Food, Leisure, Investment, Other), Visibi
   selector, Expense Date (defaults today, backdating allowed), optional single image
   attachment.
2. **Expenses tab**: the user's own list (all visibilities, with a clear visibility
   marker per row) + personal summary — weekly/monthly totals and per-Category
   breakdown. Rows show Original Amount and the frozen Converted Amount.
3. **Leaderboard tab**: week (default) / month toggle, ranked friend rows with tot
   in the viewer's currency, expandable per-Category breakdown, past-period browsing,
   and pending Friend Requests surfaced here.
4. **Feed tab**: infinite public stream — author (display name + @username), category,
   amount in viewer's currency alongside the original, optional image, like/report
5. **Profile tab**: Preferred Currency, Locale (en/vi), username/display name, blocked
   list, sign out.
6. **Auth**: sign up + sign in (email/password).

## Design system (deliver as its own sheet first, then apply it consistently)

- Color tokens with light + dark mode, plus a distinct color per Category and a cl
  visual language for the three Visibility states (Private / Friend-only / Public) that
  reads instantly without text.
- Type scale tuned for money: large tabular-figure amounts, secondary original-amount
  line. Must survive long VND figures (e.g. 1.250.000 ₫) without truncating.
- Spacing scale, radii, elevation, iconography.
- Components: expense row, expense card (feed), leaderboard rank row, category chi
  visibility selector, currency picker, amount input, segmented period toggle, tab bar
  with the central Log Button, empty states.

## Constraints

- Every string must tolerate ~30% growth for Vietnamese; no fixed-width labels.
- Native-feeling on both iOS and Android; respect safe areas and thumb reach.
- Playful and social enough to feel like a habit app, but numbers stay legible and
  trustworthy — this is still a money tool.

Show light and dark mode for the key screens.
