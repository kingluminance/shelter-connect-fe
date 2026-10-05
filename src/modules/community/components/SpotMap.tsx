import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NaverMapMarkerOverlay, NaverMapView, type NaverMapViewRef } from '@mj-studio/react-native-naver-map';
import { Minus, Plus } from 'lucide-react-native';
import { fonts } from '../../../shared/lib/fonts';
import { fitRegion } from '../mapRegion';

export interface MapSpot {
  key: string;
  kind: 'post' | 'sighting';
  title: string;
  latitude: number;
  longitude: number;
}

const COLORS = { post: '#edbaa7', sighting: '#b99bcf' } as const;
const DEFAULT_ZOOM = 15;

// Figma "12 목격 위치": Naver map with a salmon "마지막 목격" pin, purple "제보" pins, a legend chip and
// +/- zoom buttons. The tapped pin is enlarged and captioned; the screen shows its details below.
export function SpotMap({ spots, selectedKey, onSelect }: { spots: MapSpot[]; selectedKey: string | null; onSelect: (key: string) => void }) {
  const mapRef = useRef<NaverMapViewRef>(null);
  const zoom = useRef(DEFAULT_ZOOM);
  const center = useRef({ latitude: spots[0].latitude, longitude: spots[0].longitude });
  const [ready, setReady] = useState(false);

  // Frame every place once the map is up; later taps just recenter.
  useEffect(() => {
    if (!ready) return;
    const region = fitRegion(spots);
    if (region && spots.length > 1) mapRef.current?.animateRegionTo({ ...region, duration: 0 });
  }, [ready, spots]);

  const zoomBy = (delta: number) => {
    const next = Math.min(21, Math.max(6, zoom.current + delta));
    mapRef.current?.animateCameraTo({ ...center.current, zoom: next, duration: 250 });
  };

  return (
    <View style={styles.frame}>
      <NaverMapView
        ref={mapRef}
        style={styles.map}
        initialCamera={{ latitude: spots[0].latitude, longitude: spots[0].longitude, zoom: DEFAULT_ZOOM }}
        isShowZoomControls={false}
        isShowCompass={false}
        isShowScaleBar={false}
        isShowLocationButton={false}
        isRotateGesturesEnabled={false}
        isTiltGesturesEnabled={false}
        locale="ko"
        onInitialized={() => setReady(true)}
        onCameraChanged={event => {
          zoom.current = event.zoom ?? DEFAULT_ZOOM;
          center.current = { latitude: event.latitude, longitude: event.longitude };
        }}
      >
        {spots.map(spot => {
          const selected = spot.key === selectedKey;
          const size = selected ? 36 : 26;
          return (
            <NaverMapMarkerOverlay
              key={`${spot.key}-${selected}`}
              latitude={spot.latitude}
              longitude={spot.longitude}
              width={size + 8}
              height={size + 8}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={selected ? 10 : 1}
              caption={selected ? { text: spot.title, textSize: 11, color: '#a187b0', haloColor: '#fffef9', align: 'Top' } : undefined}
              onTap={() => onSelect(spot.key)}
            >
              <View collapsable={false} style={[styles.pinHalo, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }, selected && { backgroundColor: `${COLORS[spot.kind]}55` }]}>
                <View style={[styles.pin, { width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS[spot.kind] }]}>
                  <View style={styles.pinDot} />
                </View>
              </View>
            </NaverMapMarkerOverlay>
          );
        })}
      </NaverMapView>

      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: '#e6af9a' }]} />
        <Text style={styles.legendText}>마지막 목격</Text>
        <View style={[styles.legendDot, { backgroundColor: '#b397c8' }]} />
        <Text style={styles.legendText}>제보</Text>
      </View>

      <View style={styles.zoom}>
        <Pressable style={styles.zoomButton} onPress={() => zoomBy(1)} hitSlop={4}>
          <Plus size={16} color="#a08bab" strokeWidth={2} />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable style={styles.zoomButton} onPress={() => zoomBy(-1)} hitSlop={4}>
          <Minus size={16} color="#a08bab" strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 454, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#dedcd0', backgroundColor: '#edf0e4' },
  map: { flex: 1 },
  pinHalo: { alignItems: 'center', justifyContent: 'center' },
  pin: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff' },
  pinDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff' },
  legend: { position: 'absolute', left: 13, top: 14, height: 30, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffef4', borderWidth: 1, borderColor: '#ded6cf', borderRadius: 10 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { fontFamily: fonts.body, fontSize: 9, color: '#a28ab0', marginRight: 6 },
  zoom: { position: 'absolute', right: 13, bottom: 70, width: 34, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#ded8d2', borderRadius: 12, overflow: 'hidden' },
  zoomButton: { height: 38, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: 1, backgroundColor: '#ece6e0' },
});
