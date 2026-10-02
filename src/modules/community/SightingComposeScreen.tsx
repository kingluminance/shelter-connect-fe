import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LocateFixed } from 'lucide-react-native';
import { fonts } from '../../shared/lib/fonts';
import { generateClientMessageId } from '../../shared/lib/clientId';
import { getCurrentCoords } from '../../shared/lib/deviceLocation';
import { pickPhotos, uploadCommunityPhoto } from '../../shared/lib/photoUpload';
import { writeErrorMessage } from '../../shared/lib/communityErrors';
import { PermissionSheet } from '../../shared/ui/ActionSheet';
import { createCommunityComment } from './api/posts';
import { DateTimeField } from './components/DateTimeField';
import { PhotoStrip } from './components/PhotoStrip';
import { ScreenFrame } from './components/ScreenFrame';
import { buildSightingBody, emptySighting, SIGHTING_TEXT_MAX, sightingError, type SightingForm } from './composeForm';
import type { RootStackParamList } from '../../app/navigation';

// Figma "10 목격 제보 작성" (pencil Eb8Y4): where/when it was seen, one photo, what it looked like.
// A closed post answers 409 SIGHTINGS_CLOSED, shown through writeErrorMessage.
export function SightingComposeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'SightingCompose'>>();
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

  const locate = async () => {
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
    <ScreenFrame title="목격 제보">
      <Label text="어디에서 봤나요?" />
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.flex]} value={form.placeLabel} onChangeText={placeLabel => patch({ placeLabel })} placeholder="예: 후평동 편의점 앞" placeholderTextColor="#b0a2b7" maxLength={200} />
        <Pressable style={styles.locate} onPress={locate} disabled={locating}>
          {locating ? <ActivityIndicator color="#a58faf" /> : <LocateFixed size={18} color={form.latitude !== null ? '#9679aa' : '#b9a9c2'} strokeWidth={1.8} />}
        </Pressable>
      </View>

      <Label text="언제 봤나요?" />
      <DateTimeField value={form.occurredAt} onChange={occurredAt => patch({ occurredAt })} placeholder="날짜·시간을 골라 주세요" />

      <Label text="사진 (선택)" />
      <PhotoStrip photos={form.photo ? [form.photo] : []} max={1} uploading={uploading} onAdd={addPhoto} onRemove={() => patch({ photo: null })} />

      <Label text="어떤 모습이었나요?" counter={`${form.text.length}/${SIGHTING_TEXT_MAX}`} />
      <TextInput style={[styles.input, styles.textArea]} value={form.text} onChangeText={text => patch({ text })} placeholder="방향, 목줄, 행동 등을 알려 주세요" placeholderTextColor="#b0a2b7" multiline textAlignVertical="top" maxLength={SIGHTING_TEXT_MAX} />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.submit, (busy || uploading) && styles.disabled]} onPress={submit} disabled={busy || uploading}>
        {busy ? <ActivityIndicator color="#89709b" /> : <Text style={styles.submitText}>제보하기</Text>}
      </Pressable>

      <PermissionSheet
        visible={photoDenied}
        title="사진 접근이 꺼져 있어요"
        message={'사진을 올리려면 설정에서 사진 접근을 허용해 주세요.\n작성 중인 내용은 그대로 남아 있어요.'}
        retryLabel="사진 다시 선택"
        onRetry={addPhoto}
        alternativeLabel="작성 중인 글로 돌아가기"
        onAlternative={() => setPhotoDenied(false)}
        onClose={() => setPhotoDenied(false)}
      />
      <PermissionSheet
        visible={locationDenied}
        title="위치 접근이 꺼져 있어요"
        message={'현재 위치를 남기려면 설정에서 위치 접근을 허용해 주세요.\n장소 이름을 직접 입력해도 돼요.'}
        alternativeLabel="장소 직접 입력"
        onAlternative={() => setLocationDenied(false)}
        onClose={() => setLocationDenied(false)}
      />
    </ScreenFrame>
  );
}

function Label({ text, counter }: { text: string; counter?: string }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{text}</Text>
      {!!counter && <Text style={styles.counter}>{counter}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 9 },
  label: { fontFamily: fonts.pixel, fontSize: 13, lineHeight: 18, color: '#7b7187' },
  counter: { fontFamily: fonts.body, fontSize: 10, color: '#b0a2b7' },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  input: { height: 48, paddingHorizontal: 16, backgroundColor: '#fffefa', borderWidth: 0.9, borderColor: '#e0d6e6', borderRadius: 13, fontFamily: fonts.body, fontSize: 13, color: '#6b6878' },
  locate: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffefa', borderWidth: 0.9, borderColor: '#e0d6e6', borderRadius: 13 },
  textArea: { height: 120, paddingTop: 14, lineHeight: 20 },
  error: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: '#c0526b', marginTop: 16 },
  submit: { height: 51, marginTop: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5d9f0', borderWidth: 1, borderColor: '#cdbbdb', borderRadius: 14 },
  submitText: { fontFamily: fonts.pixel, fontSize: 13, color: '#89709b' },
  disabled: { opacity: 0.55 },
});
