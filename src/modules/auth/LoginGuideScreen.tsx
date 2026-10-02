import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, X } from 'lucide-react-native';
import { supabase } from '../../shared/lib/supabase';
import { fonts } from '../../shared/lib/fonts';
import { AuthPrimaryButton, AuthSecondaryButton } from './components/AuthButtons';
import type { RootStackParamList } from '../../app/navigation';

// Figma "17 로그인 안내" (43:26156) as a bottom sheet over whatever screen asked for login;
// "19 로그인 만료" reuses it with the expiry copy (that frame couldn't be fetched — Figma MCP
// quota — so it follows 17's layout until its own design is checked).
export function LoginGuideScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'LoginGuide'>>();
  const insets = useSafeAreaInsets();
  const expired = params?.reason === 'expired';

  // replace → 로그인 성공 뒤 leaveAuthFlow가 안내 화면째 걷어내고 원래 화면으로 돌아간다.
  const goLogin = async () => {
    if (expired) {
      await supabase?.auth.signOut();
    }
    navigation.replace('Login');
  };

  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => navigation.goBack()} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        <Pressable style={styles.close} onPress={() => navigation.goBack()} hitSlop={10}>
          <X size={16} color="#b6a3c4" strokeWidth={2} />
        </Pressable>

        <View style={styles.iconCircle}>
          <MessageSquare size={24} color="#a286b5" strokeWidth={1.7} />
        </View>
        <Text style={styles.title}>{expired ? '로그인이 만료됐어요' : '로그인하고 이야기를 나눠요'}</Text>
        <Text style={styles.body}>
          {expired ? '안전을 위해 로그아웃됐어요.\n다시 로그인해 주세요.' : '강아지와 대화하거나 커뮤니티를 이용하려면\n로그인이 필요해요.'}
        </Text>

        <View style={styles.actions}>
          <AuthPrimaryButton
            label={expired ? '다시 로그인하기' : '로그인하고 계속하기'}
            onPress={goLogin}
            icon={<MessageSquare size={15} color="#a38bb4" strokeWidth={1.8} />}
          />
          {!expired && <AuthSecondaryButton label="처음이라면 회원가입" onPress={() => navigation.replace('SignUp')} />}
        </View>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.later}>지금은 둘러볼게요</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(56,64,69,0.35)' },
  sheet: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 13,
    backgroundColor: '#fcfaf4',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 0.8,
    borderColor: '#e6dce2',
  },
  handle: { width: 48, height: 4, borderRadius: 2, backgroundColor: '#d8ccd9' },
  close: { position: 'absolute', right: 24, top: 25 },
  iconCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#ede2f3', alignItems: 'center', justifyContent: 'center', marginTop: 31 },
  title: { fontFamily: fonts.pixel, fontSize: 21, lineHeight: 29, color: '#877393', marginTop: 20 },
  body: { fontFamily: fonts.body, fontSize: 12, lineHeight: 24, color: '#a092a9', textAlign: 'center', marginTop: 9 },
  actions: { alignSelf: 'stretch', gap: 17, marginTop: 28 },
  later: { fontFamily: fonts.pixel, fontSize: 12, lineHeight: 17, color: '#a8aa98', marginTop: 26 },
});
