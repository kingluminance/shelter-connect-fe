import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  Pencil,
  PawPrint,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import { supabase } from '../../shared/lib/supabase';
import { useAuthSession } from '../../shared/lib/useAuthSession';
import { ApiError } from '../../shared/lib/apiClient';
import { fonts } from '../../shared/lib/fonts';
import { SvgIcon } from '../../shared/ui/SvgIcon';
import { svgAssets as dogSvgAssets } from '../dog/assets/svgAssets';
import { AuthPrimaryButton } from './components/AuthButtons';
import { useServiceProfile } from './hooks/useServiceProfile';
import { authErrorMessage, nicknameError, normalizeNickname } from './signupRules';
import type { HomeTabScreenNavigationProp } from '../../app/navigation';

// Figma "18 내 정보 · 설정" (46:26441). 5탭 바는 홈이 선택된 채로 보이도록 MainTabs의 숨은 라우트다.
export function SettingsScreen() {
  const navigation = useNavigation<HomeTabScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const session = useAuthSession();
  const { state, rename } = useServiceProfile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const email = session.status === 'signedIn' ? session.email : null;
  const nickname = state.status === 'ready' ? state.profile.displayName : '';

  const openEditor = () => {
    setDraft(nickname);
    setDraftError(null);
    setEditing(true);
  };

  const saveNickname = async () => {
    const problem = nicknameError(draft);
    if (problem) {
      setDraftError(problem);
      return;
    }
    setSaving(true);
    try {
      await rename(normalizeNickname(draft));
      setEditing(false);
    } catch (err) {
      setDraftError(err instanceof ApiError ? err.message : '닉네임을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!supabase || !email) {
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    Alert.alert(error ? '메일을 보내지 못했어요' : '재설정 메일을 보냈어요', error ? authErrorMessage(error.message) : `${email}로 비밀번호 재설정 메일을 보냈어요.`);
  };

  const logout = () => {
    Alert.alert('로그아웃', '로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await supabase?.auth.signOut();
          navigation.navigate('홈');
        },
      },
    ]);
  };

  const comingSoon = (title: string) => Alert.alert(title, '문서는 곧 공개될 예정이에요.');

  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="settingsBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#def1f6" />
            <Stop offset="0.515" stopColor="#fcf9f0" />
            <Stop offset="1" stopColor="#fcf9f0" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#settingsBg)" />
      </Svg>

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => navigation.navigate('홈')} hitSlop={10}>
            <ChevronLeft size={16} color="#7b8d99" strokeWidth={2} />
          </Pressable>
          <Text style={styles.title}>내 정보 · 설정</Text>
          <SvgIcon xml={dogSvgAssets.pawTitle} width={22} height={22} />
        </View>
        <Text style={styles.subtitle}>내 정보와 이용 설정을 확인해요.</Text>

        {session.status === 'anon' && (
          <View style={styles.guestCard}>
            <Text style={styles.guestText}>로그인하면 닉네임과 계정을 관리할 수 있어요.</Text>
            <AuthPrimaryButton label="로그인하기" onPress={() => navigation.navigate('Login')} />
          </View>
        )}

        {session.status === 'signedIn' && (
          <>
            <View style={styles.profileCard}>
              <View style={styles.profileTop}>
                <View style={styles.avatar}>
                  <User size={34} color="#b9a4cc" strokeWidth={1.6} />
                  <View style={styles.avatarBadge}>
                    <PawPrint size={10} color="#a5b98e" strokeWidth={2} />
                  </View>
                </View>
                <View style={styles.profileName}>
                  <Text style={styles.profileLabel}>내 닉네임</Text>
                  {state.status === 'loading' && <ActivityIndicator style={styles.nameLoading} />}
                  {state.status === 'error' && <Text style={styles.errorInline}>불러오지 못했어요</Text>}
                  {state.status === 'ready' && (
                    <Text style={styles.nickname} numberOfLines={1}>
                      {nickname}
                    </Text>
                  )}
                </View>
                <Pressable style={styles.editButton} onPress={openEditor} disabled={state.status !== 'ready'}>
                  <Pencil size={12} color="#9580a6" strokeWidth={2} />
                  <Text style={styles.editText}>닉네임 수정</Text>
                </Pressable>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.noteRow}>
                <MessageSquare size={13} color="#b2a3bd" strokeWidth={1.8} />
                <Text style={styles.noteText}>닉네임은 커뮤니티와 이웃 문의에 보여요.</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>계정 관리</Text>
            <View style={styles.listCard}>
              <View style={styles.listRow}>
                <IconBox bg="#f0ebf5">
                  <Mail size={16} color="#ab97ba" strokeWidth={1.6} />
                </IconBox>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>로그인 이메일</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {email ?? '-'}
                  </Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>이메일 계정</Text>
                </View>
              </View>
              <View style={styles.rowDivider} />
              <Pressable style={styles.listRow} onPress={sendPasswordReset}>
                <IconBox bg="#f0ebf5">
                  <Lock size={16} color="#ab97ba" strokeWidth={1.6} />
                </IconBox>
                <Text style={[styles.rowTitle, styles.rowTitleSolo]}>비밀번호 재설정</Text>
                <ChevronRight size={14} color="#b8a9c4" strokeWidth={2} />
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>서비스 안내</Text>
            <View style={styles.listCard}>
              <Pressable style={styles.listRow} onPress={() => comingSoon('이용약관')}>
                <IconBox bg="#f3edf6">
                  <FileText size={16} color="#a68fb8" strokeWidth={1.6} />
                </IconBox>
                <Text style={[styles.rowTitle, styles.rowTitleSolo]}>이용약관</Text>
                <ChevronRight size={14} color="#b8a9c4" strokeWidth={2} />
              </Pressable>
              <View style={styles.rowDivider} />
              <Pressable style={styles.listRow} onPress={() => comingSoon('개인정보 처리방침')}>
                <IconBox bg="#edf3e7">
                  <ShieldCheck size={16} color="#8aa27a" strokeWidth={1.6} />
                </IconBox>
                <Text style={[styles.rowTitle, styles.rowTitleSolo]}>개인정보 처리방침</Text>
                <ChevronRight size={14} color="#b8a9c4" strokeWidth={2} />
              </Pressable>
            </View>

            <Pressable style={styles.logout} onPress={logout}>
              <LogOut size={17} color="#987fa4" strokeWidth={1.8} />
              <Text style={styles.logoutText}>로그아웃</Text>
            </Pressable>
            <Text style={styles.logoutHint}>로그아웃해도 보호소를 둘러볼 수 있어요.</Text>
          </>
        )}
      </ScrollView>

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>닉네임 수정</Text>
            <TextInput
              style={styles.sheetInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="이웃에게 보여줄 이름"
              placeholderTextColor="#b0a2b7"
              maxLength={40}
              autoFocus
              editable={!saving}
            />
            {draftError && <Text style={styles.errorInline}>{draftError}</Text>}
            <View style={styles.sheetActions}>
              <Pressable style={styles.sheetCancel} onPress={() => setEditing(false)} disabled={saving}>
                <Text style={styles.sheetCancelText}>취소</Text>
              </Pressable>
              <View style={styles.sheetSave}>
                <AuthPrimaryButton label="저장" onPress={saveNickname} busy={saving} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function IconBox({ bg, children }: { bg: string; children: React.ReactNode }) {
  return <View style={[styles.iconBox, { backgroundColor: bg }]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', height: 34 },
  back: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f7fcfc', borderWidth: 0.8, borderColor: '#cce2e7', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, marginLeft: 17, fontFamily: fonts.pixel, fontSize: 21, lineHeight: 29, color: '#5e7383' },
  subtitle: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: '#92a0a7', marginTop: 17, marginLeft: 1 },
  guestCard: { marginTop: 28, gap: 18, padding: 20, backgroundColor: '#fffefa', borderWidth: 0.9, borderColor: '#d8dde0', borderRadius: 21 },
  guestText: { fontFamily: fonts.body, fontSize: 13, color: '#8c7b99', textAlign: 'center' },
  profileCard: {
    marginTop: 32,
    backgroundColor: '#fffefa',
    borderWidth: 0.9,
    borderColor: '#d8dde0',
    borderRadius: 21,
    paddingHorizontal: 19,
    paddingTop: 21,
    paddingBottom: 16,
    shadowColor: '#4a4659',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  profileTop: { flexDirection: 'row', alignItems: 'center', height: 61 },
  avatar: { width: 61, height: 61, borderRadius: 31, backgroundColor: '#efe3f2', alignItems: 'center', justifyContent: 'center' },
  avatarBadge: { position: 'absolute', right: -2, bottom: -2, width: 23, height: 23, borderRadius: 12, backgroundColor: '#eef3e3', borderWidth: 1.5, borderColor: '#fffefa', alignItems: 'center', justifyContent: 'center' },
  profileName: { flex: 1, marginLeft: 18, marginRight: 8 },
  profileLabel: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 15, color: '#a79bae' },
  nickname: { fontFamily: fonts.pixel, fontSize: 23, lineHeight: 32, color: '#746481' },
  nameLoading: { alignSelf: 'flex-start', marginTop: 8 },
  editButton: { height: 33, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0e6f6', borderWidth: 0.8, borderColor: '#d8c8e5', borderRadius: 10 },
  editText: { fontFamily: fonts.pixel, fontSize: 9, lineHeight: 13, color: '#9580a6' },
  cardDivider: { height: 0.8, backgroundColor: '#ece8ee', marginTop: 18 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, marginLeft: 1 },
  noteText: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: '#a298a8' },
  sectionTitle: { fontFamily: fonts.pixel, fontSize: 14, lineHeight: 20, color: '#867294', marginTop: 28, marginBottom: 10, marginLeft: 2 },
  listCard: { backgroundColor: '#fffefa', borderWidth: 0.9, borderColor: '#e0d8df', borderRadius: 17, paddingHorizontal: 16 },
  listRow: { flexDirection: 'row', alignItems: 'center', minHeight: 63, gap: 13 },
  iconBox: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1 },
  rowTitle: { fontFamily: fonts.pixel, fontSize: 13, lineHeight: 18, color: '#657080' },
  rowTitleSolo: { flex: 1 },
  rowSub: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: '#a398aa', marginTop: 4 },
  chip: { height: 20, paddingHorizontal: 5, borderRadius: 8, backgroundColor: '#eff3e8', justifyContent: 'center' },
  chipText: { fontFamily: fonts.pixel, fontSize: 7.5, lineHeight: 11, color: '#94a382' },
  rowDivider: { height: 0.8, backgroundColor: '#ece8ee' },
  logout: { marginTop: 32, height: 51, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#f6eef5', borderWidth: 0.9, borderColor: '#d9cadf', borderRadius: 13 },
  logoutText: { fontFamily: fonts.pixel, fontSize: 14, lineHeight: 20, color: '#987fa4' },
  logoutHint: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: '#a8a39e', textAlign: 'center', marginTop: 16 },
  errorInline: { fontFamily: fonts.body, fontSize: 12, color: '#c0526b', marginTop: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(56,64,69,0.35)', justifyContent: 'center', paddingHorizontal: 24 },
  sheet: { backgroundColor: '#fcfaf4', borderRadius: 21, padding: 20, gap: 12 },
  sheetTitle: { fontFamily: fonts.pixel, fontSize: 16, color: '#746481' },
  sheetInput: { height: 48, paddingHorizontal: 16, backgroundColor: '#fffefa', borderWidth: 0.9, borderColor: '#dccfe3', borderRadius: 13, fontFamily: fonts.body, fontSize: 13, color: '#6b6878' },
  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  sheetCancel: { paddingHorizontal: 10, height: 51, justifyContent: 'center' },
  sheetCancelText: { fontFamily: fonts.pixel, fontSize: 13, color: '#9a86a6' },
  sheetSave: { flex: 1 },
});
