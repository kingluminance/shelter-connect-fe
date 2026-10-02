import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { fonts } from '../../shared/lib/fonts';
import { getCurrentCoords, type Coords } from '../../shared/lib/deviceLocation';
import { SvgIcon } from '../../shared/ui/SvgIcon';
import { PermissionSheet } from '../../shared/ui/ActionSheet';
import { ConnectionErrorView } from '../../shared/ui/ConnectionErrorView';
import { svgAssets } from './assets/svgAssets';
import { ShelterHouse } from './components/ShelterHouse';
import { useCurrentShelter } from './hooks/useCurrentShelter';
import { useShelterDiscovery } from './hooks/useShelterDiscovery';
import { formatDistanceKm, houseKindFor, withRoParticle } from './shelterDisplay';
import type { HomeTabScreenNavigationProp } from '../../app/navigation';
import type { ShelterDiscoveryItem } from './types';

// Figma "02 보호소" (nodes 11:357 선택 전 / 22:2359 별빛 선택 / 22:5581 온기 선택). The
// reference point is either the device's location (distance-sorted by the server) or a
// region chosen from the shelters' own regions — there is no reverse-geocoder, so the
// design's "춘천시 효자동" label becomes "현재 위치" / the chosen region.
export function ShelterTabScreen() {
  const navigation = useNavigation<HomeTabScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { state: currentState, setCurrentShelter } = useCurrentShelter();
  const currentShelterId = currentState.status === 'ready' ? currentState.shelterId : null;

  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [regionSheetOpen, setRegionSheetOpen] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [allRegions, setAllRegions] = useState<string[]>([]);

  const { state, reload } = useShelterDiscovery({ q: search, region, coords });

  useEffect(() => {
    if (state.status === 'ready' && !search && !region) {
      setAllRegions([...new Set(state.shelters.map(s => s.region))].sort());
    }
  }, [state, search, region]);

  const shelters = useMemo(() => (state.status === 'ready' ? state.shelters : []), [state]);
  const selected = shelters.find(s => s.id === selectedId) ?? null;
  const nearestId = coords && shelters.length > 0 ? shelters[0].id : null;

  const locate = async () => {
    setLocating(true);
    try {
      setCoords(await getCurrentCoords());
      setRegion(null);
    } catch (failure) {
      if (failure === 'DENIED') {
        setLocationDenied(true); // Figma 21 시트
      } else {
        Alert.alert('위치를 가져오지 못했어요', '잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setLocating(false);
    }
  };

  const referenceLabel = coords ? '현재 위치' : region ?? '전체 지역';

  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#dcf0f5" />
            <Stop offset="0.407" stopColor="#fcf9f0" />
            <Stop offset="1" stopColor="#fcf9f0" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bg)" />
      </Svg>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: selected ? 96 : 40 }]}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>보호소</Text>
          <SvgIcon xml={svgAssets.pawTitle} width={22} height={22} />
        </View>
        <Text style={styles.subtitle}>가까운 곳에서, 새로운 친구를 만나보세요.</Text>

        <View style={styles.locationCard}>
          <View style={styles.locationIconBox}>
            <SvgIcon xml={svgAssets.pin} width={18} height={18} />
          </View>
          <Text style={styles.locationLabel}>기준 위치</Text>
          <Text style={styles.locationValue} numberOfLines={1}>
            {referenceLabel}
          </Text>
          <Pressable style={styles.regionButton} onPress={() => setRegionSheetOpen(true)}>
            <Text style={styles.regionButtonText}>지역 변경</Text>
            <SvgIcon xml={svgAssets.chevron11} width={11} height={11} />
          </Pressable>
          <View style={styles.locationDivider} />
          <Pressable style={styles.locateRow} onPress={locate} disabled={locating}>
            <SvgIcon xml={svgAssets.target13} width={13} height={13} />
            <Text style={styles.locateText}>{locating ? '위치 찾는 중…' : '현재 위치로 다시 찾기'}</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <SvgIcon xml={svgAssets.search17} width={17} height={17} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="보호소 이름으로 검색"
            placeholderTextColor="#b2aab2"
            returnKeyType="search"
          />
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>내 주변 보호소</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{shelters.length}</Text>
          </View>
          <View style={styles.sortLabel}>
            <SvgIcon xml={svgAssets.target11} width={11} height={11} />
            <Text style={styles.sortText}>{coords ? '가까운 순' : '기본 순'}</Text>
          </View>
        </View>

        {state.status === 'loading' && <ActivityIndicator style={styles.statusGap} />}
        {state.status === 'error' && (
          <View style={styles.statusGap}>
            <ConnectionErrorView message="보호소 목록을 불러오지 못했어요." onRetry={reload} />
          </View>
        )}
        {state.status === 'ready' && shelters.length === 0 && (
          <Text style={[styles.hintText, styles.statusGap]}>조건에 맞는 보호소가 없어요</Text>
        )}

        {shelters.map(shelter => (
          <ShelterCard
            key={shelter.id}
            shelter={shelter}
            isCurrent={shelter.id === currentShelterId}
            isSelected={shelter.id === selectedId}
            isNearest={shelter.id === nearestId}
            onPress={() => setSelectedId(prev => (prev === shelter.id ? null : shelter.id))}
          />
        ))}

        {shelters.length > 0 && <Text style={styles.footnote}>표시된 거리는 기준 위치로부터의 직선거리예요.</Text>}
      </ScrollView>

      {selected && selected.id === currentShelterId && (
        <Pressable
          style={[styles.actionButton, styles.exploreButton]}
          onPress={() => navigation.navigate('Game', { shelterId: selected.id, shelterName: selected.name })}
        >
          <SvgIcon xml={svgAssets.pawExplore} width={16} height={16} />
          <Text style={[styles.actionText, styles.exploreText]}>보호소 둘러보기</Text>
          <SvgIcon xml={svgAssets.chevronExplore} width={16} height={16} />
        </Pressable>
      )}
      {selected && selected.id !== currentShelterId && (
        <Pressable style={[styles.actionButton, styles.changeButton]} onPress={() => setCurrentShelter(selected.id)}>
          <SvgIcon xml={svgAssets.pawConfirm} width={16} height={16} />
          <Text style={[styles.actionText, styles.changeText]}>{withRoParticle(selected.name)} 변경</Text>
          <SvgIcon xml={svgAssets.chevronConfirm} width={16} height={16} />
        </Pressable>
      )}

      <PermissionSheet
        visible={locationDenied}
        title="위치 접근이 꺼져 있어요"
        message={'설정에서 위치 접근을 허용하면 가까운 보호소를 거리순으로 볼 수 있어요.\n지금은 지역을 직접 골라도 돼요.'}
        alternativeLabel="지역 직접 선택"
        onAlternative={() => {
          setLocationDenied(false);
          setRegionSheetOpen(true);
        }}
        onClose={() => setLocationDenied(false)}
      />

      <Modal visible={regionSheetOpen} transparent animationType="fade" onRequestClose={() => setRegionSheetOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setRegionSheetOpen(false)}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.sheetTitle}>지역 선택</Text>
            {[null, ...allRegions].map(option => (
              <Pressable
                key={option ?? 'all'}
                style={styles.sheetRow}
                onPress={() => {
                  setRegion(option);
                  setCoords(null);
                  setRegionSheetOpen(false);
                }}
              >
                <Text style={[styles.sheetRowText, option === region && !coords && styles.sheetRowActive]}>
                  {option ?? '전체 지역'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

interface ShelterCardProps {
  shelter: ShelterDiscoveryItem;
  isCurrent: boolean;
  isSelected: boolean;
  isNearest: boolean;
  onPress: () => void;
}

// Figma card variants: Default / Current (이용 중 badge) / Selected (purple) / Current selected (green).
function ShelterCard({ shelter, isCurrent, isSelected, isNearest, onPress }: ShelterCardProps) {
  const palette = isSelected ? (isCurrent ? CARD_CURRENT_SELECTED : CARD_SELECTED) : CARD_DEFAULT;
  const distance = formatDistanceKm(shelter.distanceMeters);

  return (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: palette.bg, borderColor: palette.border, borderWidth: isSelected ? 1.6 : 1 },
        isSelected && styles.cardSelectedShadow,
      ]}
      onPress={onPress}
    >
      <View style={styles.cardHouse}>
        <ShelterHouse kind={houseKindFor(shelter.mapKey, shelter.name)} />
      </View>
      <Text style={[styles.cardName, { color: palette.name }]} numberOfLines={1}>
        {shelter.name}
      </Text>
      <View style={styles.cardMetaRow}>
        {distance && <Text style={[styles.cardDistance, { color: palette.distance }]}>{distance}</Text>}
        <Text style={[styles.cardRegion, isSelected && { color: palette.distance }]} numberOfLines={1}>
          {shelter.address ?? shelter.region}
        </Text>
      </View>
      <View style={styles.cardDogRow}>
        <SvgIcon xml={isSelected ? svgAssets.pawCardSelected : svgAssets.pawCard} width={11} height={11} />
        <Text style={[styles.cardDogs, { color: palette.dogs }]}>보호 중인 친구 {shelter.dogCount}마리</Text>
      </View>
      {isCurrent ? (
        <View style={[styles.badge, styles.badgeCurrent]}>
          <Text style={[styles.badgeText, styles.badgeCurrentText]}>이용 중</Text>
        </View>
      ) : (
        isNearest && (
          <View style={[styles.badge, styles.badgeNearest]}>
            <Text style={[styles.badgeText, styles.badgeNearestText]}>가장 가까워요</Text>
          </View>
        )
      )}
      <View
        style={[
          styles.check,
          isSelected ? { backgroundColor: palette.check, borderWidth: 0 } : { backgroundColor: '#fffdf8', borderColor: '#d9d3dc', borderWidth: 1.2 },
        ]}
      >
        {isSelected && <SvgIcon xml={svgAssets.check} width={15} height={15} />}
      </View>
    </Pressable>
  );
}

const CARD_DEFAULT = { bg: '#fffef9', border: '#e5ddd4', name: '#6b707b', distance: '#869a9a', dogs: '#9a9d91', check: '' };
const CARD_SELECTED = { bg: '#f7f1fb', border: '#b19ac7', name: '#776485', distance: '#8c72a5', dogs: '#a094a7', check: '#a68abf' };
const CARD_CURRENT_SELECTED = { bg: '#f0f6eb', border: '#9dba89', name: '#5f764f', distance: '#849774', dogs: '#849774', check: '#88a76d' };

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 1 },
  title: { fontFamily: fonts.pixel, fontSize: 29, lineHeight: 41, color: '#5d6b7b' },
  subtitle: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: '#88979f', marginTop: 13, marginBottom: 11, marginLeft: 1 },
  locationCard: {
    height: 104,
    backgroundColor: '#f8fcfb',
    borderWidth: 1,
    borderColor: '#cbdfe2',
    borderRadius: 18,
    shadowColor: '#495e70',
    shadowOpacity: 0.05,
    shadowRadius: 3.5,
    shadowOffset: { width: 0, height: 3 },
  },
  locationIconBox: { position: 'absolute', left: 13, top: 16, width: 34, height: 36, borderRadius: 11, backgroundColor: '#e4f0f2', alignItems: 'center', justifyContent: 'center' },
  locationLabel: { position: 'absolute', left: 59, top: 9, fontFamily: fonts.body, fontSize: 10, lineHeight: 14, color: '#94a1a9' },
  locationValue: { position: 'absolute', left: 59, right: 104, top: 29, fontFamily: fonts.pixel, fontSize: 17, lineHeight: 24, color: '#627d8a' },
  regionButton: {
    position: 'absolute',
    right: 13,
    top: 23,
    width: 77,
    height: 29,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#eef4f4',
    borderWidth: 0.8,
    borderColor: '#d7e4e5',
    borderRadius: 10,
  },
  regionButtonText: { fontFamily: fonts.body, fontSize: 10, lineHeight: 14, color: '#869aa3' },
  locationDivider: { position: 'absolute', left: 15, right: 15, top: 65, height: 0.8, backgroundColor: '#e0eaeb' },
  locateRow: { position: 'absolute', left: 17, right: 15, top: 70, height: 26, flexDirection: 'row', alignItems: 'center', gap: 10 },
  locateText: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: '#8c9eaa' },
  searchBox: {
    marginTop: 17,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingHorizontal: 18,
    backgroundColor: '#fffef9',
    borderWidth: 1,
    borderColor: '#e3ded7',
    borderRadius: 13,
  },
  searchInput: { flex: 1, padding: 0, fontFamily: fonts.body, fontSize: 12, color: '#6b707b' },
  listHeader: { flexDirection: 'row', alignItems: 'center', height: 24, marginTop: 25, marginBottom: 18 },
  listTitle: { fontFamily: fonts.pixel, fontSize: 17, lineHeight: 24, color: '#697486', marginLeft: 1 },
  countBadge: { marginLeft: 8, minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 10, backgroundColor: '#eae6ee', alignItems: 'center', justifyContent: 'center' },
  countBadgeText: { fontFamily: fonts.pixel, fontSize: 11, lineHeight: 15, color: '#9c8aac' },
  sortLabel: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 11 },
  sortText: { fontFamily: fonts.body, fontSize: 10, lineHeight: 14, color: '#9c9ca8' },
  statusGap: { marginTop: 16 },
  hintText: { fontFamily: fonts.body, fontSize: 12, color: '#a1998e', textAlign: 'center' },
  card: {
    height: 119,
    marginBottom: 14,
    borderRadius: 18,
    shadowColor: '#495e70',
    shadowOpacity: 0.04,
    shadowRadius: 3.5,
    shadowOffset: { width: 0, height: 3 },
  },
  cardSelectedShadow: { shadowOpacity: 0.07 },
  cardHouse: { position: 'absolute', left: 10.4, top: 14.4 },
  cardName: { position: 'absolute', left: 95.4, right: 100, top: 14.4, fontFamily: fonts.pixel, fontSize: 17, lineHeight: 24 },
  cardMetaRow: { position: 'absolute', left: 95.4, right: 14, top: 43.4, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  cardDistance: { fontFamily: fonts.pixel, fontSize: 15, lineHeight: 21 },
  cardRegion: { flex: 1, fontFamily: fonts.body, fontSize: 10.5, lineHeight: 15, color: '#a29ba2', paddingBottom: 1 },
  cardDogRow: { position: 'absolute', left: 96.4, right: 50, top: 75.4, flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardDogs: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15 },
  badge: { position: 'absolute', right: 14.4, top: 13.4, height: 22, minWidth: 30, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.pixel, fontSize: 9, lineHeight: 13 },
  check: { position: 'absolute', right: 14.4, top: 73.4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footnote: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 15, color: '#a39ba4', textAlign: 'center', marginTop: 4 },
  actionButton: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 13,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 23,
    borderWidth: 1,
    borderRadius: 13,
    shadowColor: '#495e70',
    shadowOpacity: 0.3,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
  },
  exploreButton: { backgroundColor: '#d8e8cf', borderColor: '#9ab587' },
  changeButton: { backgroundColor: '#e5d8f0', borderColor: '#b69dca' },
  actionText: { fontFamily: fonts.pixel, fontSize: 15, lineHeight: 21 },
  exploreText: { color: '#536b47' },
  changeText: { color: '#7e6591' },
  badgeCurrent: { backgroundColor: '#e3ecd9' },
  badgeCurrentText: { color: '#81976d' },
  badgeNearest: { backgroundColor: '#e9ddf3' },
  badgeNearestText: { color: '#9778af' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(60,70,80,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fffefa', borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 24, paddingTop: 20 },
  sheetTitle: { fontFamily: fonts.pixel, fontSize: 17, color: '#697486', marginBottom: 8 },
  sheetRow: { paddingVertical: 14 },
  sheetRowText: { fontFamily: fonts.body, fontSize: 14, color: '#6b707b' },
  sheetRowActive: { fontFamily: fonts.pixel, color: '#8c789d' },
});
