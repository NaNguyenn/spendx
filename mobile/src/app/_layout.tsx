import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { SessionProvider, useSession } from '@/auth/session-context';
import { TranslationProvider } from '@/i18n/translation-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SessionProvider>
      <TranslationProvider>
        <ThemeProvider
          value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
        >
          <RootNavigator />
        </ThemeProvider>
      </TranslationProvider>
    </SessionProvider>
  );
}

// Signed-out users get the (auth) group; signed-in users get the (app) tabs.
//
// Nothing renders until the persisted session has resolved, so a returning user
// never sees a flash of the sign-in screen on the way to their own Profile. The
// native splash screen is what fills that gap — it is already on screen, held
// there by preventAutoHideAsync above, and hiding it is the last thing we do.
function RootNavigator() {
  const { user, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) void SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
        {/*
          The Log Button's destination (components/app-tabs.tsx's
          `LogButton`, mobile ticket #5) lives here rather than inside
          `(app)/` — that group's own layout is the `expo-router/ui` tab
          bar, where every route under it becomes a tab slot instead of a
          screen that can be pushed and popped.

          `formSheet` over a plain `modal`: react-native-screens 4.0+
          (this app is on 4.26, see package.json) supports it natively on
          both platforms, and the one documented Android caveat — nested
          stack navigators inside a form sheet misbehaving — doesn't apply
          here, since log-expense.tsx pushes nothing of its own.
          `fitToContents` sizes the sheet to the form's actual height
          instead of a fixed detent fraction, closest to the mock's sheet
          (which doesn't span the full screen). `sheetGrabberVisible` is
          iOS-only (see the expo-router skill's form-sheet reference), so
          the screen draws its own grabber bar for both platforms rather
          than relying on it.
        */}
        <Stack.Screen
          name="log-expense"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: false,
          }}
        />
        {/* Editing an Expense row (ticket #6): the same sheet anatomy as
            log-expense, prefilled — see app/edit-expense/[id].tsx. */}
        <Stack.Screen
          name="edit-expense/[id]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: false,
          }}
        />
        {/* The Leaderboard's friend drill-down (ticket #12): a pushed
            screen, not a sheet — default `card` presentation — for the same
            "every route under (app)/ becomes a tab slot" reason log-expense
            lives here. See app/friend/[username].tsx's header comment. */}
        <Stack.Screen name="friend/[username]" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
