import { useMemo, useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { Canvas, FilterMode, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Hand,
  House,
  Image as ImageIcon,
  MessagesSquare,
  NotebookPen,
} from 'lucide-react-native';
// Reused from the game module: a screen composing another domain's rendering
// utility is the same "screens cross module boundaries" exception CLAUDE.md
// already carves out for hooks/APIs (GameScreen using modules/dog's hooks) — the
// dog's dot-sprite identity belongs to this screen's UX just as much as the game's.
import { SpriteFrame } from '../game/core/entities/SpriteFrame';
import { DOG_FRAME_SIZE, dogIdleRow, dogWalkAtlas } from '../game/core/assets/dog/dogWalkAtlas';
import { chatRoomBackground, CHAT_ROOM_ASPECT_RATIO } from './assets/chatRoomBackground';
import { useDogChat } from './hooks/useDogChat';
import type { RootStackParamList } from '../../app/navigation';

// Mirrors HANN-Creator/shelter-connect's own prototype
// (work/mobile-concept/pet-chat-section.html + pet-chat.css) as closely as RN
// styling allows — colors, spacing and the <350px compact breakpoint are taken
// directly from that CSS rather than eyeballed from a screenshot.
const QUICK_TOPICS = [
  { key: 'walk', Icon: Footprints, label: '산책', prompt: '산책은 어때?' },
  { key: 'alone', Icon: House, label: '혼자 있을 때', prompt: '혼자 있어도 괜찮아?' },
  { key: 'greet', Icon: Hand, label: '처음 만날 때', prompt: '낯선 사람은 어때?' },
];

const NEAREST_SAMPLING = { filter: FilterMode.Nearest };
const INK = '#69452f';
const CASE_COLOR = '#ffdb76';
const CASE_LIGHT = '#ffe798';
const BEZEL = '#ff8292';
const BEZEL_DARK = '#c84667';

export function ChatScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const dogSheet = useImage(dogWalkAtlas);
  const chatRoomImage = useImage(chatRoomBackground);
  const { state, send, retrySend } = useDogChat(params.dogId);
  const [draft, setDraft] = useState('');
  const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [gardenWidth, setGardenWidth] = useState(0);

  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < 350;
  const styles = useMemo(() => createStyles(compact), [compact]);
  const avatarSize = compact ? 104 : 128;
  const gardenHeight = gardenWidth / CHAT_ROOM_ASPECT_RATIO;

  const messages = state.status === 'ready' ? state.messages : [];
  const latestAssistant = [...messages].reverse().find(m => m.role === 'ASSISTANT');
  const latestUser = [...messages].reverse().find(m => m.role === 'USER');

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || state.status !== 'ready' || state.sending || !state.session.canSend) {
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
    <KeyboardAvoidingView style={styles.case} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Pressable style={styles.roundButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={20} color={INK} />
          </Pressable>
          <Text style={styles.wordmark}>PUPPY CONNECT</Text>
          <Pressable style={styles.roundButton} onPress={() => navigation.navigate('Home')}>
            <House size={20} color={INK} />
          </Pressable>
        </View>

        <View style={styles.heading}>
          <Text style={styles.headingMark}>✦</Text>
          <Text style={styles.headingText}>{params.dogName}랑 이야기</Text>
          <Text style={styles.headingMark}>✦</Text>
        </View>

        <View style={styles.bezel}>
          <View style={styles.display}>
            <View style={styles.garden} onLayout={e => setGardenWidth(e.nativeEvent.layout.width)}>
              {chatRoomImage && gardenWidth > 0 && (
                <Canvas style={{ position: 'absolute', width: gardenWidth, height: gardenHeight }}>
                  <SkiaImage
                    image={chatRoomImage}
                    x={0}
                    y={0}
                    width={gardenWidth}
                    height={gardenHeight}
                    fit="fill"
                    sampling={NEAREST_SAMPLING}
                  />
                </Canvas>
              )}
              {dogSheet && (
                <Canvas
                  style={{
                    position: 'absolute',
                    width: avatarSize,
                    height: avatarSize,
                    left: '50%',
                    marginLeft: -avatarSize / 2,
                    bottom: compact ? '3%' : '6%',
                  }}
                >
                  <SpriteFrame
                    sheet={dogSheet}
                    frameSize={DOG_FRAME_SIZE}
                    col={0}
                    row={dogIdleRow(params.identityIndex)}
                    x={0}
                    y={0}
                    size={avatarSize}
                  />
                </Canvas>
              )}
              <View style={styles.nameplate}>
                <Text style={styles.nameplateText}>{params.dogName}</Text>
                {state.status === 'ready' && (
                  <View style={styles.statusBadge}>
                    <MessagesSquare size={13} color="#344d61" />
                    <Text style={styles.statusBadgeText}>대화 중</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.dialogue}>
              <View style={styles.dialogueArrow} />
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
                    {state.sending ? '…' : latestAssistant?.text ?? `${params.dogName}에게 말을 걸어보세요.`}
                  </Text>
                  {state.sendError && <Text style={styles.errorText}>{state.sendError}</Text>}
                  {state.retryableMessageId && (
                    <Pressable onPress={retrySend} disabled={state.sending}>
                      <Text style={styles.loginCta}>다시 시도</Text>
                    </Pressable>
                  )}
                </>
              )}
              <Text style={styles.dialogueHeart}>♥</Text>
            </View>
          </View>
        </View>

        {state.status === 'ready' && (
          <>
            <View style={styles.topics}>
              {QUICK_TOPICS.map(topic => (
                <View key={topic.key} style={styles.topicItem}>
                  <Pressable
                    style={styles.topicButton}
                    onPress={() => submit(topic.prompt)}
                    disabled={state.sending || !state.session.canSend}
                  >
                    <topic.Icon size={25} color="#76502e" />
                  </Pressable>
                  <Text style={styles.topicLabel}>{topic.label}</Text>
                </View>
              ))}
            </View>

            {!state.session.canSend && (
              <Text style={styles.errorText}>지금은 이 강아지와 대화할 수 없어요.</Text>
            )}

            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="궁금한 걸 직접 물어봐"
                placeholderTextColor="#806a4f"
                maxLength={300}
                editable={!state.sending && state.session.canSend}
                onSubmitEditing={() => submit(draft)}
              />
              <Pressable
                style={styles.sendButton}
                onPress={() => submit(draft)}
                disabled={state.sending || !state.session.canSend}
              >
                <ArrowUp size={18} color="#693747" />
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
                  <ImageIcon size={15} color="#613643" />
                  <Text style={styles.revealButtonText}>사진으로 만나기</Text>
                  <ChevronRight size={15} color="#613643" />
                </Pressable>
              </View>
            )}

            {messages.length > 0 && (
              <View style={styles.notebook}>
                <Pressable onPress={() => setNotebookOpen(open => !open)} style={styles.notebookSummary}>
                  <View style={styles.notebookSummaryLabel}>
                    <NotebookPen size={16} color={INK} />
                    <Text style={styles.notebookSummaryText}>대화 수첩</Text>
                  </View>
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

// Values follow pet-chat.css's own <350px breakpoint 1:1 rather than scaling
// fluidly — the prototype itself only defines these two fixed steps.
function createStyles(compact: boolean) {
  return StyleSheet.create({
    case: {
      flex: 1,
      backgroundColor: CASE_COLOR,
    },
    scrollContent: compact
      ? { paddingTop: 11, paddingHorizontal: 13, paddingBottom: 16 }
      : { paddingTop: 12, paddingHorizontal: 19, paddingBottom: 17 },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 9,
    },
    roundButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: CASE_LIGHT,
      borderWidth: 1,
      borderColor: '#d4aa60',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#d3a151',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    wordmark: {
      fontSize: compact ? 11 : 14,
      letterSpacing: compact ? 0 : 1,
      color: '#785733',
      fontWeight: '700',
    },
    heading: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 11,
      paddingVertical: compact ? 18 : 19,
      paddingBottom: compact ? 22 : 23,
    },
    headingText: {
      fontSize: compact ? 21 : 23,
      lineHeight: (compact ? 21 : 23) * 1.4,
      color: '#844657',
      letterSpacing: -1,
      textShadowColor: '#fff1bc',
      textShadowOffset: { width: 1, height: 2 },
      textShadowRadius: 0,
    },
    headingMark: {
      fontSize: 17,
      color: '#a65d50',
    },
    bezel: {
      padding: compact ? 8 : 10,
      backgroundColor: BEZEL,
      borderWidth: 2,
      borderColor: '#f46982',
      borderRadius: compact ? 18 : 21,
      shadowColor: BEZEL_DARK,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 6,
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
      aspectRatio: CHAT_ROOM_ASPECT_RATIO,
      position: 'relative',
    },
    nameplate: {
      position: 'absolute',
      left: 11,
      right: 11,
      top: 9,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    nameplateText: {
      fontSize: 16,
      backgroundColor: '#fffdebdc',
      color: '#344d61',
      paddingHorizontal: 9,
      paddingVertical: 2,
      borderRadius: 5,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#fffdebdc',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    statusBadgeText: {
      fontSize: 11,
      color: '#344d61',
    },
    dialogue: {
      position: 'relative',
      padding: compact ? 13 : 16,
      paddingHorizontal: compact ? 12 : 15,
      paddingBottom: compact ? 26 : 27,
      minHeight: 133,
      borderTopWidth: 3,
      borderTopColor: '#75894d',
      backgroundColor: '#fffcec',
    },
    dialogueArrow: {
      position: 'absolute',
      top: -9,
      left: '50%',
      marginLeft: -6.5,
      width: 13,
      height: 13,
      backgroundColor: '#fffcec',
      borderTopWidth: 3,
      borderLeftWidth: 3,
      borderColor: '#75894d',
      transform: [{ rotate: '45deg' }],
    },
    lastQuestion: {
      fontSize: 11,
      lineHeight: 20,
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
    dialogueHeart: {
      position: 'absolute',
      bottom: 7,
      right: 12,
      fontSize: 12,
      color: '#b95472',
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
      marginTop: compact ? 24 : 26,
      marginBottom: 18,
      gap: compact ? 4 : 8,
    },
    topicItem: {
      alignItems: 'center',
      gap: 10,
    },
    topicButton: {
      width: compact ? 60 : 66,
      height: compact ? 60 : 66,
      borderRadius: compact ? 30 : 33,
      backgroundColor: '#ffd362',
      borderWidth: compact ? 6 : 7,
      borderColor: BEZEL,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: BEZEL_DARK,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 4,
    },
    topicLabel: {
      fontSize: compact ? 11 : 12,
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
      fontSize: 16,
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
      shadowColor: '#cc6b7b',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    saveQuestion: {
      textAlign: 'center',
      fontSize: 12,
      color: '#754733',
      textDecorationLine: 'underline',
      paddingTop: 12,
      paddingHorizontal: 4,
      paddingBottom: 3,
      minHeight: 44,
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: '#c45870',
      borderRadius: 11,
      backgroundColor: '#ffa5ad',
      shadowColor: '#cf6a79',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
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
      borderBottomWidth: 1,
      borderBottomColor: '#c49a52',
      borderStyle: 'dashed',
    },
    notebookSummary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      minHeight: 45,
      paddingVertical: 8,
      paddingHorizontal: 3,
    },
    notebookSummaryLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    notebookSummaryText: {
      fontSize: 12,
      color: INK,
    },
    notebookPages: {
      padding: compact ? 10 : 11,
      paddingHorizontal: compact ? 7 : 10,
      paddingBottom: 15,
      marginBottom: 12,
      backgroundColor: '#fff7d8',
      borderRadius: 9,
      gap: 9,
    },
    notebookNote: {
      fontSize: 11,
      lineHeight: 20,
      color: '#655336',
      marginBottom: 4,
    },
    notebookUser: {
      fontSize: 12,
      color: '#695331',
      backgroundColor: '#ffe1a0',
      borderWidth: 1,
      borderColor: '#d2b57c',
      borderTopLeftRadius: 11,
      borderTopRightRadius: 11,
      borderBottomLeftRadius: 11,
      borderBottomRightRadius: 2,
      padding: 10,
      alignSelf: 'flex-end',
    },
    notebookReply: {
      fontSize: 13,
      color: '#514834',
      backgroundColor: '#fffdef',
      borderWidth: 1,
      borderColor: '#d8c7a0',
      borderTopLeftRadius: 2,
      borderTopRightRadius: 11,
      borderBottomLeftRadius: 11,
      borderBottomRightRadius: 11,
      padding: 10,
    },
  });
}
