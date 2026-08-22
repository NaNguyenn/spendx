import {
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii } from '@/constants/theme';

export interface SecondaryButtonProps {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  /** Danger-colored label for irreversible actions (delete). */
  destructive?: boolean;
  /**
   * The Verify Email screen's Resend control (app/verify-email.tsx, issue
   * #20) is the first caller that needs this — disabled for the 60-second
   * cooldown between sends, same "disabled means dimmed and unpressable" as
   * PrimaryButton's own `disabled`.
   */
  disabled?: boolean;
}

/** Same geometry as PrimaryButton, transparent fill, label in accent. */
export function SecondaryButton({
  label,
  onPress,
  destructive = false,
  disabled = false,
}: SecondaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <ThemedText type="button" themeColor={destructive ? 'danger' : 'accent'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.6,
  },
});
