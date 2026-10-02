import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { MapPin, Pencil, Search, Users } from 'lucide-react-native';
import { fonts } from '../../shared/lib/fonts';
import { ConnectionErrorView } from '../../shared/ui/ConnectionErrorView';
import { SvgIcon } from '../../shared/ui/SvgIcon';
import { svgAssets as dogSvgAssets } from '../dog/assets/svgAssets';
import { useAuthSession } from '../../shared/lib/useAuthSession';
import { useCommunityPosts } from './hooks/useCommunityPosts';
import { useCommunityRegion } from './hooks/useCommunityRegion';
import { PostCard } from './components/PostCard';
import type { CommunityCategory } from './types';
import type { HomeTabScreenNavigationProp } from '../../app/navigation';

const FILTERS: { key: CommunityCategory | 'ALL'; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'LOST', label: '찾고 있어요' },
  { key: 'FOUND', label: '발견했어요' },
  { key: 'NEIGHBOR_NEWS', label: '동네 소식' },
];

// Figma "05 커뮤니티" (pencil zLB5J / tcHIo / uWCtk / e60Yjq). Read-only for now — writing is F-21.
export function CommunityScreen() {
  const navigation = useNavigation<HomeTabScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const session = useAuthSession();
  const { state: regionState, setRegion } = useCommunityRegion();
  const regionLabel = regionState.status === 'ready' ? regionState.regionLabel : null;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CommunityCategory | 'ALL'>('ALL');
  const [editingRegion, setEditingRegion] = useState(false);
  const [regionDraft, setRegionDraft] = useState('');
  const [regionError, setRegionError] = useState<string | null>(null);

  const { state, loadMore, reload } = useCommunityPosts({ q: search, category: filter === 'ALL' ? null : filter, region: regionLabel });

  const saveRegion = async () => {
    try {
      await setRegion(regionDraft.trim() || null);
      setEditingRegion(false);
    } catch (err) {
      setRegionError(err instanceof Error ? err.message : '동네를 바꾸지 못했어요.');
    }
  };

  const header = (
    <View>
      <View style={styles.titleRow}>
        <Text style={styles.title}>커뮤니티</Text>
        <Users size={25} color="#b3a4c2" strokeWidth={1.6} />
      </View>
      <Text style={styles.subtitle}>작은 소식이 소중한 만남으로 이어져요.</Text>

      <View style={styles.regionCard}>
        <View style={styles.regionIcon}>
          <MapPin size={16} color="#7ea3b3" strokeWidth={1.8} />
        </View>
        <Text style={styles.regionLabel}>내 동네</Text>
        <Text style={styles.regionName} numberOfLines={1}>
          {regionLabel ?? '동네를 설정해 주세요'}
        </Text>
        <Pressable
          style={styles.regionButton}
          onPress={() => {
            setRegionDraft(regionLabel ?? '');
            setRegionError(null);
            setEditingRegion(true);
          }}
        >
          <Text style={styles.regionButtonText}>동네 변경</Text>
        </Pressable>
      </View>

      <View style={styles.search}>
        <Search size={18} color="#b2a7b9" strokeWidth={1.7} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="털색, 특징, 동네로 찾아보기"
          placeholderTextColor="#aaa4ae"
          returnKeyType="search"
        />
      </View>

      <View style={styles.filters}>
        {FILTERS.map(option => {
          const active = filter === option.key;
          return (
            <Pressable key={option.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(option.key)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>우리 동네 소식</Text>
        <View style={styles.sort}>
          <Text style={styles.sortText}>최신순</Text>
          <SvgIcon xml={dogSvgAssets.sort} width={7} height={5} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="communityBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#def1f6" />
            <Stop offset="0.4" stopColor="#fcf9f0" />
            <Stop offset="1" stopColor="#fcf9f0" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#communityBg)" />
      </Svg>

      <FlatList
        data={state.status === 'ready' ? state.posts : []}
        keyExtractor={post => post.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        ListHeaderComponent={header}
        renderItem={({ item }) => <PostCard post={item} onPress={() => navigation.navigate('CommunityPost', { postId: item.id })} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View>
            {state.status === 'loading' && <ActivityIndicator style={styles.gap} />}
            {state.status === 'error' && (
              <View style={styles.gap}>
                <ConnectionErrorView message="동네 소식을 불러오지 못했어요." onRetry={reload} />
              </View>
            )}
            {state.status === 'anon' && (
              <View style={styles.empty}>
                <Users size={34} color="#b9a4cc" strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>로그인이 필요해요</Text>
                <Text style={styles.emptyLine}>로그인하면 우리 동네 소식을 볼 수 있어요.</Text>
                <Pressable style={styles.emptyButton} onPress={() => navigation.navigate('LoginGuide')}>
                  <Text style={styles.emptyButtonText}>로그인하기</Text>
                </Pressable>
              </View>
            )}
            {state.status === 'ready' && (
              <View style={styles.empty}>
                <Users size={34} color="#b9a4cc" strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>아직 동네 소식이 없어요</Text>
                <Text style={styles.emptyLine}>우리 동네의 첫 소식을 남겨보세요.</Text>
              </View>
            )}
          </View>
        }
        ListFooterComponent={state.status === 'ready' && state.loadingMore ? <ActivityIndicator style={styles.gap} /> : undefined}
      />

      <Pressable
        style={styles.write}
        onPress={() => (session.status === 'signedIn' ? navigation.navigate('CommunityCompose', filter === 'ALL' ? undefined : { category: filter }) : navigation.navigate('LoginGuide'))}
      >
        <Pencil size={16} color="#89709b" strokeWidth={1.9} />
        <Text style={styles.writeText}>글쓰기</Text>
      </Pressable>

      <Modal visible={editingRegion} transparent animationType="fade" onRequestClose={() => setEditingRegion(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEditingRegion(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>내 동네 변경</Text>
            <TextInput
              style={styles.sheetInput}
              value={regionDraft}
              onChangeText={setRegionDraft}
              placeholder="예: 춘천시 후평동"
              placeholderTextColor="#b0a2b7"
              maxLength={100}
              autoFocus
            />
            {regionError && <Text style={styles.sheetError}>{regionError}</Text>}
            <View style={styles.sheetActions}>
              <Pressable onPress={() => setEditingRegion(false)} style={styles.sheetCancel}>
                <Text style={styles.sheetCancelText}>취소</Text>
              </Pressable>
              <Pressable onPress={saveRegion} style={styles.sheetSave}>
                <Text style={styles.sheetSaveText}>저장</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 32 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 1 },
  title: { fontFamily: fonts.pixel, fontSize: 29, lineHeight: 41, color: '#576d7e' },
  subtitle: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: '#82959e', marginTop: 9, marginLeft: 1 },
  regionCard: { height: 75, marginTop: 30, backgroundColor: '#f7fcfc', borderWidth: 1, borderColor: '#d4e4e8', borderRadius: 17 },
  regionIcon: { position: 'absolute', left: 15, top: 18, width: 31, height: 37, borderRadius: 12, backgroundColor: '#eaf3f5', alignItems: 'center', justifyContent: 'center' },
  regionLabel: { position: 'absolute', left: 58, top: 10, fontFamily: fonts.body, fontSize: 10, lineHeight: 14, color: '#a0afb8' },
  regionName: { position: 'absolute', left: 58, right: 112, top: 30, fontFamily: fonts.pixel, fontSize: 16, lineHeight: 22, color: '#6b8a9e' },
  regionButton: { position: 'absolute', right: 16, top: 22, width: 82, height: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff5f6', borderWidth: 1, borderColor: '#dae7e9', borderRadius: 11 },
  regionButtonText: { fontFamily: fonts.body, fontSize: 10, color: '#8ca3b0' },
  search: { height: 44, marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#dddcd9', borderRadius: 13 },
  searchInput: { flex: 1, padding: 0, fontFamily: fonts.body, fontSize: 12, color: '#6b6878' },
  filters: { flexDirection: 'row', gap: 8, marginTop: 17 },
  chip: { height: 32, paddingHorizontal: 13, justifyContent: 'center', backgroundColor: '#fffef9', borderWidth: 0.8, borderColor: '#e4ded8', borderRadius: 12 },
  chipActive: { backgroundColor: '#ede2f3', borderColor: '#d0bce0' },
  chipText: { fontFamily: fonts.pixel, fontSize: 10.5, lineHeight: 14, color: '#99929e' },
  chipTextActive: { color: '#8c749f' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 16, marginLeft: 1 },
  listTitle: { fontFamily: fonts.pixel, fontSize: 16, lineHeight: 22, color: '#747186' },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sortText: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 15, color: '#9c98a2' },
  gap: { marginTop: 16 },
  empty: { minHeight: 268, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#fffef8', borderWidth: 1, borderColor: '#e2dacf', borderRadius: 18 },
  emptyTitle: { fontFamily: fonts.pixel, fontSize: 17, lineHeight: 24, color: '#8c7c9b' },
  emptyLine: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: '#a298a3', textAlign: 'center' },
  emptyButton: { width: 240, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ddd2e3', borderRadius: 10 },
  emptyButtonText: { fontFamily: fonts.pixel, fontSize: 10.5, color: '#98859e' },
  write: { position: 'absolute', right: 24, bottom: 20, height: 46, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#e5d9f0', borderWidth: 1, borderColor: '#cdbbdb', borderRadius: 23, shadowColor: '#4a4659', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  writeText: { fontFamily: fonts.pixel, fontSize: 12.5, color: '#89709b' },
  backdrop: { flex: 1, backgroundColor: 'rgba(56,64,69,0.35)', justifyContent: 'center', paddingHorizontal: 24 },
  sheet: { backgroundColor: '#fcfaf4', borderRadius: 21, padding: 20, gap: 12 },
  sheetTitle: { fontFamily: fonts.pixel, fontSize: 16, color: '#6b8a9e' },
  sheetInput: { height: 48, paddingHorizontal: 16, backgroundColor: '#fffefa', borderWidth: 0.9, borderColor: '#dccfe3', borderRadius: 13, fontFamily: fonts.body, fontSize: 13, color: '#6b6878' },
  sheetError: { fontFamily: fonts.body, fontSize: 12, color: '#c0526b' },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  sheetCancel: { height: 40, paddingHorizontal: 16, justifyContent: 'center' },
  sheetCancelText: { fontFamily: fonts.pixel, fontSize: 12, color: '#9a86a6' },
  sheetSave: { height: 40, paddingHorizontal: 22, justifyContent: 'center', backgroundColor: '#e5d9f0', borderWidth: 1, borderColor: '#b9a6ca', borderRadius: 11 },
  sheetSaveText: { fontFamily: fonts.pixel, fontSize: 12, color: '#89709b' },
});
