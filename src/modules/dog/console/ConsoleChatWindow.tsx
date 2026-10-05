import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { SkImage } from '@shopify/react-native-skia';
import { fonts } from '../../../shared/lib/fonts';
import type { ChatMessage } from '../types';
import { DogSprite } from './DogSprite';
import { boxPx, CHAT_WINDOW, designScale, type Size } from './layout';
import { TOPICS } from './topics';

// The retro chat window that opens over the case (design: puppy-profile.html .pc-chat). Messages come from
// the real chat session; sizes are the design's 390px values scaled to the case.
export function ConsoleChatWindow({
  shell,
  dogName,
  shelterName,
  identityIndex,
  sheet,
  topic,
  onSelectTopic,
  messages,
  sending,
  sendError,
  retryable,
  canSend,
  confirmable,
  confirmed,
  onSend,
  onRetry,
  onConfirm,
  onClose,
  maxBottom,
}: {
  shell: Size;
  dogName: string;
  shelterName: string;
  identityIndex: number;
  sheet: SkImage | null;
  topic: number;
  onSelectTopic: (index: number) => void;
  messages: ChatMessage[];
  sending: boolean;
  sendError: string | null;
  retryable: boolean;
  canSend: boolean;
  /** latest answer says "ask the shelter" → offer 담기 */
  confirmable: boolean;
  confirmed: boolean;
  onSend: (text: string) => void;
  onRetry: () => void;
  onConfirm: () => void;
  onClose: () => void;
  /** shrink the window so it ends above this y (case coordinates) — keeps the composer above the keyboard */
  maxBottom?: number;
}) {
  const s = designScale(shell);
  const full = boxPx(CHAT_WINDOW, shell);
  const box = maxBottom === undefined ? full : { ...full, height: Math.max(260 * s, Math.min(full.height, maxBottom - full.top)) };
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [draft, setDraft] = useState('');

  const submit = () => {
    const text = draft.trim();
    if (!text || sending || !canSend) return;
    onSend(text);
    setDraft('');
  };

  return (
    <View style={[styles.window, box, { padding: 4 * s }]}>
      <View style={[styles.titleBar, { minHeight: 42 * s }]}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="title" x1="0" y1="0" x2="1" y2="0.2">
              <Stop offset="0" stopColor="#7773ae" />
              <Stop offset="1" stopColor="#a691ca" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#title)" />
        </Svg>
        <Text style={[styles.titleText, { fontSize: 15 * s }]}>✿   {dogName}와 대화</Text>
        <Pressable style={[styles.close, { width: 44 * s, height: 36 * s }]} onPress={onClose} hitSlop={6} accessibilityLabel="대화창 닫기">
          <Text style={[styles.closeText, { fontSize: 24 * s }]}>×</Text>
        </Pressable>
      </View>

      <View style={[styles.contact, { padding: 10 * s, paddingTop: 12 * s, minHeight: 67 * s }]}>
        <View style={[styles.contactAvatar, { width: 38 * s, height: 38 * s }]}>
          <DogSprite sheet={sheet} identityIndex={identityIndex} size={36 * s} />
        </View>
        <View style={styles.contactCopy}>
          <Text style={[styles.contactName, { fontSize: 18 * s }]} numberOfLines={1}>
            {dogName}
          </Text>
          <Text style={[styles.contactSub, { fontSize: 11 * s }]} numberOfLines={1}>
            {shelterName ? `${shelterName} · AI 친구` : 'AI 친구'}
          </Text>
        </View>
      </View>

      <View style={[styles.topics, { gap: 5 * s, padding: 5 * s, paddingVertical: 8 * s }]}>
        {TOPICS.map((item, index) => (
          <Pressable key={item.key} style={[styles.topic, { minHeight: 44 * s }, index === topic && styles.topicOn]} onPress={() => onSelectTopic(index)}>
            <Text style={[styles.topicText, { fontSize: 12 * s }, index === topic && styles.topicTextOn]}>{item.chatLabel}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        ref={scroll}
        style={styles.messages}
        contentContainerStyle={{ padding: 10 * s, paddingTop: 14 * s, paddingBottom: 16 * s }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.date, { fontSize: 11 * s, marginBottom: 17 * s }]}>오늘의 이야기</Text>
        {messages.length === 0 && !sending && <Text style={[styles.empty, { fontSize: 13 * s }]}>{dogName}에게 궁금한 걸 물어봐!</Text>}
        {messages.map(message => (
          <Message key={message.id} message={message} dogName={dogName} identityIndex={identityIndex} sheet={sheet} s={s} />
        ))}
        {sending && (
          <View style={[styles.row, { gap: 7 * s, marginBottom: 17 * s }]}>
            <Avatar s={s} dog sheet={sheet} identityIndex={identityIndex} />
            <View style={[styles.bubble, styles.bubbleDog, { padding: 10 * s }]}>
              <ActivityIndicator size="small" color="#68799f" />
            </View>
          </View>
        )}
        {!!sendError && <Text style={[styles.error, { fontSize: 12 * s }]}>{sendError}</Text>}
        {retryable && (
          <Pressable onPress={onRetry} disabled={sending} hitSlop={8}>
            <Text style={[styles.action, { fontSize: 12 * s }]}>다시 시도</Text>
          </Pressable>
        )}
        {confirmable && (
          <Pressable onPress={onConfirm} disabled={confirmed} hitSlop={8}>
            <Text style={[styles.action, { fontSize: 12 * s }]}>{confirmed ? '상담 질문에 담았어 ✓' : '보호소에 확인할 질문으로 담기'}</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={[styles.composer, { gap: 6 * s, padding: 2 * s }]}>
        <TextInput
          style={[styles.input, { minHeight: 76 * s, fontSize: 15 * s, padding: 10 * s }]}
          value={draft}
          onChangeText={setDraft}
          placeholder={canSend ? `${dogName}에게 궁금한 걸 물어봐` : '지금은 대화할 수 없어요'}
          placeholderTextColor="#aa90a3"
          multiline
          maxLength={300}
          editable={!sending && canSend}
          textAlignVertical="top"
        />
        <Pressable style={[styles.send, { width: 67 * s }, (!draft.trim() || sending || !canSend) && styles.sendDisabled]} onPress={submit} disabled={!draft.trim() || sending || !canSend}>
          <Text style={[styles.sendText, { fontSize: 12 * s }]}>보내기</Text>
          <Text style={[styles.sendArrow, { fontSize: 22 * s }]}>↗</Text>
        </Pressable>
      </View>

      <View style={[styles.status, { paddingTop: 9 * s, paddingHorizontal: 5 * s }]}>
        <Text style={[styles.statusText, { fontSize: 11 * s }]}>♡   서두르지 않아도 괜찮아</Text>
        <Text style={[styles.statusText, styles.statusRight, { fontSize: 11 * s }]}>{messages.length}개 이야기</Text>
      </View>
    </View>
  );
}

function Avatar({ s, dog, sheet, identityIndex }: { s: number; dog: boolean; sheet: SkImage | null; identityIndex: number }) {
  return (
    <View style={[styles.avatar, { width: 28 * s, height: 28 * s }, !dog && styles.avatarMe]}>
      {dog ? <DogSprite sheet={sheet} identityIndex={identityIndex} size={26 * s} /> : <Text style={[styles.avatarHeart, { fontSize: 16 * s }]}>♡</Text>}
    </View>
  );
}

function Message({ message, dogName, identityIndex, sheet, s }: { message: ChatMessage; dogName: string; identityIndex: number; sheet: SkImage | null; s: number }) {
  const mine = message.role === 'USER';
  return (
    <View style={[styles.row, mine && styles.rowMine, { gap: 7 * s, marginBottom: 17 * s }]}>
      <Avatar s={s} dog={!mine} sheet={sheet} identityIndex={identityIndex} />
      <View style={[styles.content, mine && styles.contentMine]}>
        <Text style={[styles.label, mine && styles.labelMine, { fontSize: 11 * s, marginBottom: 5 * s }]}>{mine ? '나' : dogName}</Text>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleDog, { padding: 9 * s }]}>
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine, { fontSize: 15 * s, lineHeight: 15 * s * 1.65 }]}>{message.text}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: { position: 'absolute', zIndex: 6, backgroundColor: '#eee2f0', borderWidth: 2, borderColor: '#807395', borderRadius: 4, overflow: 'hidden', shadowColor: '#485173', shadowOpacity: 0.3, shadowRadius: 0, shadowOffset: { width: 7, height: 9 } },
  titleBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 10, paddingRight: 3, overflow: 'hidden' },
  titleText: { fontFamily: fonts.pixel, color: '#fff9ef' },
  close: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#ded2e8', borderWidth: 1, borderColor: '#706e91' },
  closeText: { color: '#6a658d', lineHeight: 28 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#d4c6dc' },
  contactAvatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6eed6', borderWidth: 1, borderColor: '#b5b2bf', borderRadius: 3 },
  contactCopy: { flex: 1 },
  contactName: { fontFamily: fonts.pixel, color: '#505178' },
  contactSub: { fontFamily: fonts.body, color: '#7f7391' },
  topics: { flexDirection: 'row' },
  topic: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9f3f8', borderWidth: 1, borderColor: '#c3b4d1', borderRadius: 4 },
  topicOn: { backgroundColor: '#e0d2ee', borderColor: '#ac91c3' },
  topicText: { fontFamily: fonts.pixel, color: '#505178' },
  topicTextOn: { color: '#67527f' },
  messages: { flex: 1, marginHorizontal: 2, marginBottom: 6, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#a99abb' },
  date: { fontFamily: fonts.pixel, textAlign: 'center', color: '#a192a6', letterSpacing: 1 },
  empty: { fontFamily: fonts.body, textAlign: 'center', color: '#a192a6', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  rowMine: { flexDirection: 'row-reverse' },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e3edf2', borderWidth: 1, borderColor: '#b8aed0', borderRadius: 3 },
  avatarMe: { backgroundColor: '#f0ddea', borderColor: '#d6b5cb' },
  avatarHeart: { color: '#b4769f' },
  content: { maxWidth: '84%', flexShrink: 1 },
  contentMine: { alignItems: 'flex-end' },
  label: { fontFamily: fonts.pixel, color: '#68799f' },
  labelMine: { color: '#a37997', textAlign: 'right' },
  bubble: { borderWidth: 1 },
  bubbleDog: { backgroundColor: '#e7eff6', borderColor: '#a9bcd0', borderTopLeftRadius: 2, borderTopRightRadius: 8, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  bubbleMine: { backgroundColor: '#f2e1ee', borderColor: '#cfacc8', borderTopLeftRadius: 8, borderTopRightRadius: 2, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  bubbleText: { fontFamily: fonts.body, color: '#525f73' },
  bubbleTextMine: { color: '#805b78' },
  error: { fontFamily: fonts.body, color: '#c0526b', marginBottom: 6 },
  action: { fontFamily: fonts.pixel, color: '#8c749f', marginBottom: 6 },
  composer: { flexDirection: 'row' },
  input: { flex: 1, backgroundColor: '#fffbfc', borderWidth: 1, borderColor: '#ab96b5', fontFamily: fonts.body, color: '#685573' },
  send: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6d6f2', borderWidth: 1, borderColor: '#977da9' },
  sendDisabled: { opacity: 0.55 },
  sendText: { fontFamily: fonts.pixel, color: '#6c5483' },
  sendArrow: { color: '#6c5483' },
  status: { flexDirection: 'row', justifyContent: 'space-between' },
  statusText: { fontFamily: fonts.body, color: '#8f759a' },
  statusRight: { color: '#9b879e' },
});
