import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SkImage } from '@shopify/react-native-skia';
import { fonts } from '../../../shared/lib/fonts';
import { DogSprite } from './DogSprite';
import { boxPx, designScale, LCD, type Size } from './layout';
import { TOPICS, topicHint } from './topics';

// The console's LCD (Figma-less design: puppy-profile.html .pc-lcd): name + heart, a little garden with
// the dog and a speech bubble, then the three topic chips and the "A …" hint. All sizes are the
// design's 390px px values scaled to this case.
export function ConsoleLcd({
  shell,
  dogName,
  shelterName,
  identityIndex,
  sheet,
  topic,
  asked,
  saved,
  bubble,
  onSelectTopic,
  onToggleSave,
}: {
  shell: Size;
  dogName: string;
  shelterName: string;
  identityIndex: number;
  sheet: SkImage | null;
  topic: number;
  asked: boolean;
  saved: boolean;
  /** replaces the greeting while loading / on errors */
  bubble: ReactNode;
  onSelectTopic: (index: number) => void;
  onToggleSave: () => void;
}) {
  const s = designScale(shell);
  const box = boxPx(LCD, shell);
  const dogSize = box.width * 0.61;

  return (
    <View style={[styles.lcd, box, { borderRadius: 5 * s }]}>
      <View style={[styles.heading, { paddingTop: 19 * s, paddingHorizontal: 20 * s }]}>
        <View style={styles.headingCopy}>
          <Text style={[styles.name, { fontSize: 24 * s }]} numberOfLines={1}>
            {dogName}
          </Text>
          <Text style={[styles.shelter, { fontSize: 11 * s }]} numberOfLines={1}>
            {shelterName ? `${shelterName}의 친구` : '보호소의 친구'}
          </Text>
        </View>
        <Pressable onPress={onToggleSave} hitSlop={10} accessibilityLabel={saved ? `${dogName} 저장 취소` : `${dogName} 저장하기`}>
          <Text style={[styles.heart, { fontSize: 30 * s }, saved && styles.heartOn]}>{saved ? '♥' : '♡'}</Text>
        </Pressable>
      </View>

      <View style={styles.garden}>
        <View style={styles.grassTop} />
        <View style={[styles.cloud, { left: '9%', top: '32%', width: 42 * s, height: 10 * s }]} />
        <View style={[styles.cloud, { right: '7%', top: '44%', width: 33 * s, height: 10 * s }]} />
        <View style={[styles.grass, { height: '27%', borderTopWidth: 4 * s }]} />
        <View style={[styles.dogShadow, { width: '37%', height: 12 * s, bottom: '8%', left: '31.5%' }]} />
        <View style={[styles.dog, { left: '19.5%', bottom: '8%' }]}>
          <DogSprite sheet={sheet} identityIndex={identityIndex} size={dogSize} />
        </View>
        <Text style={[styles.flower, { left: '10%', bottom: '13%', fontSize: 22 * s }]}>✿</Text>
        <Text style={[styles.flower, styles.flowerTwo, { right: '10%', bottom: '8%', fontSize: 17 * s }]}>✿</Text>
        <View style={[styles.helloRow, { top: 20 * s }]} pointerEvents="box-none">
          <View style={[styles.hello, { paddingVertical: 11 * s, paddingHorizontal: 13 * s }]}>
            {typeof bubble === 'string' ? <Text style={[styles.helloText, { fontSize: 12 * s }]}>{bubble}</Text> : bubble}
            <View style={styles.helloTail} />
          </View>
        </View>
      </View>

      <View style={[styles.topicArea, { paddingTop: 15 * s, paddingHorizontal: 12 * s, paddingBottom: 12 * s }]}>
        <Text style={[styles.topicTitle, { fontSize: 12 * s, marginBottom: 11 * s }]}>나에 대해 궁금한 이야기</Text>
        <View style={[styles.topics, { gap: 7 * s }]}>
          {TOPICS.map((item, index) => {
            const selected = index === topic;
            return (
              <Pressable key={item.key} style={[styles.topic, { minHeight: 65 * s, borderRadius: 8 * s, gap: 6 * s }, selected && styles.topicSelected]} onPress={() => onSelectTopic(index)}>
                {selected && <Text style={styles.topicMark}>◆</Text>}
                <item.Icon size={20 * s} color={selected ? '#6b5087' : '#6f6a78'} strokeWidth={1.6} />
                <Text style={[styles.topicLabel, { fontSize: 12 * s }, selected && styles.topicLabelSelected]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.hint, { marginTop: 13 * s }]}>
          <View style={[styles.hintKey, { width: 16 * s, height: 16 * s, borderRadius: 8 * s }]}>
            <Text style={[styles.hintKeyText, { fontSize: 10 * s }]}>A</Text>
          </View>
          <Text style={[styles.hintText, { fontSize: 11 * s }]}> {topicHint(TOPICS[topic], asked)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lcd: { position: 'absolute', overflow: 'hidden', backgroundColor: '#cde9e5' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
  headingCopy: { flex: 1 },
  name: { fontFamily: fonts.pixel, color: '#5b6378' },
  shelter: { fontFamily: fonts.body, color: '#667b7b', marginTop: 2 },
  heart: { fontFamily: fonts.body, color: '#a380b1' },
  heartOn: { color: '#df78a3' },
  garden: { flex: 1, backgroundColor: '#cde9e5' },
  grassTop: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '30%', backgroundColor: '#e7eed4' },
  cloud: { position: 'absolute', backgroundColor: 'rgba(246,248,231,0.7)' },
  grass: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#dce8c1', borderTopColor: '#b9cd9e' },
  dogShadow: { position: 'absolute', borderRadius: 100, backgroundColor: 'rgba(174,196,142,0.46)' },
  dog: { position: 'absolute' },
  flower: { position: 'absolute', color: '#fffae1' },
  flowerTwo: { color: '#e8d1e5' },
  helloRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 2 },
  hello: { backgroundColor: '#fffcf5', borderWidth: 1, borderColor: '#b4c8bc', borderRadius: 7, shadowColor: '#b6ccbe', shadowOpacity: 0.5, shadowRadius: 0, shadowOffset: { width: 2, height: 3 } },
  helloText: { fontFamily: fonts.body, color: '#647365' },
  helloTail: { position: 'absolute', alignSelf: 'center', bottom: -5, width: 9, height: 9, transform: [{ rotate: '45deg' }], backgroundColor: '#fffcf5', borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#b4c8bc' },
  topicArea: { backgroundColor: '#f8f8e8', borderTopWidth: 1, borderTopColor: '#aabb92' },
  topicTitle: { fontFamily: fonts.body, textAlign: 'center', color: '#737c6b' },
  topics: { flexDirection: 'row' },
  topic: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffdf5', borderWidth: 1, borderColor: '#c9c5cd', shadowColor: '#d6d1d5', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 3 } },
  topicSelected: { backgroundColor: '#e6d8f2', borderColor: '#a995c2', shadowColor: '#b8a7c5' },
  topicMark: { position: 'absolute', right: 4, top: 1, fontSize: 7, color: '#9c76b5' },
  topicLabel: { fontFamily: fonts.pixel, color: '#6f6a78' },
  topicLabelSelected: { color: '#6b5087' },
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  hintKey: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#aa9abc' },
  hintKeyText: { fontFamily: fonts.pixel, color: '#826496' },
  hintText: { fontFamily: fonts.body, color: '#798071' },
});
