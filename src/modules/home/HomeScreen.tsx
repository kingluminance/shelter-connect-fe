import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useAuthSession } from '../../shared/lib/useAuthSession';
import { fonts } from '../../shared/lib/fonts';
import { supabase } from '../../shared/lib/supabase';
import { HomeSvg } from './components/HomeSvg';
import { ShelterEntranceCard } from './components/ShelterEntranceCard';
import { SavedFriendsSection } from './components/SavedFriendsSection';
import { CommunityPreviewSection } from './components/CommunityPreviewSection';
import type { HomeTabScreenNavigationProp } from '../../app/navigation';

// Figma "01 홈" (node 1:133), 430×932 frame — laid out here as a flex column scaled
// to the real device width rather than copying the frame's absolute coordinates.
// Decorative pieces (clouds, tape, paper border) are plain Views; icons/illustrations
// are the Figma-exported SVG/PNG files in ./assets.
export function HomeScreen() {
  const navigation = useNavigation<HomeTabScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const session = useAuthSession();

  // 내 정보·설정 화면이 아직 없어서: 로그아웃 상태 → 로그인, 로그인 상태 → 로그아웃 확인.
  const onProfilePress = () => {
    if (session.status !== 'signedIn') {
      navigation.navigate('Login');
      return;
    }
    Alert.alert('로그아웃', '로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => supabase?.auth.signOut() },
    ]);
  };

  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#dcf0f5" />
            <Stop offset="0.623" stopColor="#fcf9f0" />
            <Stop offset="1" stopColor="#fcf9f0" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bg)" />
      </Svg>

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 13 }]}>
        <View style={styles.header}>
          <HomeSvg name="pawHeader" width={23} height={23} style={styles.headerPaw} />
          <Text style={styles.wordmark}>PUPPY CONNECT</Text>
          <Pressable onPress={onProfilePress}>
            <HomeSvg name="profileAvatar" width={34} height={34} />
          </Pressable>
        </View>

        <View style={styles.intro}>
          <View style={[styles.cloud, styles.cloudBottom]} />
          <View style={[styles.cloud, styles.cloudLeft]} />
          <View style={[styles.cloud, styles.cloudTop]} />
          <Text style={styles.introTitle}>오늘은 누구를 만날까요?</Text>
          <Text style={styles.introSubtitle}>새로운 만남과 따뜻한 소식이 기다려요.</Text>
          <HomeSvg name="starIntroA" width={10} height={10} style={styles.starA} />
          <HomeSvg name="starIntroB" width={6} height={6} style={styles.starB} />
        </View>

        <ShelterEntranceCard />
        <SavedFriendsSection />
        <CommunityPreviewSection />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', height: 36 },
  headerPaw: { marginTop: 2, marginLeft: 1, marginRight: 11 },
  wordmark: { flex: 1, fontFamily: fonts.pixel, fontSize: 16, lineHeight: 22, color: '#6f86a0' },
  intro: { height: 62, marginTop: 19, marginBottom: 3 },
  introTitle: { fontFamily: fonts.pixel, fontSize: 23, lineHeight: 32, color: '#536675' },
  introSubtitle: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: '#82949c', marginTop: 4, marginLeft: 1 },
  cloud: { position: 'absolute', backgroundColor: '#edf8fa' },
  cloudBottom: { right: 12, top: 5, width: 118, height: 25, borderRadius: 12 },
  cloudLeft: { right: 86, top: -7, width: 33, height: 25, borderRadius: 14 },
  cloudTop: { right: 49, top: -12, width: 44, height: 35, borderRadius: 17 },
  starA: { position: 'absolute', right: 53, top: 33 },
  starB: { position: 'absolute', right: 40, top: 23 },
});
