import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera, Check, MapPin, MessageCircleHeart } from 'lucide-react-native';
import { fonts } from '../../shared/lib/fonts';
import { generateClientMessageId } from '../../shared/lib/clientId';
import { getCurrentCoords } from '../../shared/lib/deviceLocation';
import { pickPhotos, uploadCommunityPhoto } from '../../shared/lib/photoUpload';
import { writeErrorMessage } from '../../shared/lib/communityErrors';
import { PermissionSheet } from '../../shared/ui/ActionSheet';
import { PuppyButton } from '../../shared/ui/PuppyButton';
import { createCommunityComment } from './api/posts';
import { DateTimeFields } from './components/DateTimeField';
import { FieldLabel, inputStyles } from './components/FormBits';
import { PostMini } from './components/PostMini';
import { useCommunityPost } from './hooks/useCommunityPost';
import { PhotoStrip } from './components/PhotoStrip';
import { ScreenFrame } from './components/ScreenFrame';
import { buildSightingBody, emptySighting, SIGHTING_TEXT_MAX, sightingError, type SightingForm } from './composeForm';
import type { RootStackParamList } from '../../app/navigation';

// Figma "10 목격 제보 작성" (pencil Eb8Y4): where/when it was seen, one photo, what it looked like.
// A closed post answers 409 SIGHTINGS_CLOSED, shown through writeErrorMessage.
export function SightingComposeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'SightingCompose'>>();
  const { state: postState } = useCommunityPost(params.postId);
  const [form, setForm] = useState<SightingForm>(emptySighting);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [photoDenied, setPhotoDenied] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const requestId = useRef(generateClientMessageId());
  const patch = (next: Partial<SightingForm>) => setForm(prev => ({ ...prev, ...next }));

  const submit = async () => {
    const problem = sightingError(form);
    if (problem) return setError(problem);
    setError(null);
    setBusy(true);
    try {
      await createCommunityComment(params.postId, buildSightingBody(form, requestId.current));
      navigation.replace('CommunityComments', { postId: params.postId });
    } catch (err) {
      setError(writeErrorMessage(err));
      if ((err as { code?: string }).code !== 'NETWORK_ERROR') requestId.current = generateClientMessageId();
    } finally {
      setBusy(false);
    }
  };

  const addPhoto = async () => {
    setPhotoDenied(false);
    const picked = await pickPhotos(1);
    if (picked.status === 'denied') return setPhotoDenied(true);
    if (picked.status === 'error') return setError(picked.message);
    if (picked.status !== 'picked') return;
    setUploading(true);
    try {
      const photo = picked.photos[0];
      patch({ photo: { mediaId: await uploadCommunityPhoto(photo), uri: photo.uri } });
    } catch (err) {
      setError(writeErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const locateHere = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentCoords();
      patch({ latitude: coords.latitude, longitude: coords.longitude, placeLabel: form.placeLabel || '현재 위치 근처' });
    } catch (failure) {
      if (failure === 'DENIED') setLocationDenied(true);
      else setError('현재 위치를 가져오지 못했어요. 장소 이름을 직접 입력해 주세요.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <ScreenFrame title="목격 제보하기">
      {postState.status === 'ready' && <PostMini post={postState.post} />}
      <Text style={styles.headline}>작은 단서도 큰 도움이 돼요.</Text>

      <FieldLabel large text="어디에서 봤나요?" />
      <View style={styles.placeBox}>
        <MapPin size={15} color="#ab96b8" strokeWidth={1.8} />
        <TextInput style={styles.placeInput} value={form.placeLabel} onChangeText={placeLabel => patch({ placeLabel })} placeholder="예: 춘천시 석사동 산책길 입구" placeholderTextColor="#b0a5af" maxLength={200} />
        <Pressable style={styles.placeButton} onPress={locateHere} disabled={locating}>
          {locating ? <ActivityIndicator size="small" color="#a38aac" /> : <Text style={styles.placeButtonText}>{form.latitude !== null ? '현재 위치 ✓' : '현재 위치'}</Text>}
        </Pressable>
      </View>

      <FieldLabel large text="언제 봤나요?" />
      <DateTimeFields value={form.occurredAt} onChange={occurredAt => patch({ occurredAt })} />

      <FieldLabel large text="사진" hint="있다면 함께 올려주세요" />
      <View style={styles.photoRow}>
        <View style={styles.photoStrip}>
          <PhotoStrip photos={form.photo ? [form.photo] : []} max={1} uploading={uploading} onAdd={addPhoto} onRemove={() => patch({ photo: null })} />
        </View>
        <View style={styles.photoCopy}>
          <Text style={styles.photoTip}>멀리서 찍은 사진도 괜찮아요.</Text>
          <Text style={styles.photoTipSub}>털색과 얼굴이 보이면 도움이 돼요.</Text>
        </View>
      </View>

      <FieldLabel large text="어떤 모습이었나요?" counter={`${form.text.length} / ${SIGHTING_TEXT_MAX}`} />
      <TextInput style={[inputStyles.input, inputStyles.area, styles.area]} value={form.text} onChangeText={text => patch({ text })} placeholder="방향, 목줄, 행동 등을 알려 주세요" placeholderTextColor="#b0a5af" multiline textAlignVertical="top" maxLength={SIGHTING_TEXT_MAX} />

      <View style={styles.note}>
        <MessageCircleHeart size={14} color="#af9dbc" strokeWidth={1.7} />
        <Text style={styles.noteText}>제보 내용은 이 글의 댓글·제보에 함께 보여요.</Text>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.submit}>
        <PuppyButton label="목격 제보 남기기" icon={<Check size={16} color="#887099" strokeWidth={2} />} onPress={submit} busy={busy} disabled={uploading} />
      </View>

      <PermissionSheet
        visible={photoDenied}
        icon={<Camera size={26} color="#a48db7" strokeWidth={1.7} />}
        title="사진 접근이 꺼져 있어요"
        message={'사진을 다시 선택하거나\n기기 설정에서 사진 접근을 허용해 주세요.'}
        note="작성 중인 제보는 그대로 유지돼요."
        primaryLabel="사진 다시 선택"
        onPrimary={addPhoto}
        linkLabel="작성 중인 제보로 돌아가기"
        onLink={() => setPhotoDenied(false)}
        onClose={() => setPhotoDenied(false)}
      />
      <PermissionSheet
        visible={locationDenied}
        icon={<MapPin size={26} color="#a48db7" strokeWidth={1.7} />}
        title="위치 접근이 꺼져 있어요"
        message={'현재 위치를 남기려면 설정에서 위치 접근을 허용해 주세요.\n장소 이름을 직접 입력해도 돼요.'}
        note="작성 중인 제보는 그대로 유지돼요."
        primaryLabel="장소 직접 입력"
        onPrimary={() => setLocationDenied(false)}
        onClose={() => setLocationDenied(false)}
      />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  headline: { fontFamily: fonts.pixel, fontSize: 14, lineHeight: 20, color: '#927e9f', marginTop: 20, marginLeft: 1 },
  placeBox: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 11, paddingLeft: 16, paddingRight: 9, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#dfd6d1', borderRadius: 12 },
  placeInput: { flex: 1, padding: 0, fontFamily: fonts.body, fontSize: 12, color: '#948497' },
  placeButton: { minWidth: 63, height: 24, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1eaf5', borderRadius: 9 },
  placeButtonText: { fontFamily: fonts.pixel, fontSize: 9, color: '#a38aac' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  photoStrip: { flexShrink: 0 },
  photoCopy: { flex: 1, gap: 6 },
  photoTip: { fontFamily: fonts.body, fontSize: 11, color: '#aa97b1' },
  photoTipSub: { fontFamily: fonts.body, fontSize: 10.5, color: '#b8a8bb' },
  area: { height: 106 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 18, marginLeft: 1 },
  noteText: { fontFamily: fonts.body, fontSize: 10, color: '#b09db7' },
  error: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: '#c0526b', marginTop: 16 },
  submit: { marginTop: 24 },
});
