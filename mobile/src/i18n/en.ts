/**
 * The English catalogue and the source of truth for `TranslationKey` — every
 * other catalogue (currently just `vi`) is typed against the keys listed
 * here, so adding a string only here is a compile error everywhere else
 * (see vi.ts). Flat, dot-namespaced keys rather than a nested object: a flat
 * `Record<TranslationKey, string>` is what lets `vi.ts` be checked key-by-key
 * against this one.
 *
 * Tab labels and screen titles double up (`tab.expenses` is also the
 * Expenses screen's title) because the design uses the same word for both —
 * a second `expenses.title` key would just be this one, copied.
 */
export const en = {
  // The accessible name of the backdrop that dismisses a bottom sheet — never
  // drawn, but read aloud, so it is a shell string like any other.
  'common.close': 'Close',
  'common.done': 'Done',
  'common.cancel': 'Cancel',
  // The friend drill-down screen's back chevron (app/friend/[username].tsx)
  // — a pushed screen rather than a sheet, so "Back" reads truer than
  // `common.close`'s "dismiss a sheet" framing.
  'common.back': 'Back',

  // Accessible names for the Like pill (backend/CONTEXT.md's Like entry,
  // issue #14) — shared by both surfaces that show it (feed-card.tsx,
  // expense-row.tsx), so unprefixed like `common.*` rather than
  // screen-namespaced.
  'like.like': 'Like',
  'like.unlike': 'Unlike',

  // Block (backend/CONTEXT.md's Block entry, issue #15) — shared across
  // every surface that can trigger it (feed-card.tsx's Block circle,
  // friend/[username].tsx's header button), same unprefixed shape as
  // `like.*` above.
  'block.action': 'Block',
  // {name} — see leaderboard.friends.unfriendConfirmTitle's own note on why
  // the param goes on this key and not the message below.
  'block.confirmTitle': 'Block {name}?',
  'block.confirmMessage':
    "Neither of you will see the other's content anywhere, and any friendship between you ends. They won't be notified.",
  'block.confirm': 'Block',

  'tab.expenses': 'Expenses',
  'tab.leaderboard': 'Leaderboard',
  'tab.feed': 'Feed',
  'tab.profile': 'Profile',

  'logButton.accessibilityLabel': 'Log expense',

  'expenses.subtitle': 'Your log · all visibilities',
  'statistics.periodToggle.week': 'This week',
  'statistics.periodToggle.month': 'This month',
  'statistics.overline.total': 'TOTAL',
  'statistics.delta.lessThanWeek': 'less than last week',
  'statistics.delta.lessThanMonth': 'less than last month',
  'statistics.delta.moreThanWeek': 'more than last week',
  'statistics.delta.moreThanMonth': 'more than last month',
  'expenses.recent': 'Recent',
  'expenses.empty.title': 'Nothing logged yet',
  'expenses.empty.note': 'Tap the log button below to add your first expense.',
  // No `expenses.loadError` counterpart: the screen renders whatever
  // `getErrorMessage` produces (`apiError.network` when the server is
  // unreachable, the server's own message otherwise), for the same reason
  // profile.tsx does — the user just opened their own expenses, so *what*
  // failed is already obvious; *why* is the part worth saying.
  'expenses.retry': 'Try again',
  // The Leaderboard screen's header subtitle (mobile ticket #12) — mirrors
  // the design's "Friends by Shareable Spend" (`y2fef` in
  // designs/spendx-mock.pen), same header anatomy as the Expenses tab's own
  // subtitle + CurrencyPill.
  'leaderboard.subtitle': 'Friends by Shareable Spend',
  'leaderboard.retry': 'Try again',
  'leaderboard.addFriend.title': 'Add a friend',
  'leaderboard.addFriend.label': 'Username',
  'leaderboard.addFriend.placeholder': 'minhtran',
  'leaderboard.addFriend.submit': 'Send friend request',
  'leaderboard.addFriend.sent': 'Friend request sent.',
  // {count} is the number of pending requests in that direction.
  'leaderboard.requests.incomingOverline': 'FRIEND REQUESTS · {count}',
  'leaderboard.requests.outgoingOverline': 'SENT REQUESTS · {count}',
  // {username} is the request's other party — the sender for an incoming
  // request, the recipient for an outgoing one (lib/friend-requests.ts).
  'leaderboard.request.incomingSubtitle': '@{username} wants to compare',
  'leaderboard.request.outgoingSubtitle': 'Waiting for @{username} to accept',
  'leaderboard.request.accept': 'Accept',
  'leaderboard.request.decline': 'Decline',
  'leaderboard.request.cancel': 'Cancel request',
  // The Friends list (design's plain roster) is absorbed into the Ranking
  // below; these empty-state/unfriend keys are shared with the Ranking
  // section and the friend drill-down screen (app/friend/[username].tsx).
  'leaderboard.friends.unfriend': 'Unfriend',
  'leaderboard.friends.unfriendConfirmTitle': 'Unfriend {name}?',
  'leaderboard.friends.unfriendConfirmMessage':
    'They stop seeing your Friend-only expenses, and you stop seeing theirs.',
  'leaderboard.friends.unfriendConfirm': 'Unfriend',
  'leaderboard.friends.empty.title': 'No friends yet',
  'leaderboard.friends.empty.note':
    'Add a friend by their exact @username above.',

  // Period Browser (design component `umxjF`): the centred label's second
  // line, and the two chevrons' accessible names.
  'leaderboard.periodBrowser.currentWeek': 'current week',
  'leaderboard.periodBrowser.pastWeek': 'past week',
  'leaderboard.periodBrowser.currentMonth': 'current month',
  'leaderboard.periodBrowser.pastMonth': 'past month',
  'leaderboard.periodBrowser.previous': 'Previous period',
  'leaderboard.periodBrowser.next': 'Next period',

  // The Ranking section's overline, above the Rank Rows — "THIS WEEK · 4
  // FRIENDS" per the mock; {count} is every row but the viewer's own (see
  // lib/leaderboard.ts's friendCount): a count of Friends, not of rows.
  // "PAST WEEK/MONTH" deliberately avoids "last" — it labels any browsed
  // period, not just the immediately previous one.
  'leaderboard.ranking.overlineCurrentWeek': 'THIS WEEK · {count} FRIENDS',
  'leaderboard.ranking.overlinePastWeek': 'PAST WEEK · {count} FRIENDS',
  'leaderboard.ranking.overlineCurrentMonth': 'THIS MONTH · {count} FRIENDS',
  'leaderboard.ranking.overlinePastMonth': 'PAST MONTH · {count} FRIENDS',

  // Rank Row (design component `bHVHh`, expanded `WuHB2`).
  'leaderboard.rankRow.viewerMarker': '(you)',
  'leaderboard.rankRow.shareableCaption': 'shareable',
  'leaderboard.rankRow.privacyNote': 'Private spending is never counted here',
  // No mock frame for this one — the friend drill-down screen it opens
  // (app/friend/[username].tsx) is itself past this ticket's design scope.
  'leaderboard.rankRow.viewExpenses': 'View expenses',

  // Feed tab (mobile ticket #13). Mirrors the Expenses/Leaderboard header's
  // title + subtitle anatomy — see designs/spendx-mock.pen's "Screen Header"
  // (`I4sUjf`), whose "Sub" content is this exact copy.
  'feed.subtitle': 'Public expenses, everyone',
  'feed.retry': 'Try again',
  // "Loading more" footer while the next page is in flight (design's
  // `O6IgU`, "Loading more").
  'feed.loadingMore': 'Loading more',
  // The design system's Empty State component (`aYs21`) demos a "Feed end"
  // variant with this exact copy (Component library/Spec — Empty states) —
  // reused here for the zero-items case, since the mock has no separate
  // frame for a Feed that has never had a Public expense at all, and the
  // wording ("New public expenses will appear here…") already covers that.
  'feed.empty.title': "You're all caught up",
  'feed.empty.note': 'New public expenses will appear here as people log them.',

  // The friend drill-down screen (app/friend/[username].tsx, mobile ticket
  // #12): a Friend's Shareable Expenses for the Period a Rank Row was
  // expanded for. Undesigned — extrapolated from the Expenses tab's own
  // empty/retry treatment.
  'friendExpenses.subtitle': 'Shareable expenses',
  'friendExpenses.retry': 'Try again',
  'friendExpenses.empty.title': 'Nothing shareable this period',
  'friendExpenses.empty.note':
    'No Friend-only or Public expenses logged in this range.',
  // 403 — GET /users/{username}/expenses rejects a Username that isn't (or
  // no longer is) a Friend, including a since-unfriended one.
  'friendExpenses.notFriends':
    "You're not friends with this account anymore, so their expenses aren't visible.",
  // 404 — an unknown Username.
  'friendExpenses.notFound': 'This account no longer exists.',

  'category.housing': 'Housing',
  'category.food': 'Food',
  'category.leisure': 'Leisure',
  'category.investment': 'Investment',
  'category.other': 'Other',

  'visibility.private': 'Private',
  'visibility.friendOnly': 'Friend-only',
  'visibility.public': 'Public',
  // {username} is filled in with the signed-in user's own handle — see
  // constants/visibility.ts's VISIBILITY_META.
  'visibility.private.helper':
    'Only you can see this — it never leaves your own log.',
  'visibility.friendOnly.helper':
    'Your friends can see this on the Leaderboard with your @{username}.',
  'visibility.public.helper':
    'Anyone can see this in the Feed with your @{username}.',

  'expenseForm.title': 'New expense',
  'expenseForm.close': 'Close',
  'expenseForm.descriptionLabel': 'Description',
  'expenseForm.descriptionPlaceholder': 'Coffee with a friend',
  'expenseForm.amountLabel': 'Amount',
  // {currency} is the signed-in user's Preferred Currency — see
  // session-context.tsx's `user.preferredCurrency`.
  'expenseForm.amountHint':
    'Converted to {currency} at today’s rate and frozen on save',
  'expenseForm.amountLockedHint':
    'Amount and currency can’t be changed — delete and log again to fix them',
  'expenseForm.categoryLabel': 'Category',
  'expenseForm.visibilityLabel': 'Visibility',
  'expenseForm.dateLabel': 'Expense date',
  'expenseForm.submit': 'Save expense',

  'expenseForm.editTitle': 'Edit expense',
  'expenseForm.saveChanges': 'Save changes',
  'expenseForm.delete': 'Delete expense',
  'expenseForm.deleteConfirmTitle': 'Delete this expense?',
  'expenseForm.deleteConfirmMessage':
    'It disappears from every list and total. This can’t be undone.',
  'expenseForm.deleteConfirm': 'Delete',

  'profile.preferences': 'Preferences',
  'profile.account': 'Account',
  'profile.preferredCurrency': 'Preferred currency',
  'profile.language': 'Language',
  'profile.displayName': 'Display name',
  'profile.username': 'Username',
  'profile.email': 'Email',
  // SAFETY section (design's `fOHsj`, issue #15) — its one row today.
  'profile.safety': 'Safety',
  'profile.blockedAccounts': 'Blocked accounts',
  'profile.signOut': 'Sign out',

  // Blocked Accounts screen (app/blocked-accounts.tsx, issue #15).
  'blockedAccounts.title': 'Blocked accounts',
  // {count} — see leaderboard's own FRIEND REQUESTS · {count} keys for the
  // same "no singular/plural special-casing" convention this app already
  // uses for a bare count.
  'blockedAccounts.count': '{count} accounts',
  'blockedAccounts.info':
    'Blocked people disappear from your Feed and Leaderboard, and you disappear from theirs.',
  'blockedAccounts.retry': 'Try again',
  'blockedAccounts.unblock': 'Unblock',
  'blockedAccounts.empty.title': 'No blocked accounts',
  'blockedAccounts.empty.note': 'Accounts you block will show up here.',

  'auth.or': 'or',

  'auth.signIn.title': 'Welcome back',
  'auth.signIn.subtitle':
    'Log your spending, compare only what you choose to share.',
  'auth.signIn.emailLabel': 'Email',
  'auth.signIn.passwordLabel': 'Password',
  'auth.signIn.submit': 'Sign in',
  'auth.signIn.missingFields': 'Enter your email and password.',
  'auth.signIn.createAccount': 'Create an account',

  'auth.signUp.title': 'Create your account',
  'auth.signUp.subtitle':
    'Pick a @username — that is how friends find you. Everything you log starts Private.',
  'auth.signUp.displayNameLabel': 'Display name',
  'auth.signUp.usernameLabel': 'Username',
  'auth.signUp.emailLabel': 'Email',
  'auth.signUp.passwordLabel': 'Password',
  'auth.signUp.currencyLabel': 'Preferred currency',
  'auth.signUp.privacyNote':
    'New expenses default to Private. You decide, per expense, what friends and the feed can see.',
  'auth.signUp.submit': 'Create account',
  'auth.signUp.signInInstead': 'Sign in instead',

  'validation.displayName': 'Enter a display name up to 50 characters.',
  'validation.username':
    '3–30 characters: lowercase letters, numbers, and underscore only.',
  'validation.email': 'Enter a valid email address.',
  'validation.password': 'Password must be 8–128 characters.',
  'validation.expenseDescription': 'Enter a description up to 500 characters.',
  'validation.expenseAmount': 'Enter an amount greater than zero.',

  'apiError.generic': 'Something went wrong. Please try again.',
  'apiError.network':
    "Couldn't reach the server. Check your connection and try again.",
  // ConversionService's 503 (backend/src/daily-rates/conversion.service.ts):
  // the Daily Rate table has no coverage for a currency pair yet, not a
  // problem with what the user submitted.
  //
  // Deliberately says "exchange rate", never "not supported": every currency
  // the picker offers *is* a Supported Currency (backend/CONTEXT.md), so
  // telling the user it isn't would contradict the app's own vocabulary and
  // send them looking for a setting to change. What is missing is our Daily
  // Rate coverage, which is ours to fix and resolves on its own.
  'apiError.rateUnavailable':
    "We don't have an exchange rate for that currency yet. Try again shortly, or log this one in your preferred currency.",
} as const;

export type TranslationKey = keyof typeof en;
