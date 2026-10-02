import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// Figma 15~18/16: gradient #def1f6 → #fcf9f0 (via 51.5%), content scrolls over it.
export function AuthScreenFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="authBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#def1f6" />
            <Stop offset="0.515" stopColor="#fcf9f0" />
            <Stop offset="1" stopColor="#fcf9f0" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#authBg)" />
      </Svg>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 }]}
      >
        <View>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24 },
});
