import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { fonts } from '../../../shared/lib/fonts';
import { consoleShell } from '../assets/consoleShell';
import { BUTTON_A, BUTTON_B, BUTTON_SELECT, BUTTON_START, boxPx, DPAD, designScale, dpadCell, NAMEPLATE, type Size } from './layout';

export type ConsoleKey = 'up' | 'left' | 'right' | 'down' | 'a' | 'b' | 'select' | 'start';

// The case artwork (Skia, per CLAUDE.md) with transparent hit areas over the printed buttons
// (D-pad, A, B, SELECT, START) and their small printed-style captions. `children` (the LCD and the
// chat window) are positioned by the caller in the same pixel space.
export function ConsoleShell({ shell, onPress, onBack, children }: { shell: Size; onPress: (key: ConsoleKey) => void; onBack: () => void; children: ReactNode }) {
  const image = useImage(consoleShell);
  const s = designScale(shell);
  const at = (leftPct: number, topPct: number) => ({ left: (shell.width * leftPct) / 100, top: (shell.height * topPct) / 100, fontSize: 11 * s });
  const nameplate = boxPx(NAMEPLATE, shell);

  return (
    <View style={{ width: shell.width, height: shell.height }}>
      {image && (
        <Canvas style={StyleSheet.absoluteFill}>
          <SkiaImage image={image} x={0} y={0} width={shell.width} height={shell.height} fit="fill" />
        </Canvas>
      )}

      <View style={[styles.nameplate, nameplate]} pointerEvents="none">
        <Text style={[styles.nameplateText, { fontSize: 13 * s }]}>PUPPY CONNECT</Text>
        <Text style={[styles.nameplateHeart, { fontSize: 12 * s }]}>♡</Text>
      </View>
      <Pressable style={[styles.back, { left: 22 * s, top: 18 * s, width: 34 * s, height: 34 * s, borderRadius: 17 * s }]} onPress={onBack} hitSlop={8} accessibilityLabel="돌아가기">
        <Text style={[styles.backText, { fontSize: 16 * s }]}>←</Text>
      </Pressable>

      {children}

      {(['up', 'left', 'right', 'down'] as const).map(cell => (
        <Hit key={cell} style={dpadCell(DPAD, cell, shell)} onPress={() => onPress(cell)} label={`방향키 ${cell}`} />
      ))}
      <Hit style={boxPx(BUTTON_A, shell)} round onPress={() => onPress('a')} label="A 대화하기" />
      <Hit style={boxPx(BUTTON_B, shell)} round onPress={() => onPress('b')} label="B 돌아가기" />
      <Hit style={boxPx(BUTTON_SELECT, shell)} pill onPress={() => onPress('select')} label="SELECT 프로필" />
      <Hit style={boxPx(BUTTON_START, shell)} pill onPress={() => onPress('start')} label="START 이어 말하기" />

      <Text style={[styles.caption, at(14.6, 77.1)]} pointerEvents="none">주제 선택</Text>
      <Text style={[styles.caption, at(75, 87.5)]} pointerEvents="none">대화하기</Text>
      <Text style={[styles.caption, at(72.5, 93.1)]} pointerEvents="none">돌아가기</Text>
      <Text style={[styles.caption, at(36.7, 92)]} pointerEvents="none">프로필</Text>
      <Text style={[styles.caption, at(52.1, 92)]} pointerEvents="none">이어 말하기</Text>
    </View>
  );
}

function Hit({ style, onPress, label, round, pill }: { style: { left: number; top: number; width: number; height: number }; onPress: () => void; label: string; round?: boolean; pill?: boolean }) {
  // The printed buttons are small — keep a 44pt minimum touch target around them.
  const extraX = Math.max(0, (44 - style.width) / 2);
  const extraY = Math.max(0, (44 - style.height) / 2);
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={{ left: extraX, right: extraX, top: extraY, bottom: extraY }}
      style={({ pressed }) => [styles.hit, style, round && { borderRadius: style.width / 2 }, pill && { borderRadius: style.height / 2 }, pressed && styles.hitPressed]}
    />
  );
}

const styles = StyleSheet.create({
  nameplate: { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  nameplateText: { fontFamily: fonts.pixel, letterSpacing: 0.9, color: '#6f6ea9' },
  nameplateHeart: { color: '#ac89bd' },
  back: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f2fb', borderWidth: 1, borderColor: '#b9b5da' },
  backText: { color: '#6f6ea9' },
  hit: { position: 'absolute', borderRadius: 7 },
  hitPressed: { backgroundColor: 'rgba(255,255,255,0.4)' },
  caption: { position: 'absolute', fontFamily: fonts.pixel, color: '#595d91' },
});
