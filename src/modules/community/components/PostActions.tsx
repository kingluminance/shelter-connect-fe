import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MessageCircle, MoreHorizontal, Users } from 'lucide-react-native';
import { fonts } from '../../../shared/lib/fonts';
import { writeErrorMessage } from '../../../shared/lib/communityErrors';
import { ActionSheet, SheetButton, SheetOption } from '../../../shared/ui/ActionSheet';
import { PuppyButton } from '../../../shared/ui/PuppyButton';
import { deleteCommunityPost, reportCommunityPost, startPostInquiry, updateCommunityPostStatus } from '../api/posts';
import { REPORT_REASONS, reportError, statusChoices, type PostStatusChoice, type ReportReason } from '../composeForm';
import type { CommunityPost } from '../types';
import type { RootStackParamList } from '../../../app/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Sheet = null | 'menu' | 'status' | 'report' | 'delete';

// 더보기 menu (Figma 06/07) and the sheets behind it: 글 상태 변경 (13), 신고 (14), 삭제 확인.
// Mine → 수정 / 상태 변경 / 삭제; someone else's → 신고 / 문의.
export function PostMenu({ post, onChanged }: { post: CommunityPost; onChanged: () => void }) {
  const navigation = useNavigation<Nav>();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<PostStatusChoice['status']>(post.status);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [reported, setReported] = useState(false);

  const open = (next: Sheet) => {
    setError(null);
    setSheet(next);
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(writeErrorMessage(err));
      if ((err as { code?: string }).code === 'VERSION_CONFLICT') onChanged();
    } finally {
      setBusy(false);
    }
  };

  const inquire = async () => {
    setSheet(null);
    await run(async () => {
      const { data } = await startPostInquiry(post.id);
      navigation.navigate('InquiryRoom', { roomId: data.id });
    });
  };

  return (
    <>
      <Pressable style={styles.more} onPress={() => open('menu')} hitSlop={12}>
        <MoreHorizontal size={20} color="#91a8b5" strokeWidth={2} />
      </Pressable>

      <ActionSheet visible={sheet === 'menu'} onClose={() => setSheet(null)}>
        {post.mine ? (
          <>
            <SheetButton
              label="글 수정"
              onPress={() => {
                setSheet(null);
                navigation.navigate('CommunityCompose', { postId: post.id });
              }}
            />
            <SheetButton label="상태 변경" onPress={() => open('status')} />
            <SheetButton label="글 삭제" tone="danger" onPress={() => open('delete')} />
          </>
        ) : (
          <>
            <SheetButton label="작성자에게 문의" onPress={inquire} />
            <SheetButton label={reported ? '신고했어요' : '신고하기'} tone="danger" disabled={reported} onPress={() => open('report')} />
          </>
        )}
        <SheetButton label="닫기" onPress={() => setSheet(null)} />
      </ActionSheet>

      <ActionSheet visible={sheet === 'status'} onClose={() => setSheet(null)} title="글 상태 변경" message="현재 상황을 알려주면 이웃들에게도 도움이 돼요.">
        {statusChoices(post.category).map(choice => (
          <SheetOption key={choice.status} title={choice.title} description={choice.description} selected={status === choice.status} positive={choice.status === 'REUNITED'} onPress={() => setStatus(choice.status)} />
        ))}
        {!!error && <Text style={styles.error}>{error}</Text>}
        <PuppyButton
          label="이 상태로 변경하기"
          tone="green"
          busy={busy}
          disabled={status === post.status}
          onPress={() =>
            run(async () => {
              await updateCommunityPostStatus(post.id, post.version, status);
              setSheet(null);
              onChanged();
            })
          }
        />
        <Pressable onPress={() => setSheet(null)} hitSlop={10}>
          <Text style={styles.later}>나중에 하기</Text>
        </Pressable>
      </ActionSheet>

      <ActionSheet visible={sheet === 'report'} onClose={() => setSheet(null)} title="게시글 신고" message="어떤 문제가 있는지 알려주세요.">
        {REPORT_REASONS.map(option => (
          <SheetOption key={option.reason} title={option.label} selected={reason === option.reason} onPress={() => setReason(option.reason)} />
        ))}
        <View style={styles.detailsHead}>
          <Text style={styles.detailsLabel}>추가 설명</Text>
          <Text style={styles.detailsHint}>{reason === 'OTHER' ? '필수' : '선택'}</Text>
        </View>
        <TextInput style={styles.details} value={details} onChangeText={setDetails} placeholder="확인에 도움이 될 내용을 적어주세요." placeholderTextColor="#c0adc6" multiline maxLength={1000} textAlignVertical="top" />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.footnote}>신고한 사람의 정보는 글쓴이에게 공개되지 않아요.</Text>
        <PuppyButton
          label="신고 보내기"
          busy={busy}
          onPress={() => {
            const problem = reportError(reason, details);
            if (problem) return setError(problem);
            run(async () => {
              await reportCommunityPost(post.id, reason as ReportReason, details);
              setReported(true);
              setSheet(null);
            });
          }}
        />
      </ActionSheet>

      <ActionSheet visible={sheet === 'delete'} onClose={() => setSheet(null)} title="글을 삭제할까요?" message="삭제한 글은 되돌릴 수 없어요.">
        {!!error && <Text style={styles.error}>{error}</Text>}
        <SheetButton
          label={busy ? '삭제 중…' : '삭제하기'}
          tone="danger"
          disabled={busy}
          onPress={() =>
            run(async () => {
              await deleteCommunityPost(post.id, post.version);
              setSheet(null);
              navigation.goBack();
            })
          }
        />
        <SheetButton label="취소" onPress={() => setSheet(null)} />
      </ActionSheet>
    </>
  );
}

