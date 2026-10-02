import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ChevronLeft } from 'lucide-react-native';
import { fonts } from '../../../shared/lib/fonts';

// Header (round back + title) + gradient + scrolling body shared by the community detail screens.
export function ScreenFrame({ title, children, right, footer }: { title: string; children: ReactNode; right?: ReactNode; footer?: ReactNode }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="frameBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#def1f6" />
            <Stop offset="0.515" stopColor="#fcf9f0" />
            <Stop offset="1" stopColor="#fcf9f0" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#frameBg)" />
      </Svg>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={10}>
          <ChevronLeft size={16} color="#7b8d99" strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        {right}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: footer ? 20 : insets.bottom + 28 }]}>{children}</ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 14 },
  back: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f7fcfc', borderWidth: 0.8, borderColor: '#cce2e7', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, marginLeft: 17, fontFamily: fonts.pixel, fontSize: 21, lineHeight: 29, color: '#5e7383' },
  content: { paddingHorizontal: 24 },
});
