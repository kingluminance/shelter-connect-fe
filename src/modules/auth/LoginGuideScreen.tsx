import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock, MessageSquare, X } from 'lucide-react-native';
import { supabase } from '../../shared/lib/supabase';
import { fonts } from '../../shared/lib/fonts';
import { AuthPrimaryButton, AuthSecondaryButton } from './components/AuthButtons';
import type { RootStackParamList } from '../../app/navigation';

// Figma "17 로그인 안내" (pencil aKiGl) as a bottom sheet over whatever screen asked for login;
// "19 로그인 만료" (pencil UIF8O) is the same sheet with the expiry copy, a "retained content"
// note, and a 보호소 둘러보기 secondary button.
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

        <View style={[styles.iconCircle, expired && styles.iconCircleExpired]}>
          {expired ? <Lock size={26} color="#a286b5" strokeWidth={1.7} /> : <MessageSquare size={24} color="#a286b5" strokeWidth={1.7} />}
          {expired && <View style={styles.expiredDot} />}
        </View>
        <Text style={[styles.title, expired && styles.titleExpired]}>{expired ? '다시 로그인해 주세요' : '로그인하고 이야기를 나눠요'}</Text>
        <Text style={styles.body}>
          {expired ? '로그인 시간이 만료되어\n대화를 이어가려면 다시 로그인이 필요해요.' : '강아지와 대화하거나 커뮤니티를 이용하려면\n로그인이 필요해요.'}
        </Text>

        {expired && (
          <View style={styles.retained}>
            <MessageSquare size={14} color="#a5b28f" strokeWidth={1.8} />
            <Text style={styles.retainedText}>로그인 후 하던 대화로 돌아올 수 있어요.</Text>
          </View>
        )}

        <View style={styles.actions}>
          <AuthPrimaryButton
            label={expired ? '다시 로그인' : '로그인하고 계속하기'}
            onPress={goLogin}
            icon={expired ? undefined : <MessageSquare size={15} color="#a38bb4" strokeWidth={1.8} />}
          />
          {expired ? (
            <AuthSecondaryButton label="보호소 둘러보기" onPress={() => navigation.navigate('Home')} />
          ) : (
            <AuthSecondaryButton label="처음이라면 회원가입" onPress={() => navigation.replace('SignUp')} />
          )}
        </View>
        {expired ? (
          <Text style={styles.footnote}>보호소는 로그인 없이도 둘러볼 수 있어요.</Text>
        ) : (
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={styles.later}>지금은 둘러볼게요</Text>
          </Pressable>
        )}
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
  iconCircleExpired: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eee4f4' },
  expiredDot: { position: 'absolute', right: 14, bottom: 14, width: 11, height: 11, borderRadius: 6, backgroundColor: '#f6e7e5', borderWidth: 1, borderColor: '#bc8d9a' },
  titleExpired: { fontSize: 22, color: '#85718f' },
  retained: { alignSelf: 'stretch', height: 44, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, marginTop: 20, backgroundColor: '#f0f3e8', borderRadius: 12 },
  retainedText: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: '#92a17f' },
  footnote: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 15, color: '#a7a79b', marginTop: 22 },
  later: { fontFamily: fonts.pixel, fontSize: 12, lineHeight: 17, color: '#a8aa98', marginTop: 26 },
});
