import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LocateFixed, MapPin, Plus, X } from 'lucide-react-native';
import { fonts } from '../../shared/lib/fonts';
import { generateClientMessageId } from '../../shared/lib/clientId';
import { getCurrentCoords } from '../../shared/lib/deviceLocation';
import { pickPhotos, uploadCommunityPhoto } from '../../shared/lib/photoUpload';
import { writeErrorMessage } from '../../shared/lib/communityErrors';
import { ActionSheet, PermissionSheet, SheetButton } from '../../shared/ui/ActionSheet';
import { ConnectionErrorView } from '../../shared/ui/ConnectionErrorView';
import { createCommunityPost, fetchCommunityPost, fetchMyDrafts, publishCommunityPost, updateCommunityPost } from './api/posts';
import { useCommunityRegion } from './hooks/useCommunityRegion';
import { DateTimeField } from './components/DateTimeField';
import { PhotoStrip } from './components/PhotoStrip';
import { ScreenFrame } from './components/ScreenFrame';
import {
  buildCreateBody,
  buildUpdateBody,
  cleanFeatures,
  emptyForm,
  formFromPost,
  FEATURE_MAX,
  FEATURES_MAX,
  hasContent,
  needsPlace,
  PHOTOS_MAX,
  publishError,
  TEXT_MAX,
  TITLE_MAX,
  type ComposeForm,
} from './composeForm';
import { CATEGORY_LABEL } from './postText';
import type { CommunityCategory, CommunityPost } from './types';
import type { RootStackParamList } from '../../app/navigation';

const CATEGORIES: CommunityCategory[] = ['LOST', 'FOUND', 'NEIGHBOR_NEWS'];

