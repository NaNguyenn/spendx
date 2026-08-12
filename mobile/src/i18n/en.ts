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

  'tab.expenses': 'Expenses',
  'tab.leaderboard': 'Leaderboard',
  'tab.feed': 'Feed',
  'tab.profile': 'Profile',

  // The Log Button has no destination yet — issue #5 (Expense logging UI)
  // gives it one. This is its accessible name in the meantime.
  'logButton.accessibilityLabel': 'Log expense',

  'expenses.comingSoon': 'Your expense log is on its way.',
  'leaderboard.comingSoon': 'Friend rankings are on their way.',
  'feed.comingSoon': 'The public feed is on its way.',

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

  'apiError.generic': 'Something went wrong. Please try again.',
  'apiError.network':
    "Couldn't reach the server. Check your connection and try again.",
} as const;

export type TranslationKey = keyof typeof en;
