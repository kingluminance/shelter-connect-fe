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
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../shared/lib/supabase';
import { ApiError } from '../../shared/lib/apiClient';
import { registerServiceUser } from './api/account';

// Same app-shell language as ChatScreen's "PUPPY CONNECT" device and the
// shelter-connect prototype's home screen (cream paper + yellow hero + navy ink +
// blue primary button with an offset shadow) — kept here as plain constants since
// there's no shared theme file yet.
const INK = '#172b56';
const PAPER = '#fff9e9';
const YELLOW = '#ffdc79';
const BLUE = '#4f85f4';
const MUTED = '#58647f';
const LINE = '#c2cbe1';

type Mode = 'signIn' | 'signUp';

export function LoginScreen() {
  const navigation = useNavigation();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!supabase) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.kicker}>A LITTLE CLOSER, TOGETHER</Text>
        <Text style={styles.title}>보호소 커넥트</Text>
        <Text style={styles.notice}>
          로그인 기능은 아직 설정 중이에요.{'\n'}(SUPABASE_ANON_KEY 미설정 — 백엔드팀 확인 필요)
        </Text>
      </View>
    );
  }

  async function submit() {
    if (!supabase || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signIn') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
          throw authError;
        }
      } else {
        const { data, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) {
          throw authError;
        }
        if (!data.session) {
          setNotice('가입 확인 이메일을 보냈어요. 확인 후 로그인해 주세요.');
          setBusy(false);
          return;
        }
      }
      // "앱에서 연결할 순서" (auth-and-permissions.md): 로그인 직후 서비스 사용자 등록.
      await registerServiceUser();
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.kickerTag}>
          <Text style={styles.kicker}>A LITTLE CLOSER, TOGETHER</Text>
        </View>
        <Text style={styles.title}>{mode === 'signIn' ? '로그인' : '회원가입'}</Text>
        <Text style={styles.subtitle}>강아지와 대화하려면 로그인이 필요해요.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={MUTED}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            editable={!busy}
          />
          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="********"
            placeholderTextColor={MUTED}
            secureTextEntry
            autoCapitalize="none"
            editable={!busy}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}
          {notice && <Text style={styles.noticeText}>{notice}</Text>}

          <Pressable style={styles.primaryButton} onPress={submit} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{mode === 'signIn' ? '로그인' : '회원가입'}</Text>
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            setMode(m => (m === 'signIn' ? 'signUp' : 'signIn'));
            setError(null);
            setNotice(null);
          }}
        >
          <Text style={styles.switchText}>
            {mode === 'signIn' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAPER,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  scrollContent: {
    padding: 22,
    paddingTop: 48,
  },
  kickerTag: {
    alignSelf: 'flex-start',
    backgroundColor: YELLOW,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 12,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: INK,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: INK,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 8,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 12,
    padding: 18,
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: MUTED,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: INK,
    backgroundColor: '#fff',
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: BLUE,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    // Offset "pop" shadow, matching the prototype's .pm-primary button.
    shadowColor: INK,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  switchText: {
    textAlign: 'center',
    color: BLUE,
    fontSize: 13,
    marginTop: 20,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#b3364f',
    fontSize: 12,
    marginTop: 12,
  },
  noticeText: {
    color: MUTED,
    fontSize: 12,
    marginTop: 12,
  },
  notice: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
});
