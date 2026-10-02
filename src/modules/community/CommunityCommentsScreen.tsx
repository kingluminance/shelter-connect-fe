import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin } from 'lucide-react-native';
import { fonts } from '../../shared/lib/fonts';
import { formatClock, formatRoomTime } from '../../shared/lib/chatTime';
import { formatRelativeTime } from '../../shared/lib/relativeTime';
import { ConnectionErrorView } from '../../shared/ui/ConnectionErrorView';
import { RemoteImage } from '../../shared/ui/RemoteImage';
import { useCommunityComments, useCommunityPost } from './hooks/useCommunityPost';
import { useMediaUrl } from './hooks/useMediaUrl';
import { groupComments, type CommentThread } from './postText';
import { PostMini } from './components/PostMini';
import { ScreenFrame } from './components/ScreenFrame';
import type { CommentKind, CommunityComment, CommunityPost } from './types';
import type { RootStackParamList } from '../../app/navigation';

// Figma "09 댓글·제보" (pencil mUDX1). Read-only — the comment/sighting composer is F-21, and the
// design's "도움이 됐어요" reaction has no backend API.
export function CommunityCommentsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'CommunityComments'>>();
  const { state: postState } = useCommunityPost(params.postId);
  const [kind, setKind] = useState<CommentKind | null>(null);
  const { state, reload, loadMore } = useCommunityComments(params.postId, kind);

  const post = postState.status === 'ready' ? postState.post : null;
  const threads = useMemo(() => (state.status === 'ready' ? groupComments(state.comments) : []), [state]);

  return (
    <ScreenFrame title="댓글·제보">
      {post && <PostMini post={post} onPress={() => navigation.goBack()} />}

      <Text style={styles.heading}>함께 모은 이야기</Text>
      <View style={styles.filters}>
        <FilterPill label={`전체 ${post ? post.commentCount + post.sightingCount : ''}`.trim()} active={kind === null} onPress={() => setKind(null)} />
        {post && post.category !== 'NEIGHBOR_NEWS' && (
          <FilterPill label={`목격 제보 ${post.sightingCount}`} active={kind === 'SIGHTING'} onPress={() => setKind('SIGHTING')} />
        )}
        <FilterPill label={`댓글 ${post ? post.commentCount : ''}`.trim()} active={kind === 'COMMENT'} onPress={() => setKind('COMMENT')} />
      </View>
      <Text style={styles.sort}>등록순</Text>

      {state.status === 'loading' && <ActivityIndicator style={styles.gap} />}
      {state.status === 'error' && <ConnectionErrorView message="댓글을 불러오지 못했어요." onRetry={reload} />}
      {state.status === 'ready' && threads.length === 0 && <Text style={styles.empty}>아직 남겨진 이야기가 없어요.</Text>}

      {threads.map(thread => (
        <ThreadCard key={thread.comment.id} thread={thread} post={post} onShowLocation={() => navigation.navigate('CommunityLocations', { postId: params.postId })} />
      ))}

      {state.status === 'ready' && state.nextCursor && (
        <Pressable style={styles.more} onPress={loadMore}>
          <Text style={styles.moreText}>{state.loadingMore ? '불러오는 중…' : '더 보기'}</Text>
        </Pressable>
      )}
    </ScreenFrame>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.pill, active && styles.pillActive]} onPress={onPress}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ThreadCard({ thread, post, onShowLocation }: { thread: CommentThread; post: CommunityPost | null; onShowLocation: () => void }) {
  const { comment, replies } = thread;
  return (
    <View style={styles.card}>
      <CommentRow comment={comment} post={post} onShowLocation={onShowLocation} />
      {replies.map(reply => (
        <View key={reply.id} style={styles.reply}>
          <CommentRow comment={reply} post={post} onShowLocation={onShowLocation} />
        </View>
      ))}
    </View>
  );
}

