import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { fonts } from '../../../shared/lib/fonts';

interface ButtonProps {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  /** Leading icon (e.g. the chat bubble on "로그인하고 계속하기"). */
  icon?: ReactNode;
}

// Figma "Auth / Button / Primary": lavender fill, 3px darker underlay, 51px tall.
export function AuthPrimaryButton({ label, onPress, busy, disabled, icon }: ButtonProps) {
  return (
    <Pressable
      style={[styles.primary, (disabled || busy) && styles.primaryDisabled]}
      onPress={onPress}
      disabled={disabled || busy}
    >
      {busy ? (
        <ActivityIndicator color="#89709b" />
      ) : (
        <>
          {icon}
          <Text style={styles.primaryText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// Figma "Auth / Button / Secondary": white, lavender hairline, 46px.
export function AuthSecondaryButton({ label, onPress }: Pick<ButtonProps, 'label' | 'onPress'>) {
  return (
    <Pressable style={styles.secondary} onPress={onPress}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    height: 51,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#e5d9f0',
    borderWidth: 1,
    borderColor: '#b9a6ca',
    borderRadius: 13,
    shadowColor: '#c5b6cf',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 3 },
  },
  primaryDisabled: { opacity: 0.55 },
  primaryText: { fontFamily: fonts.pixel, fontSize: 14, lineHeight: 20, color: '#89709b' },
  secondary: { height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#d6c9df', borderRadius: 13 },
  secondaryText: { fontFamily: fonts.pixel, fontSize: 14, lineHeight: 20, color: '#9a86a6' },
});
