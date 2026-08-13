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
}

/** Same geometry as PrimaryButton, transparent fill, label in accent. */
export function SecondaryButton({
  label,
  onPress,
  destructive = false,
}: SecondaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
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
});
