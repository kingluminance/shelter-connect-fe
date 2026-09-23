import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { Canvas, useImage } from '@shopify/react-native-skia';
// Reused from the game module: a screen composing another domain's rendering
// utility is the same "screens cross module boundaries" exception CLAUDE.md
// already carves out for hooks/APIs (GameScreen using modules/dog's hooks) — the
// dog's dot-sprite identity belongs to this screen's UX just as much as the game's.
import { SpriteFrame } from '../game/core/entities/SpriteFrame';
import { DOG_FRAME_SIZE, dogIdleRow, dogWalkAtlas } from '../game/core/assets/dog/dogWalkAtlas';
import { useDogChat } from './hooks/useDogChat';
import type { RootStackParamList } from '../../app/navigation';

const QUICK_TOPICS = ['산책은 어때?', '혼자 있어도 괜찮아?', '낯선 사람은 어때?'];
const AVATAR_SIZE = 128;

export function ChatScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const dogSheet = useImage(dogWalkAtlas);
  const { state, send } = useDogChat(params.dogId);
  const [draft, setDraft] = useState('');
  const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);
  const [notebookOpen, setNotebookOpen] = useState(false);

  const messages = state.status === 'ready' ? state.messages : [];
  const latestAssistant = [...messages].reverse().find(m => m.role === 'ASSISTANT');
  const latestUser = [...messages].reverse().find(m => m.role === 'USER');

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || state.status !== 'ready' || state.sending) {
      return;
    }
    send(trimmed);
    setDraft('');
  }

  function saveQuestion() {
    if (!latestUser || !latestAssistant?.needsShelterConfirmation) {
      return;
    }
    setPendingQuestions(prev => (prev.includes(latestUser.text) ? prev : [...prev, latestUser.text]));
  }

  return (
    <KeyboardAvoidingView
      style={styles.case}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Pressable style={styles.roundButton} onPress={() => navigation.goBack()}>
            <Text style={styles.roundButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.wordmark}>PUPPY CONNECT</Text>
          <View style={styles.roundButtonPlaceholder} />
        </View>

        <Text style={styles.heading}>✦ {params.dogName}랑 이야기 ✦</Text>

        <View style={styles.bezel}>
          <View style={styles.display}>
            <View style={styles.garden}>
              <View style={styles.nameplate}>
                <Text style={styles.nameplateText}>{params.dogName}</Text>
              </View>
              {dogSheet && (
                <Canvas style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}>
                  <SpriteFrame
                    sheet={dogSheet}
                    frameSize={DOG_FRAME_SIZE}
                    col={0}
                    row={dogIdleRow(params.identityIndex)}
                    x={0}
                    y={0}
                    size={AVATAR_SIZE}
                  />
                </Canvas>
              )}
            </View>
            <View style={styles.dialogue}>
              {state.status === 'loading' && <ActivityIndicator />}
              {state.status === 'error' && (
                <>
                  <Text style={styles.errorText}>대화를 시작하지 못했어요: {state.message}</Text>
                  {(state.code === 'UNAUTHENTICATED' || state.code === 'ACCOUNT_NOT_REGISTERED') && (
                    <Pressable onPress={() => navigation.navigate('Login')}>
                      <Text style={styles.loginCta}>로그인하기</Text>
                    </Pressable>
                  )}
                </>
              )}
              {state.status === 'ready' && (
                <>
                  {latestUser && <Text style={styles.lastQuestion}>나 · {latestUser.text}</Text>}
                  <Text style={styles.answer}>
                    {state.sending
                      ? '…'
                      : latestAssistant?.text ?? `${params.dogName}에게 말을 걸어보세요.`}
                  </Text>
                  {state.sendError && <Text style={styles.errorText}>{state.sendError}</Text>}
                </>
              )}
            </View>
          </View>
        </View>

        {state.status === 'ready' && (
          <>
            <View style={styles.topics}>
              {QUICK_TOPICS.map(topic => (
                <Pressable key={topic} style={styles.topicButton} onPress={() => submit(topic)} disabled={state.sending}>
                  <Text style={styles.topicText}>{topic}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="궁금한 걸 직접 물어봐"
                placeholderTextColor="#806a4f"
                maxLength={300}
                editable={!state.sending}
                onSubmitEditing={() => submit(draft)}
              />
              <Pressable style={styles.sendButton} onPress={() => submit(draft)} disabled={state.sending}>
                <Text style={styles.sendButtonText}>↑</Text>
              </Pressable>
            </View>

            {latestAssistant?.needsShelterConfirmation && (
              <Pressable onPress={saveQuestion} disabled={latestUser ? pendingQuestions.includes(latestUser.text) : false}>
                <Text style={styles.saveQuestion}>
                  {latestUser && pendingQuestions.includes(latestUser.text)
                    ? '상담 질문에 담았어 ✓'
                    : '보호소에 확인할 질문으로 담기'}
                </Text>
              </Pressable>
            )}

            {latestAssistant && (
              <View style={styles.revealInvite}>
                <Text style={styles.revealInviteText}>이제 내 모습도 만나볼래?</Text>
                <Pressable
                  style={styles.revealButton}
                  onPress={() =>
                    navigation.navigate('Profile', {
                      dogId: params.dogId,
                      dogName: params.dogName,
                      identityIndex: params.identityIndex,
                      knownFacts: messages.filter(m => m.role === 'ASSISTANT').map(m => m.text),
                      pendingQuestions,
                    })
                  }
                >
                  <Text style={styles.revealButtonText}>사진으로 만나기</Text>
                </Pressable>
              </View>
            )}

            {messages.length > 0 && (
              <View style={styles.notebook}>
                <Pressable onPress={() => setNotebookOpen(open => !open)} style={styles.notebookSummary}>
                  <Text style={styles.notebookSummaryText}>📓 대화 수첩</Text>
                  <Text style={styles.notebookSummaryText}>
                    {messages.length}개 이야기 · {notebookOpen ? '접기' : '펼치기'}
                  </Text>
                </Pressable>
                {notebookOpen && (
                  <View style={styles.notebookPages}>
                    <Text style={styles.notebookNote}>보호소의 관찰 기록을 바탕으로 나눈 이야기예요.</Text>
                    {messages.map(message => (
                      <Text
                        key={message.id}
                        style={message.role === 'USER' ? styles.notebookUser : styles.notebookReply}
                      >
                        {message.role === 'USER' ? `나 · ${message.text}` : message.text}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const CASE_COLOR = '#ffdb76';
const INK = '#69452f';

const styles = StyleSheet.create({
  case: {
    flex: 1,
    backgroundColor: CASE_COLOR,
  },
  scrollContent: {
    padding: 19,
    paddingBottom: 40,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffe798',
    borderWidth: 1,
    borderColor: '#d4aa60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButtonPlaceholder: {
    width: 42,
    height: 42,
  },
  roundButtonText: {
    fontSize: 22,
    color: INK,
  },
  wordmark: {
    fontSize: 11,
    letterSpacing: 1,
    color: '#785733',
  },
  heading: {
    textAlign: 'center',
    fontSize: 22,
    color: '#844657',
    paddingVertical: 20,
  },
  bezel: {
    padding: 10,
    backgroundColor: '#ff8292',
    borderWidth: 2,
    borderColor: '#f46982',
    borderRadius: 21,
  },
  display: {
    borderWidth: 3,
    borderColor: '#84415d',
    borderRadius: 9,
    backgroundColor: '#fffcec',
    overflow: 'hidden',
  },
  garden: {
    backgroundColor: '#80c4ee',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    minHeight: 170,
  },
  nameplate: {
    position: 'absolute',
    left: 11,
    top: 9,
  },
  nameplateText: {
    fontSize: 14,
    backgroundColor: '#fffdebdc',
    color: '#344d61',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 5,
  },
  dialogue: {
    padding: 15,
    minHeight: 110,
    borderTopWidth: 3,
    borderTopColor: '#75894d',
    backgroundColor: '#fffcec',
  },
  lastQuestion: {
    fontSize: 11,
    color: '#78684e',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d8cda9',
    borderStyle: 'dashed',
  },
  answer: {
    fontSize: 14,
    lineHeight: 22,
    color: '#514834',
  },
  loginCta: {
    fontSize: 13,
    color: '#277fb0',
    fontWeight: '700',
    textDecorationLine: 'underline',
    marginTop: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#b3364f',
    marginTop: 8,
  },
  topics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 18,
    gap: 8,
  },
  topicButton: {
    flex: 1,
    backgroundColor: '#ffd362',
    borderWidth: 4,
    borderColor: '#ff8292',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  topicText: {
    fontSize: 11,
    color: INK,
    textAlign: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 2,
    borderColor: '#c69648',
    borderRadius: 14,
    backgroundColor: '#fff7d8',
    padding: 5,
  },
  input: {
    flex: 1,
    color: INK,
    fontSize: 15,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ff9eaa',
    borderWidth: 1,
    borderColor: '#bd566c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 18,
    color: '#693747',
  },
  saveQuestion: {
    textAlign: 'center',
    fontSize: 12,
    color: '#754733',
    textDecorationLine: 'underline',
    paddingVertical: 12,
  },
  revealInvite: {
    marginTop: 21,
    alignItems: 'center',
  },
  revealInviteText: {
    fontSize: 12,
    color: INK,
    marginBottom: 8,
  },
  revealButton: {
    width: '100%',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c45870',
    borderRadius: 11,
    backgroundColor: '#ffa5ad',
  },
  revealButtonText: {
    color: '#613643',
    fontSize: 13,
    fontWeight: '600',
  },
  notebook: {
    marginTop: 17,
    borderTopWidth: 1,
    borderTopColor: '#c49a52',
    borderStyle: 'dashed',
  },
  notebookSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  notebookSummaryText: {
    fontSize: 12,
    color: INK,
  },
  notebookPages: {
    padding: 11,
    marginBottom: 12,
    backgroundColor: '#fff7d8',
    borderRadius: 9,
    gap: 9,
  },
  notebookNote: {
    fontSize: 11,
    color: '#655336',
    marginBottom: 4,
  },
  notebookUser: {
    fontSize: 12,
    color: '#695331',
    backgroundColor: '#ffe1a0',
    borderRadius: 11,
    padding: 10,
    alignSelf: 'flex-end',
  },
  notebookReply: {
    fontSize: 13,
    color: '#514834',
    backgroundColor: '#fffdef',
    borderRadius: 11,
    padding: 10,
  },
});
