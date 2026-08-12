import { Stack } from 'expo-router/stack';

// Sign In is the anchor: when a signed-out user's target route is guarded
// away by Stack.Protected, this is where they land.
export const unstable_settings = {
  anchor: 'sign-in',
};

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
