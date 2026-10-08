import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useImage } from '@shopify/react-native-skia';
// Reused from the game module: a screen composing another domain's rendering utility is the same
// "screens cross module boundaries" exception CLAUDE.md already carves out for hooks/APIs.
import { dogWalkAtlas } from '../game/core/assets/dog/dogWalkAtlas';
import { fonts } from '../../shared/lib/fonts';
import { ConsoleChatWindow } from './console/ConsoleChatWindow';
import { ConsoleLcd } from './console/ConsoleLcd';
import { ConsoleShell, type ConsoleKey } from './console/ConsoleShell';
import { designScale, shellSize } from './console/layout';
import { nextTopic, TOPICS } from './console/topics';
import { useDogChat } from './hooks/useDogChat';
import { useDogSaved } from './hooks/useDogSaved';
import type { RootStackParamList } from '../../app/navigation';

// "PUPPY CONNECT" console (design: puppy-profile.html). The case artwork carries the buttons: the
// D-pad picks a topic, A talks about it, B goes back, SELECT opens the 소개서, START resumes the chat.
// Chat itself is the real grounded-chat session (useDogChat) shown in the retro window.
export function ChatScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const dogSheet = useImage(dogWalkAtlas);
  const { state, send, retrySend } = useDogChat(params.dogId);
  const dogSaved = useDogSaved(params.dogId);

  const [view, setView] = useState<'home' | 'chat'>('home');
  const [topic, setTopic] = useState(0);
  const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [keyboard, setKeyboard] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // iOS reports the keyboard separately; Android's adjustResize already shrinks the window.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillChangeFrame', event => setKeyboard(Math.max(0, height - event.endCoordinates.screenY)));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [height]);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const availableHeight = height - insets.top - insets.bottom - 8;
  const shell = shellSize(width, availableHeight);
  const topOffset = insets.top + Math.max(0, (availableHeight - shell.height) / 2);

  const ready = state.status === 'ready';
  const messages = ready ? state.messages : [];
  const sending = ready && state.sending;
  const canSend = ready && state.session.canSend;
  const asked = (index: number) => messages.some(m => m.role === 'USER' && m.text === TOPICS[index].prompt);
  const latestAssistant = [...messages].reverse().find(m => m.role === 'ASSISTANT');
  const latestUser = [...messages].reverse().find(m => m.role === 'USER');
  const needsLogin = state.status === 'error' && (state.code === 'UNAUTHENTICATED' || state.code === 'ACCOUNT_NOT_REGISTERED');

  const showToast = (text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  };

  const talk = (index: number, ask: boolean) => {
    if (state.status === 'error' && needsLogin) {
      navigation.navigate('LoginGuide');
      return;
    }
    if (!ready) return;
    setTopic(index);
    setView('chat');
    if (ask && canSend && !sending && !asked(index)) send(TOPICS[index].prompt);
  };

  const openProfile = () =>
    navigation.navigate('Profile', {
      dogId: params.dogId,
      dogName: params.dogName,
      identityIndex: params.identityIndex,
      shelterName: params.shelterName,
      knownFacts: messages.filter(m => m.role === 'ASSISTANT').map(m => m.text),
      pendingQuestions,
    });

  const press = (key: ConsoleKey) => {
    if (view === 'chat') {
      if (key === 'b') setView('home');
      return;
    }
    if (key === 'up' || key === 'left') setTopic(nextTopic(topic, -1));
    else if (key === 'down' || key === 'right') setTopic(nextTopic(topic, 1));
    else if (key === 'a') talk(topic, true);
    else if (key === 'start') talk(topic, false);
    else if (key === 'b') navigation.goBack();
    else if (key === 'select') openProfile();
  };

  const toggleSave = async () => {
    if (dogSaved.needsLogin) {
      navigation.navigate('LoginGuide');
      return;
    }
    const wasSaved = dogSaved.saved;
    await dogSaved.toggle();
    showToast(wasSaved ? `${params.dogName} 저장을 취소했어요` : `${params.dogName} 저장했어요`);
  };

  const bubble =
    state.status === 'loading' ? (
      '불러오는 중…'
    ) : state.status === 'error' ? (
      <View>
        <Text style={styles.bubbleError}>대화를 시작하지 못했어요</Text>
        {needsLogin && (
          <Pressable onPress={() => navigation.navigate('LoginGuide')} hitSlop={8}>
            <Text style={styles.bubbleLink}>로그인하기</Text>
          </Pressable>
        )}
      </View>
    ) : (
      '오늘은 무슨 이야기를 할까?'
    );

  const windowBottomLimit = keyboard > 0 ? height - keyboard - topOffset - 8 : undefined;
  const s = designScale(shell);

  return (
    <View style={[styles.root, { paddingTop: topOffset }]}>
      <View style={{ width: shell.width, height: shell.height }}>
        <ConsoleShell shell={shell} onPress={press} onBack={() => (view === 'chat' ? setView('home') : navigation.goBack())}>
          <ConsoleLcd
            shell={shell}
            dogName={params.dogName}
            shelterName={params.shelterName}
            identityIndex={params.identityIndex}
            sheet={dogSheet}
            topic={topic}
            asked={asked(topic)}
            saved={dogSaved.saved}
            bubble={bubble}
            onSelectTopic={index => (asked(index) ? talk(index, false) : setTopic(index))}
            onToggleSave={toggleSave}
          />
          {view === 'chat' && (
            <>
              <View style={styles.shade} pointerEvents="auto" />
              <ConsoleChatWindow
                shell={shell}
                dogName={params.dogName}
                shelterName={params.shelterName}
                identityIndex={params.identityIndex}
                sheet={dogSheet}
                topic={topic}
                onSelectTopic={index => talk(index, true)}
                messages={messages}
                sending={sending}
                sendError={ready ? state.sendError : null}
                retryable={ready && !!state.retryableMessageId}
                canSend={canSend}
                confirmable={!!latestAssistant?.needsShelterConfirmation && !!latestUser}
                confirmed={!!latestUser && pendingQuestions.includes(latestUser.text)}
                onSend={send}
                onRetry={retrySend}
                onConfirm={() => latestUser && setPendingQuestions(prev => (prev.includes(latestUser.text) ? prev : [...prev, latestUser.text]))}
                onClose={() => setView('home')}
                maxBottom={windowBottomLimit}
              />
            </>
          )}
        </ConsoleShell>
        {toast && (
          <View style={[styles.toast, { top: 4 * s, minWidth: 184 * s }]} pointerEvents="none">
            <Text style={[styles.toastText, { fontSize: 12 * s }]}>{toast}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: '#e4f2fa' },
  shade: { ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const), backgroundColor: 'rgba(41,54,91,0.21)', borderRadius: 58, zIndex: 5 },
  toast: { position: 'absolute', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#fffcf5', borderWidth: 1, borderColor: '#b4a8d0', borderRadius: 8, zIndex: 20 },
  toastText: { fontFamily: fonts.pixel, color: '#6b5087' },
  bubbleError: { fontFamily: fonts.body, fontSize: 12, color: '#647365' },
  bubbleLink: { fontFamily: fonts.pixel, fontSize: 12, color: '#7773ae', marginTop: 4 },
});
