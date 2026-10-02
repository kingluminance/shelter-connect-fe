import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../lib/fonts';

// Bottom sheet in the LoginGuide style (cream panel, lavender handle) — the base of the
// 더보기 menu, 글 상태 변경, 신고, and the permission sheets (Figma 13/14/21/22).
export function ActionSheet({ visible, onClose, title, message, children }: { visible: boolean; onClose: () => void; title?: string; message?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.handle} />
          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.body}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetButton({ label, onPress, tone = 'default', disabled }: { label: string; onPress: () => void; tone?: 'primary' | 'default' | 'danger'; disabled?: boolean }) {
  return (
    <Pressable style={[styles.button, tone === 'primary' && styles.buttonPrimary, disabled && styles.buttonDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={[styles.buttonText, tone === 'primary' && styles.buttonTextPrimary, tone === 'danger' && styles.buttonTextDanger]}>{label}</Text>
    </Pressable>
  );
}

/** A selectable row with a title + one-line description (상태 변경 / 신고 사유). */
export function SheetOption({ title, description, selected, onPress }: { title: string; description?: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.option, selected && styles.optionSelected]} onPress={onPress}>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{title}</Text>
        {!!description && <Text style={styles.optionDescription}>{description}</Text>}
      </View>
    </Pressable>
  );
}

/** Figma 21 (위치) / 22 (사진): access was refused — offer settings plus a way to carry on. */
export function PermissionSheet({
  visible,
  title,
  message,
  retryLabel,
  onRetry,
  alternativeLabel,
  onAlternative,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  alternativeLabel: string;
  onAlternative: () => void;
  onClose: () => void;
}) {
  return (
    <ActionSheet visible={visible} onClose={onClose} title={title} message={message}>
      <SheetButton label="기기 설정 열기" tone="primary" onPress={() => Linking.openSettings()} />
      {!!retryLabel && !!onRetry && <SheetButton label={retryLabel} onPress={onRetry} />}
      <SheetButton label={alternativeLabel} onPress={onAlternative} />
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(56,64,69,0.35)' },
  sheet: { paddingHorizontal: 24, paddingTop: 13, backgroundColor: '#fcfaf4', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 0.8, borderColor: '#e6dce2' },
  handle: { alignSelf: 'center', width: 48, height: 4, borderRadius: 2, backgroundColor: '#d8ccd9' },
  title: { fontFamily: fonts.pixel, fontSize: 19, lineHeight: 27, color: '#877393', marginTop: 22, textAlign: 'center' },
  message: { fontFamily: fonts.body, fontSize: 12, lineHeight: 21, color: '#a092a9', marginTop: 8, textAlign: 'center' },
  body: { gap: 12, marginTop: 20 },
  button: { height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ddd2e3', borderRadius: 13 },
  buttonPrimary: { backgroundColor: '#e5d9f0', borderColor: '#cdbbdb' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontFamily: fonts.pixel, fontSize: 12.5, lineHeight: 18, color: '#98859e' },
  buttonTextPrimary: { color: '#89709b' },
  buttonTextDanger: { color: '#c0526b' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#e6dce2', borderRadius: 14 },
  optionSelected: { backgroundColor: '#f1e8f6', borderColor: '#c9b5d9' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#cdbdd6', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: '#9679aa' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9679aa' },
  optionCopy: { flex: 1, gap: 2 },
  optionTitle: { fontFamily: fonts.pixel, fontSize: 12.5, lineHeight: 18, color: '#7f6c8b' },
  optionDescription: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 15, color: '#a99cb2' },
});