function CommentRow({ comment, post, onShowLocation }: { comment: CommunityComment; post: CommunityPost | null; onShowLocation: () => void }) {
  const thumb = useMediaUrl(comment.content?.mediaIds[0]);
  if (comment.deleted || !comment.content) {
    return <Text style={styles.deleted}>삭제된 댓글이에요.</Text>;
  }
  const isAuthor = post !== null && comment.authorId === post.authorId;
  const location = comment.content.location;
  return (
    <View>
      <View style={styles.head}>
        <View style={styles.headCopy}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{comment.authorName ?? '이웃'}</Text>
            {isAuthor && (
              <View style={styles.authorBadge}>
                <Text style={styles.authorBadgeText}>글쓴이</Text>
              </View>
            )}
          </View>
          <Text style={styles.time}>{formatRelativeTime(comment.createdAt)}</Text>
        </View>
        {comment.kind === 'SIGHTING' && (
          <View style={styles.sightingBadge}>
            <Text style={styles.sightingBadgeText}>목격 제보</Text>
          </View>
        )}
      </View>
      <Text style={styles.text}>{comment.content.text}</Text>
      {!!thumb && <RemoteImage url={thumb} width={120} height={90} radius={10} />}
      {location && (
        <Pressable style={styles.location} onPress={onShowLocation}>
          <MapPin size={14} color="#b4a0c4" strokeWidth={1.8} />
          <View style={styles.locationCopy}>
            <Text style={styles.locationLabel} numberOfLines={1}>
              {location.label}
            </Text>
            <Text style={styles.locationTime}>
              {formatRoomTime(location.occurredAt, new Date(), false) === '오늘' ? '오늘' : formatRoomTime(location.occurredAt)} {formatClock(location.occurredAt)}
            </Text>
          </View>
          <Text style={styles.locationLink}>위치 보기</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.pixel, fontSize: 16, lineHeight: 22, color: '#84728f', marginTop: 24, marginLeft: 1 },
  filters: { flexDirection: 'row', gap: 8, marginTop: 15 },
  pill: { height: 33, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: '#fffefb', borderWidth: 1, borderColor: '#e0d5e4', borderRadius: 12 },
  pillActive: { backgroundColor: '#e9dcf2', borderColor: '#c6b0d8' },
  pillText: { fontFamily: fonts.pixel, fontSize: 11, lineHeight: 15, color: '#ae9db9' },
  pillTextActive: { color: '#9679aa' },
  sort: { alignSelf: 'flex-end', fontFamily: fonts.body, fontSize: 10, lineHeight: 14, color: '#a997b4', marginTop: 14, marginBottom: 14 },
  gap: { marginTop: 24 },
  empty: { fontFamily: fonts.body, fontSize: 12, color: '#a1998e', textAlign: 'center', marginTop: 24 },
  card: { marginBottom: 14, padding: 16, gap: 14, backgroundColor: '#fffef9', borderWidth: 1, borderColor: '#e2d8cf', borderRadius: 17, shadowColor: '#4a4659', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  reply: { marginLeft: 26, paddingTop: 14, borderTopWidth: 0.8, borderTopColor: '#efe8ee' },
  head: { flexDirection: 'row', alignItems: 'center' },
  headCopy: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: fonts.pixel, fontSize: 12, lineHeight: 17, color: '#8d7b9b' },
  authorBadge: { height: 24, paddingHorizontal: 8, borderRadius: 9, backgroundColor: '#f0e9f5', justifyContent: 'center' },
  authorBadgeText: { fontFamily: fonts.pixel, fontSize: 8, lineHeight: 12, color: '#a28bab' },
  time: { fontFamily: fonts.body, fontSize: 9, lineHeight: 13, color: '#b5a6b5' },
  sightingBadge: { height: 24, paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#eaf0e3', justifyContent: 'center' },
  sightingBadgeText: { fontFamily: fonts.pixel, fontSize: 9, lineHeight: 13, color: '#8d9e7b' },
  text: { fontFamily: fonts.body, fontSize: 13, lineHeight: 24, color: '#8d8093', marginTop: 12 },
  deleted: { fontFamily: fonts.body, fontSize: 11.5, color: '#b5a6b5' },
  location: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, paddingHorizontal: 14, height: 47, backgroundColor: '#f5f1f8', borderWidth: 1, borderColor: '#ebe2f0', borderRadius: 11 },
  locationCopy: { flex: 1, gap: 2 },
  locationLabel: { fontFamily: fonts.pixel, fontSize: 11, lineHeight: 15, color: '#a08aaa' },
  locationTime: { fontFamily: fonts.body, fontSize: 9, lineHeight: 13, color: '#b5a6bb' },
  locationLink: { fontFamily: fonts.pixel, fontSize: 9, lineHeight: 13, color: '#a58faf' },
  more: { alignSelf: 'center', paddingVertical: 12 },
  moreText: { fontFamily: fonts.body, fontSize: 12, color: '#a99cb2' },
});