/** Bottom of the detail: 목격 제보하기 (not for 동네 소식) and 작성자에게 문의 (not my own post). */
export function PostBottomActions({ post }: { post: CommunityPost }) {
  const navigation = useNavigation<Nav>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canReport = post.category !== 'NEIGHBOR_NEWS' && post.status === 'ACTIVE';

  const inquire = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await startPostInquiry(post.id);
      navigation.navigate('InquiryRoom', { roomId: data.id });
    } catch (err) {
      setError(writeErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!canReport && post.mine) return null;
  return (
    <View style={styles.bottom}>
      <View style={styles.bottomRow}>
        {canReport && (
          <Pressable style={[styles.bottomButton, styles.bottomPrimary]} onPress={() => navigation.navigate('SightingCompose', { postId: post.id })}>
            <Users size={15} color="#89709b" strokeWidth={1.9} />
            <Text style={[styles.bottomText, styles.bottomTextPrimary]}>목격 제보하기</Text>
          </Pressable>
        )}
        {!post.mine && (
          <Pressable style={[styles.bottomButton, busy && styles.disabled]} onPress={inquire} disabled={busy}>
            <MessageCircle size={15} color="#98859e" strokeWidth={1.9} />
            <Text style={styles.bottomText}>작성자에게 문의</Text>
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  more: { width: 34, height: 34, alignItems: 'flex-end', justifyContent: 'center' },
  later: { fontFamily: fonts.pixel, fontSize: 11, color: '#ae9ab9', textAlign: 'center', marginTop: 4 },
  detailsHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 },
  detailsLabel: { fontFamily: fonts.pixel, fontSize: 12, color: '#a58ab1' },
  detailsHint: { fontFamily: fonts.body, fontSize: 10, color: '#bba9c2' },
  footnote: { fontFamily: fonts.body, fontSize: 10, color: '#b29cba', textAlign: 'center' },
  error: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: '#c0526b', textAlign: 'center' },
  details: { height: 74, paddingHorizontal: 14, paddingTop: 12, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#dfd1e3', borderRadius: 12, fontFamily: fonts.body, fontSize: 12, color: '#6b6878' },
  bottom: { marginTop: 26, gap: 10 },
  bottomRow: { flexDirection: 'row', gap: 12 },
  bottomButton: { flex: 1, height: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ddd2e3', borderRadius: 14 },
  bottomPrimary: { backgroundColor: '#e5d9f0', borderColor: '#cdbbdb' },
  bottomText: { fontFamily: fonts.pixel, fontSize: 12, color: '#98859e' },
  bottomTextPrimary: { color: '#89709b' },
  disabled: { opacity: 0.55 },
});
