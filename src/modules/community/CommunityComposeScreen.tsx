import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera, Check, MapPin, Plus, X } from 'lucide-react-native';
import { fonts } from '../../shared/lib/fonts';
import { generateClientMessageId } from '../../shared/lib/clientId';
import { getCurrentCoords } from '../../shared/lib/deviceLocation';
import { pickPhotos, uploadCommunityPhoto } from '../../shared/lib/photoUpload';
import { writeErrorMessage } from '../../shared/lib/communityErrors';
import { ActionSheet, PermissionSheet, SheetButton } from '../../shared/ui/ActionSheet';
import { PuppyButton } from '../../shared/ui/PuppyButton';
import { ConnectionErrorView } from '../../shared/ui/ConnectionErrorView';
import { createCommunityPost, fetchCommunityPost, fetchMyDrafts, publishCommunityPost, updateCommunityPost } from './api/posts';
import { useCommunityRegion } from './hooks/useCommunityRegion';
import { DateTimeFields } from './components/DateTimeField';
import { FieldLabel, inputStyles } from './components/FormBits';
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
// Figma 08: each category picks its own accent (찾고 있어요 pink, 발견했어요 green, 동네 소식 lavender).
const CATEGORY_TONE: Record<CommunityCategory, { bg: string; border: string; text: string }> = {
  LOST: { bg: '#f5e5e9', border: '#d9adb9', text: '#ae788c' },
  FOUND: { bg: '#eaf0e3', border: '#b3c6a5', text: '#8a9e77' },
  NEIGHBOR_NEWS: { bg: '#ede2f3', border: '#cfbce0', text: '#8c749f' },
};
const PHOTO_HINT: Record<CommunityCategory, string> = {
  LOST: '얼굴과 몸이 잘 보이는 사진',
  FOUND: '얼굴과 몸이 잘 보이는 사진',
  NEIGHBOR_NEWS: '동네 소식에 어울리는 사진',
};

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
  const [addingFeature, setAddingFeature] = useState(false);
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

  const locateHere = async () => {
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
  const placeholderColor = '#b0a5af';
  const saveDraft = (
    <Pressable onPress={() => submit('draft')} disabled={!!busy || uploading} hitSlop={10}>
      {busy === 'draft' ? <ActivityIndicator size="small" color="#a08bab" /> : <Text style={styles.draftLink}>임시저장</Text>}
    </Pressable>
  );

  return (
    <ScreenFrame title="글 쓰기" right={!editingPublished && load === 'ready' ? saveDraft : undefined}>
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
              const tone = CATEGORY_TONE[category];
              return (
                <Pressable key={category} style={[styles.tab, active && { backgroundColor: tone.bg, borderColor: tone.border }]} onPress={() => update({ category })} disabled={editingPublished && !active}>
                  {active && <Check size={10} color={tone.text} strokeWidth={2.4} />}
                  <Text style={[styles.tabText, active && { color: tone.text }]}>{CATEGORY_LABEL[category]}</Text>
                </Pressable>
              );
            })}
          </View>

          <FieldLabel large text="사진" hint={PHOTO_HINT[form.category]} counter={`${form.photos.length} / ${PHOTOS_MAX}`} />
          <PhotoStrip photos={form.photos} max={PHOTOS_MAX} uploading={uploading} onAdd={addPhotos} onRemove={id => update({ photos: form.photos.filter(p => p.mediaId !== id) })} />

          <FieldLabel text="제목" counter={`${form.title.length} / ${TITLE_MAX}`} />
          <TextInput style={inputStyles.input} value={form.title} onChangeText={title => update({ title })} placeholder="예: 갈색 강아지를 찾고 있어요" placeholderTextColor={placeholderColor} maxLength={TITLE_MAX} />

          {needsPlace(form.category) ? (
            <>
              <FieldLabel text={place} />
              <View style={styles.placeBox}>
                <MapPin size={15} color="#b4a0bc" strokeWidth={1.8} />
                <TextInput style={styles.placeInput} value={form.placeLabel} onChangeText={placeLabel => update({ placeLabel })} placeholder="예: 춘천시 석사동" placeholderTextColor={placeholderColor} maxLength={200} />
                <Pressable style={styles.placeButton} onPress={locateHere} disabled={locating}>
                  {locating ? <ActivityIndicator size="small" color="#a38bac" /> : <Text style={styles.placeButtonText}>{form.latitude !== null ? '현재 위치 ✓' : '현재 위치'}</Text>}
                </Pressable>
              </View>
              <FieldLabel text={when} />
              <DateTimeFields value={form.occurredAt} onChange={occurredAt => update({ occurredAt })} />
            </>
          ) : (
            <>
              <FieldLabel text="동네" />
              <View style={styles.placeBox}>
                <MapPin size={15} color="#b4a0bc" strokeWidth={1.8} />
                <TextInput style={styles.placeInput} value={form.regionLabel} onChangeText={regionLabel => update({ regionLabel })} placeholder={myRegion ?? '예: 춘천시 후평동'} placeholderTextColor={placeholderColor} maxLength={100} />
                {!!myRegion && form.regionLabel !== myRegion && (
                  <Pressable style={styles.placeButton} onPress={() => update({ regionLabel: myRegion })}>
                    <Text style={styles.placeButtonText}>내 동네</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}

          {needsPlace(form.category) && (
            <>
              <FieldLabel text="눈에 띄는 특징" counter="선택" />
              <View style={styles.chips}>
                {form.features.map(feature => (
                  <Pressable key={feature} style={styles.chip} onPress={() => update({ features: form.features.filter(f => f !== feature) })}>
                    <Text style={styles.chipText}>{feature}</Text>
                    <X size={11} color="#a18aab" strokeWidth={2} />
                  </Pressable>
                ))}
                {form.features.length < FEATURES_MAX &&
                  (addingFeature ? (
                    <TextInput
                      style={styles.featureInput}
                      value={featureDraft}
                      onChangeText={setFeatureDraft}
                      placeholder="예: 갈색 털"
                      placeholderTextColor="#b29dbd"
                      maxLength={FEATURE_MAX}
                      returnKeyType="done"
                      autoFocus
                      onSubmitEditing={() => {
                        addFeature();
                        setAddingFeature(false);
                      }}
                      onBlur={() => {
                        addFeature();
                        setAddingFeature(false);
                      }}
                    />
                  ) : (
                    <Pressable style={styles.addChip} onPress={() => setAddingFeature(true)}>
                      <Plus size={13} color="#b29dbd" strokeWidth={2} />
                      <Text style={styles.addChipText}>특징 추가</Text>
                    </Pressable>
                  ))}
              </View>
            </>
          )}

          <FieldLabel text="자세한 내용" counter={`${form.text.length} / ${TEXT_MAX.toLocaleString()}`} />
          <TextInput
            style={[inputStyles.input, inputStyles.area, form.category === 'NEIGHBOR_NEWS' ? styles.areaTall : styles.area]}
            value={form.text}
            onChangeText={text => update({ text })}
            placeholder={form.category === 'NEIGHBOR_NEWS' ? '동네 이웃들에게 전하고 싶은 소식을 적어주세요.' : '상황을 자세히 알려 주세요'}
            placeholderTextColor={placeholderColor}
            multiline
            textAlignVertical="top"
            maxLength={TEXT_MAX}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!notice && <Text style={styles.notice}>{notice}</Text>}

          <View style={styles.submit}>
            <PuppyButton
              label={editingPublished ? '수정하기' : '등록하기'}
              icon={<Check size={18} color="#887099" strokeWidth={2} />}
              onPress={() => submit('publish')}
              busy={busy === 'publish'}
              disabled={!!busy || uploading}
            />
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
        icon={<Camera size={26} color="#a48db7" strokeWidth={1.7} />}
        title="사진 접근이 꺼져 있어요"
        message={'사진을 다시 선택하거나\n기기 설정에서 사진 접근을 허용해 주세요.'}
        note="작성 중인 글은 그대로 유지돼요."
        primaryLabel="사진 다시 선택"
        onPrimary={addPhotos}
        linkLabel="작성 중인 글로 돌아가기"
        onLink={() => setPhotoDenied(false)}
        onClose={() => setPhotoDenied(false)}
      />
      <PermissionSheet
        visible={locationDenied}
        icon={<MapPin size={26} color="#a48db7" strokeWidth={1.7} />}
        title="위치 접근이 꺼져 있어요"
        message={'현재 위치를 남기려면 설정에서 위치 접근을 허용해 주세요.\n장소 이름을 직접 입력해도 돼요.'}
        note="작성 중인 글은 그대로 유지돼요."
        primaryLabel="장소 직접 입력"
        onPrimary={() => setLocationDenied(false)}
        onClose={() => setLocationDenied(false)}
      />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: 40 },
  draftLink: { fontFamily: fonts.body, fontSize: 10.5, color: '#a08bab' },
  draftBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, paddingHorizontal: 14, marginBottom: 14, backgroundColor: '#f0f3e8', borderRadius: 12 },
  draftText: { flex: 1, fontFamily: fonts.body, fontSize: 11, color: '#92a17f' },
  draftAction: { fontFamily: fonts.pixel, fontSize: 11, color: '#7f9a68' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#dedad9', borderRadius: 12 },
  tabText: { fontFamily: fonts.pixel, fontSize: 11, color: '#9d929f' },
  placeBox: { height: 43, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 9, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#e1d8d1', borderRadius: 12 },
  placeInput: { flex: 1, padding: 0, fontFamily: fonts.body, fontSize: 12, color: '#8b808f' },
  placeButton: { minWidth: 67, height: 25, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1ebf5', borderRadius: 8 },
  placeButtonText: { fontFamily: fonts.body, fontSize: 9.5, color: '#a38bac' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 29, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0e8f4', borderWidth: 1, borderColor: '#e4d8ea', borderRadius: 10 },
  chipText: { fontFamily: fonts.body, fontSize: 10.5, color: '#a18aab' },
  addChip: { height: 29, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#dcd1e2', borderRadius: 10 },
  addChipText: { fontFamily: fonts.body, fontSize: 10.5, color: '#b29dbd' },
  featureInput: { height: 29, minWidth: 100, paddingHorizontal: 14, paddingVertical: 0, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#dcd1e2', borderRadius: 10, fontFamily: fonts.body, fontSize: 10.5, color: '#a18aab' },
  area: { height: 106 },
  areaTall: { height: 200 },
  error: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: '#c0526b', marginTop: 16 },
  notice: { fontFamily: fonts.body, fontSize: 12, color: '#7f9a68', marginTop: 16 },
  submit: { marginTop: 28 },
});