// Figma "08 글쓰기" (pencil HknIP 찾기 / GwUpO 발견 / eGRkK 동네 소식) + 22 사진 권한 시트.
// Create, continue a draft, or edit a published post (category is fixed once published).
export function CommunityComposeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'CommunityCompose'>>();
  const { state: regionState } = useCommunityRegion();
  const myRegion = regionState.status === 'ready' ? regionState.regionLabel : null;

  const [form, setForm] = useState<ComposeForm>(() => emptyForm(params?.category ?? 'LOST'));
  const [existing, setExisting] = useState<CommunityPost | null>(null); // draft being continued or post being edited
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>(params?.postId ? 'loading' : 'ready');
  const [offerDraft, setOfferDraft] = useState<CommunityPost | null>(null);
  const [featureDraft, setFeatureDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'draft' | 'publish' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [photoDenied, setPhotoDenied] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);
  const dirty = useRef(false);
  const leaving = useRef(false);
  // One id per screen entry so a retried create is idempotent; regenerated when a failed attempt
  // may have been rejected for its content (same id + different body = REQUEST_ID_CONFLICT).
  const requestId = useRef(generateClientMessageId());

  const editingPublished = existing?.publication === 'PUBLISHED';

  const update = useCallback((patch: Partial<ComposeForm>) => {
    dirty.current = true;
    setForm(prev => ({ ...prev, ...patch }));
  }, []);

  // Edit / continue a draft by id.
  useEffect(() => {
    if (!params?.postId) return;
    fetchCommunityPost(params.postId).then(
      ({ data }) => {
        setExisting(data);
        setForm(formFromPost(data));
        setLoad('ready');
      },
      () => setLoad('error'),
    );
  }, [params?.postId]);

  // New post → offer to continue the latest draft (the design has no draft list).
  useEffect(() => {
    if (params?.postId) return;
    fetchMyDrafts().then(
      page => setOfferDraft(page.data[0] ?? null),
      () => undefined,
    );
  }, [params?.postId]);

  // Leaving with unsaved input asks first.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', event => {
        if (leaving.current || !dirty.current || !hasContent(form)) return;
        event.preventDefault();
        setLeaveAction(() => () => navigation.dispatch(event.data.action));
      }),
    [navigation, form],
  );

  const leave = (action: () => void) => {
    leaving.current = true;
    action();
  };

  const fail = (err: unknown) => {
    setError(writeErrorMessage(err));
    if ((err as { code?: string }).code !== 'NETWORK_ERROR') requestId.current = generateClientMessageId();
  };

  /** Save as draft (create or PATCH), or register (create PUBLISHED / PATCH [+ publish]). */
  const submit = async (mode: 'draft' | 'publish') => {
    setError(null);
    setNotice(null);
    if (mode === 'publish') {
      const problem = publishError(form, myRegion);
      if (problem) {
        setError(problem);
        return;
      }
    } else if (!hasContent(form)) {
      setError('임시저장할 내용이 없어요.');
      return;
    }
    setBusy(mode);
    try {
      let post: CommunityPost;
      if (existing) {
        post = (await updateCommunityPost(existing.id, buildUpdateBody(form, existing.version, myRegion))).data;
        if (mode === 'publish' && post.publication === 'DRAFT') {
          post = (await publishCommunityPost(post.id, post.version)).data;
        }
      } else {
        post = (await createCommunityPost(buildCreateBody(form, mode === 'publish' ? 'PUBLISHED' : 'DRAFT', requestId.current, myRegion))).data;
      }
      dirty.current = false;
      if (mode === 'publish') {
        leave(() => navigation.replace('CommunityPost', { postId: post.id }));
      } else {
        setExisting(post);
        setNotice('임시저장했어요.');
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const addPhotos = async () => {
    setPhotoDenied(false);
    const picked = await pickPhotos(PHOTOS_MAX - form.photos.length);
    if (picked.status === 'denied') return setPhotoDenied(true);
    if (picked.status === 'error') return setError(picked.message);
    if (picked.status !== 'picked') return;
    setUploading(true);
    setError(null);
    try {
      const added = [];
      for (const photo of picked.photos) {
        added.push({ mediaId: await uploadCommunityPhoto(photo), uri: photo.uri });
      }
      update({ photos: [...form.photos, ...added].slice(0, PHOTOS_MAX) });
    } catch (err) {
      setError(writeErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentCoords();
      update({ latitude: coords.latitude, longitude: coords.longitude, placeLabel: form.placeLabel || '현재 위치 근처' });
    } catch (failure) {
      if (failure === 'DENIED') setLocationDenied(true);
      else setError('현재 위치를 가져오지 못했어요. 장소 이름을 직접 입력해 주세요.');
    } finally {
      setLocating(false);
    }
  };

  const addFeature = () => {
    const next = cleanFeatures([...form.features, featureDraft]);
    setFeatureDraft('');
    if (next.length !== form.features.length) update({ features: next });
  };

  const continueDraft = (draft: CommunityPost) => {
    setExisting(draft);
    setForm(formFromPost(draft));
    setOfferDraft(null);
    dirty.current = false;
  };

  const place = form.category === 'LOST' ? '마지막으로 본 곳' : '발견한 곳';
  const when = form.category === 'LOST' ? '마지막으로 본 날짜·시간' : '발견한 날짜·시간';

  return (
    <ScreenFrame title={editingPublished ? '글 수정' : '글쓰기'}>
      {load === 'loading' && <ActivityIndicator style={styles.gap} />}
      {load === 'error' && <ConnectionErrorView message="글을 불러오지 못했어요." onRetry={() => navigation.replace('CommunityCompose', params)} onBack={() => navigation.goBack()} />}
      {load === 'ready' && (
        <View>
          {offerDraft && (
            <View style={styles.draftBanner}>
              <Text style={styles.draftText} numberOfLines={1}>
                임시저장한 글이 있어요 · {offerDraft.content.title || '제목 없음'}
              </Text>
              <Pressable onPress={() => continueDraft(offerDraft)} hitSlop={8}>
                <Text style={styles.draftAction}>불러오기</Text>
              </Pressable>
              <Pressable onPress={() => setOfferDraft(null)} hitSlop={8}>
                <X size={14} color="#a99cb2" strokeWidth={2} />
              </Pressable>
            </View>
          )}

          <View style={styles.tabs}>
            {CATEGORIES.map(category => {
              const active = form.category === category;
              return (
                <Pressable key={category} style={[styles.tab, active && styles.tabActive]} onPress={() => update({ category })} disabled={editingPublished && !active}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{CATEGORY_LABEL[category]}</Text>
                </Pressable>
              );
            })}
          </View>

          <Label text={`사진 (${form.photos.length}/${PHOTOS_MAX})`} />
          <PhotoStrip photos={form.photos} max={PHOTOS_MAX} uploading={uploading} onAdd={addPhotos} onRemove={id => update({ photos: form.photos.filter(p => p.mediaId !== id) })} />

          <Label text="제목" counter={`${form.title.length}/${TITLE_MAX}`} />
          <TextInput style={styles.input} value={form.title} onChangeText={title => update({ title })} placeholder="예: 흰색 푸들을 찾고 있어요" placeholderTextColor="#b0a2b7" maxLength={TITLE_MAX} />

          {needsPlace(form.category) ? (
            <>
              <Label text={place} />
              <View style={styles.placeRow}>
                <TextInput style={[styles.input, styles.placeInput]} value={form.placeLabel} onChangeText={placeLabel => update({ placeLabel })} placeholder="예: 석사동 공원 입구" placeholderTextColor="#b0a2b7" maxLength={200} />
                <Pressable style={styles.locate} onPress={useCurrentLocation} disabled={locating}>
                  {locating ? <ActivityIndicator color="#a58faf" /> : <LocateFixed size={18} color={form.latitude !== null ? '#9679aa' : '#b9a9c2'} strokeWidth={1.8} />}
                </Pressable>
              </View>
              {form.latitude !== null && (
                <View style={styles.coordsRow}>
                  <MapPin size={12} color="#a58faf" strokeWidth={1.8} />
                  <Text style={styles.coordsText}>현재 위치를 함께 남겨요</Text>
                  <Pressable onPress={() => update({ latitude: null, longitude: null })} hitSlop={8}>
                    <Text style={styles.coordsClear}>지우기</Text>
                  </Pressable>
                </View>
              )}
              <Label text={when} />
              <DateTimeField value={form.occurredAt} onChange={occurredAt => update({ occurredAt })} placeholder="날짜·시간을 골라 주세요" />
            </>
          ) : (
            <>
              <Label text="동네" />
              <TextInput style={styles.input} value={form.regionLabel} onChangeText={regionLabel => update({ regionLabel })} placeholder={myRegion ?? '예: 춘천시 후평동'} placeholderTextColor="#b0a2b7" maxLength={100} />
            </>
          )}

          <Label text="특징" counter={`${form.features.length}/${FEATURES_MAX}`} />
          <View style={styles.featureRow}>
            <TextInput style={[styles.input, styles.featureInput]} value={featureDraft} onChangeText={setFeatureDraft} placeholder="예: 갈색 털, 빨간 목줄" placeholderTextColor="#b0a2b7" maxLength={FEATURE_MAX} returnKeyType="done" onSubmitEditing={addFeature} blurOnSubmit={false} />
            <Pressable style={styles.featureAdd} onPress={addFeature} disabled={form.features.length >= FEATURES_MAX}>
              <Plus size={18} color="#9679aa" strokeWidth={2} />
            </Pressable>
          </View>
          {form.features.length > 0 && (
            <View style={styles.chips}>
              {form.features.map(feature => (
                <Pressable key={feature} style={styles.chip} onPress={() => update({ features: form.features.filter(f => f !== feature) })}>
                  <Text style={styles.chipText}>{feature}</Text>
                  <X size={11} color="#a08dac" strokeWidth={2} />
                </Pressable>
              ))}
            </View>
          )}

          <Label text="자세한 내용" counter={`${form.text.length}/${TEXT_MAX.toLocaleString()}`} />
          <TextInput style={[styles.input, styles.textArea]} value={form.text} onChangeText={text => update({ text })} placeholder="상황을 자세히 알려 주세요" placeholderTextColor="#b0a2b7" multiline textAlignVertical="top" maxLength={TEXT_MAX} />

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!notice && <Text style={styles.notice}>{notice}</Text>}

          <View style={styles.actions}>
            {!editingPublished && (
              <Pressable style={[styles.draftButton, !!busy && styles.disabled]} onPress={() => submit('draft')} disabled={!!busy || uploading}>
                {busy === 'draft' ? <ActivityIndicator color="#98859e" /> : <Text style={styles.draftButtonText}>임시저장</Text>}
              </Pressable>
            )}
            <Pressable style={[styles.publishButton, (!!busy || uploading) && styles.disabled]} onPress={() => submit('publish')} disabled={!!busy || uploading}>
              {busy === 'publish' ? <ActivityIndicator color="#89709b" /> : <Text style={styles.publishText}>{editingPublished ? '수정하기' : '등록하기'}</Text>}
            </Pressable>
          </View>
        </View>
      )}

      <ActionSheet visible={!!leaveAction} onClose={() => setLeaveAction(null)} title="작성을 멈출까요?" message="쓰던 내용은 저장하지 않으면 사라져요.">
        {!editingPublished && (
          <SheetButton
            label="임시저장하고 나가기"
            tone="primary"
            onPress={async () => {
              const action = leaveAction;
              setLeaveAction(null);
              await submit('draft');
              if (action && dirty.current === false) leave(action);
            }}
          />
        )}
        <SheetButton label="그냥 나가기" tone="danger" onPress={() => leaveAction && leave(leaveAction)} />
        <SheetButton label="계속 쓰기" onPress={() => setLeaveAction(null)} />
      </ActionSheet>

      <PermissionSheet
        visible={photoDenied}
        title="사진 접근이 꺼져 있어요"
        message={'사진을 올리려면 설정에서 사진 접근을 허용해 주세요.\n작성 중인 내용은 그대로 남아 있어요.'}
        retryLabel="사진 다시 선택"
        onRetry={addPhotos}
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
  gap: { marginTop: 40 },
  draftBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, paddingHorizontal: 14, marginBottom: 14, backgroundColor: '#f0f3e8', borderRadius: 12 },
  draftText: { flex: 1, fontFamily: fonts.body, fontSize: 11, color: '#92a17f' },
  draftAction: { fontFamily: fonts.pixel, fontSize: 11, color: '#7f9a68' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffefb', borderWidth: 1, borderColor: '#e0d5e4', borderRadius: 12 },
  tabActive: { backgroundColor: '#e9dcf2', borderColor: '#c6b0d8' },
  tabText: { fontFamily: fonts.pixel, fontSize: 11, color: '#ae9db9' },
  tabTextActive: { color: '#9679aa' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 9 },
  label: { fontFamily: fonts.pixel, fontSize: 13, lineHeight: 18, color: '#7b7187' },
  counter: { fontFamily: fonts.body, fontSize: 10, color: '#b0a2b7' },
  input: { height: 48, paddingHorizontal: 16, backgroundColor: '#fffefa', borderWidth: 0.9, borderColor: '#e0d6e6', borderRadius: 13, fontFamily: fonts.body, fontSize: 13, color: '#6b6878' },
  placeRow: { flexDirection: 'row', gap: 10 },
  placeInput: { flex: 1 },
  locate: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffefa', borderWidth: 0.9, borderColor: '#e0d6e6', borderRadius: 13 },
  coordsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginLeft: 2 },
  coordsText: { fontFamily: fonts.body, fontSize: 10.5, color: '#a58faf' },
  coordsClear: { fontFamily: fonts.pixel, fontSize: 10, color: '#b0a2b7', marginLeft: 6 },
  featureRow: { flexDirection: 'row', gap: 10 },
  featureInput: { flex: 1 },
  featureAdd: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0ebf4', borderRadius: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { height: 28, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0ebf4', borderRadius: 10 },
  chipText: { fontFamily: fonts.pixel, fontSize: 10.5, color: '#a08dac' },
  textArea: { height: 150, paddingTop: 14, lineHeight: 20 },
  error: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: '#c0526b', marginTop: 16 },
  notice: { fontFamily: fonts.body, fontSize: 12, color: '#7f9a68', marginTop: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  draftButton: { flex: 1, height: 51, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ddd2e3', borderRadius: 14 },
  draftButtonText: { fontFamily: fonts.pixel, fontSize: 13, color: '#98859e' },
  publishButton: { flex: 2, height: 51, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5d9f0', borderWidth: 1, borderColor: '#cdbbdb', borderRadius: 14 },
  publishText: { fontFamily: fonts.pixel, fontSize: 13, color: '#89709b' },
  disabled: { opacity: 0.55 },
});
