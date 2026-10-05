import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { fonts } from '../lib/fonts';

const TONES = {
  // Figma "Button / Followup": surface + 3px darker underlay, 49px tall.
  lavender: { bg: '#e4d8ee', border: '#b8a5ca', underlay: '#c5b5d2', text: '#887099' },
  green: { bg: '#dfeacf', border: '#abbe91', underlay: '#b8c8a5', text: '#829767' },
} as const;

export function PuppyButton({ label, onPress, tone = 'lavender', busy, disabled, icon }: { label: string; onPress: () => void; tone?: keyof typeof TONES; busy?: boolean; disabled?: boolean; icon?: ReactNode }) {
  const colors = TONES[tone];
  return (
    <Pressable
      style={[styles.button, { backgroundColor: colors.bg, borderColor: colors.border, shadowColor: colors.underlay }, (disabled || busy) && styles.disabled]}
      onPress={onPress}
      disabled={disabled || busy}
    >
      {busy ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { height: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderRadius: 13, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 3 } },
  disabled: { opacity: 0.55 },
  text: { fontFamily: fonts.pixel, fontSize: 14, lineHeight: 20 },
});
