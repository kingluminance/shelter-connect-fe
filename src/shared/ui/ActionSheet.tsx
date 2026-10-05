import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../lib/fonts';
import { PuppyButton } from './PuppyButton';

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
export function SheetOption({ title, description, selected, positive, onPress }: { title: string; description?: string; selected?: boolean; /** green when selected (e.g. 가족을 만났어요) */ positive?: boolean; onPress: () => void }) {
  const compact = !description; // 신고 사유: 43px single-line rows
  return (
    <Pressable style={[styles.option, compact && styles.optionCompact, selected && (positive ? styles.optionPositive : styles.optionSelected)]} onPress={onPress}>
      <View style={[styles.radio, selected && (positive ? styles.radioPositive : styles.radioOn)]}>{selected && <View style={[styles.radioDot, positive && styles.radioDotPositive]} />}</View>
      <View style={styles.optionCopy}>
        <Text style={[compact ? styles.optionCompactTitle : styles.optionTitle, selected && (positive ? styles.titlePositive : styles.titleSelected)]}>{title}</Text>
        {!!description && <Text style={[styles.optionDescription, selected && positive && styles.descriptionPositive]}>{description}</Text>}
      </View>
    </Pressable>
  );
}

/** Figma 21 (위치) / 22 (사진): access was refused — a centered sheet with an icon, the main way to
 * carry on (primary), 기기 설정 열기 (secondary) and an optional text link out. */
export function PermissionSheet({
  visible,
  icon,
  title,
  message,
  note,
  footnote,
  primaryLabel,
  onPrimary,
  linkLabel,
  onLink,
  onClose,
}: {
  visible: boolean;
  icon: ReactNode;
  title: string;
  message: string;
  /** green "retained content" row, e.g. 작성 중인 글은 그대로 유지돼요. */
  note?: string;
  footnote?: string;
  primaryLabel: string;
  onPrimary: () => void;
  linkLabel?: string;
  onLink?: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, styles.centered, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.handle} />
          <View style={styles.iconCircle}>{icon}</View>
          <Text style={[styles.title, styles.centeredText]}>{title}</Text>
          <Text style={[styles.message, styles.centeredText]}>{message}</Text>
          {!!note && (
            <View style={styles.note}>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          )}
          <View style={[styles.body, styles.stretch]}>
            <PuppyButton label={primaryLabel} onPress={onPrimary} />
            <Pressable style={styles.secondary} onPress={() => Linking.openSettings()}>
              <Text style={styles.secondaryText}>기기 설정 열기</Text>
            </Pressable>
          </View>
          {!!linkLabel && !!onLink && (
            <Pressable onPress={onLink} hitSlop={10}>
              <Text style={styles.link}>{linkLabel}</Text>
            </Pressable>
          )}
          {!!footnote && <Text style={styles.footnote}>{footnote}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center' },
  stretch: { alignSelf: 'stretch' },
  centeredText: { textAlign: 'center' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eee4f4', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  note: { alignSelf: 'stretch', height: 44, justifyContent: 'center', paddingHorizontal: 20, marginTop: 20, backgroundColor: '#f0f3e8', borderWidth: 1, borderColor: '#dde5d2', borderRadius: 12 },
  noteText: { fontFamily: fonts.body, fontSize: 11, color: '#92a17f' },
  secondary: { height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#d8cce0', borderRadius: 13 },
  secondaryText: { fontFamily: fonts.pixel, fontSize: 14, lineHeight: 20, color: '#9a86a6' },
  link: { fontFamily: fonts.pixel, fontSize: 12, color: '#a08bae', marginTop: 22 },
  footnote: { fontFamily: fonts.body, fontSize: 10.5, color: '#a6a49a', marginTop: 20 },
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(56,64,69,0.35)' },
  sheet: { paddingHorizontal: 24, paddingTop: 13, backgroundColor: '#fcfaf4', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 0.8, borderColor: '#e6dce2' },
  handle: { alignSelf: 'center', width: 48, height: 4, borderRadius: 2, backgroundColor: '#d8ccd9' },
  title: { fontFamily: fonts.pixel, fontSize: 21, lineHeight: 29, color: '#7e6b8d', marginTop: 22 },
  message: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 17, color: '#ab99b3', marginTop: 8 },
  body: { gap: 12, marginTop: 20 },
  button: { height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ddd2e3', borderRadius: 13 },
  buttonPrimary: { backgroundColor: '#e5d9f0', borderColor: '#cdbbdb' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontFamily: fonts.pixel, fontSize: 12.5, lineHeight: 18, color: '#98859e' },
  buttonTextPrimary: { color: '#89709b' },
  buttonTextDanger: { color: '#c0526b' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#e1d7dd', borderRadius: 15 },
  optionCompact: { paddingVertical: 0, height: 43, borderRadius: 12 },
  optionSelected: { backgroundColor: '#f0e8f5', borderColor: '#d4bde2' },
  optionPositive: { backgroundColor: '#eef3e6', borderColor: '#afbf97' },
  radioPositive: { borderColor: '#8b9b73' },
  radioDotPositive: { backgroundColor: '#8b9b73' },
  titleSelected: { color: '#9a80a8' },
  titlePositive: { color: '#8b9b73' },
  descriptionPositive: { color: '#a9b396' },
  optionCompactTitle: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: '#a48fab' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#cdbdd6', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: '#9679aa' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9679aa' },
  optionCopy: { flex: 1, gap: 2 },
  optionTitle: { fontFamily: fonts.pixel, fontSize: 15, lineHeight: 21, color: '#9a86a5' },
  optionDescription: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: '#b5a4bb' },
});
