import { useMemo } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, MapPin } from 'lucide-react-native';
import { fonts } from '../../shared/lib/fonts';
import { formatClock, formatRoomTime } from '../../shared/lib/chatTime';
import { copyAddress, openInMaps } from '../../shared/lib/mapLinks';
import { ConnectionErrorView } from '../../shared/ui/ConnectionErrorView';
import { useCommunityComments, useCommunityPost } from './hooks/useCommunityPost';
import { PostMini } from './components/PostMini';
import { ScreenFrame } from './components/ScreenFrame';
import type { CommunityPostLocation } from './types';
import type { RootStackParamList } from '../../app/navigation';

interface Spot {
  key: string;
  title: string;
  location: CommunityPostLocation;
  caption: string;
}

function whenLabel(iso: string): string {
  const day = formatRoomTime(iso, new Date(), false) === '오늘' ? '오늘' : formatRoomTime(iso);
  return `${day} ${formatClock(iso)}`;
}

// Figma "12 목격 위치" (pencil A5iSP7) without the map — the in-app map is out of scope for now,
// so each place is a card with 주소 복사 / 지도 앱으로 보기 (the design's own bottom actions).
export function CommunityLocationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'CommunityLocations'>>();
  const { state: postState, reload } = useCommunityPost(params.postId);
  const { state: sightings } = useCommunityComments(params.postId, 'SIGHTING');

  const spots = useMemo<Spot[]>(() => {
    if (postState.status !== 'ready') {
      return [];
    }
    const { post } = postState;
    const list: Spot[] = [];
    if (post.content.location) {
      const first = post.category === 'LOST' ? '마지막 목격' : post.category === 'FOUND' ? '발견한 곳' : '장소';
      list.push({ key: 'post', title: first, location: post.content.location, caption: `${whenLabel(post.content.location.occurredAt)} · ${post.authorName}` });
    }
    if (sightings.status === 'ready') {
      for (const comment of sightings.comments) {
        if (comment.content?.location && !comment.deleted) {
          list.push({
            key: comment.id,
            title: '제보',
            location: comment.content.location,
            caption: `${whenLabel(comment.content.location.occurredAt)} · ${comment.authorName ?? '이웃'}의 제보`,
          });
        }
      }
    }
    return list;
  }, [postState, sightings]);

  return (
    <ScreenFrame title="목격 위치">
      {postState.status === 'loading' && <ActivityIndicator style={styles.gap} />}
      {postState.status === 'error' && <ConnectionErrorView message="게시글을 불러오지 못했어요." onRetry={reload} onBack={() => navigation.goBack()} />}
      {postState.status === 'ready' && (
        <>
          <PostMini post={postState.post} onPress={() => navigation.goBack()} />
          <Text style={styles.lead}>남겨준 단서를 함께 살펴봐요.</Text>
          {spots.length === 0 && <Text style={styles.empty}>아직 남겨진 위치가 없어요.</Text>}
          {spots.map(spot => (
            <View key={spot.key} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.pin}>
                  <MapPin size={15} color="#aa90b7" strokeWidth={1.8} />
                </View>
                <View style={styles.cardCopy}>
                  <View style={styles.kind}>
                    <Text style={styles.kindText}>{spot.title}</Text>
                  </View>
                  <Text style={styles.place}>{spot.location.label}</Text>
                  <Text style={styles.caption}>{spot.caption}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.actions}>
                <Pressable
                  style={styles.action}
                  onPress={() => {
                    copyAddress(spot.location.label);
                    Alert.alert('복사했어요', spot.location.label);
                  }}
                >
                  <Text style={styles.actionText}>주소 복사</Text>
                </Pressable>
                <Pressable style={styles.action} onPress={() => openInMaps(spot.location).catch(() => Alert.alert('지도 앱을 열 수 없어요'))}>
                  <Text style={[styles.actionText, styles.actionPrimary]}>지도 앱으로 보기</Text>
                  <ChevronRight size={13} color="#9e86ad" strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: 24 },
  lead: { fontFamily: fonts.pixel, fontSize: 14, lineHeight: 20, color: '#9780a5', marginTop: 20, marginBottom: 16, marginLeft: 1 },
  empty: { fontFamily: fonts.body, fontSize: 12, color: '#a1998e', textAlign: 'center', marginTop: 24 },
  card: { marginBottom: 14, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#e1d6d1', borderRadius: 16, paddingTop: 18, shadowColor: '#4a4659', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  cardHead: { flexDirection: 'row', gap: 12, paddingHorizontal: 17 },
  pin: { width: 31, height: 31, borderRadius: 16, backgroundColor: '#f1e9f5', alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1, gap: 6 },
  kind: { alignSelf: 'flex-start', height: 20, paddingHorizontal: 9, borderRadius: 8, backgroundColor: '#f0e9f5', justifyContent: 'center' },
  kindText: { fontFamily: fonts.pixel, fontSize: 8.5, lineHeight: 12, color: '#a28bab' },
  place: { fontFamily: fonts.pixel, fontSize: 14, lineHeight: 20, color: '#8e7b9b' },
  caption: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: '#af9cb5' },
  divider: { height: 0.8, backgroundColor: '#ece4e8', marginHorizontal: 17, marginTop: 16 },
  actions: { flexDirection: 'row', height: 44 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  actionText: { fontFamily: fonts.pixel, fontSize: 11, lineHeight: 15, color: '#ad98b7' },
  actionPrimary: { color: '#9e86ad' },
});
