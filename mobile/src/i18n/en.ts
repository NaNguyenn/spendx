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

  'tab.expenses': 'Expenses',
  'tab.leaderboard': 'Leaderboard',
  'tab.feed': 'Feed',
  'tab.profile': 'Profile',

  'logButton.accessibilityLabel': 'Log expense',

  'expenses.subtitle': 'Your log · all visibilities',
  'expenses.recent': 'Recent',
  'expenses.empty.title': 'Nothing logged yet',
  'expenses.empty.note': 'Tap the log button below to add your first expense.',
  // No `expenses.loadError` counterpart: the screen renders whatever
  // `getErrorMessage` produces (`apiError.network` when the server is
  // unreachable, the server's own message otherwise), for the same reason
  // profile.tsx does — the user just opened their own expenses, so *what*
  // failed is already obvious; *why* is the part worth saying.
  'expenses.retry': 'Try again',
  'leaderboard.comingSoon': 'Friend rankings are on their way.',
  'feed.comingSoon': 'The public feed is on its way.',

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
  'profile.signOut': 'Sign out',

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
