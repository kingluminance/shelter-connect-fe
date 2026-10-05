import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NaverMapView, type NaverMapViewRef } from '@mj-studio/react-native-naver-map';
import { LocateFixed, MapPin, X } from 'lucide-react-native';
import { fonts } from '../../../shared/lib/fonts';
import { getCurrentCoords } from '../../../shared/lib/deviceLocation';
import { PuppyButton } from '../../../shared/ui/PuppyButton';

export interface PickedPlace {
  latitude: number;
  longitude: number;
  label: string;
}

// 춘천 — where the service starts; used when nothing is chosen yet and the device gives no fix.
const FALLBACK = { latitude: 37.8813, longitude: 127.7298 };

// Mount it only while picking (state starts fresh each time). Pick a place on the map: the pin stays at the map center and the user pans under it (no reverse
// geocoder in the SDK, so the 장소 이름 is typed — it is what neighbors read; the coordinates are
// what the map pin and 지도 앱으로 보기 use).
export function LocationPicker({ initial, initialLabel, title, onConfirm, onClose }: { initial: { latitude: number; longitude: number } | null; initialLabel: string; title: string; onConfirm: (place: PickedPlace) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<NaverMapViewRef>(null);
  const center = useRef(initial ?? FALLBACK);
  const [label, setLabel] = useState(initialLabel);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const start = initial ?? FALLBACK;

  const goToMe = async () => {
    setLocating(true);
    setMessage(null);
    try {
      const coords = await getCurrentCoords();
      mapRef.current?.animateCameraTo({ ...coords, zoom: 16, duration: 400 });
    } catch (failure) {
      setMessage(failure === 'DENIED' ? '위치 접근이 꺼져 있어요. 지도를 움직여 직접 골라 주세요.' : '현재 위치를 가져오지 못했어요. 지도를 움직여 골라 주세요.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <NaverMapView
          ref={mapRef}
          style={styles.map}
          initialCamera={{ ...start, zoom: initial ? 16 : 14 }}
          isShowZoomControls={false}
          isShowCompass={false}
          isShowScaleBar={false}
          isShowLocationButton={false}
          isRotateGesturesEnabled={false}
          isTiltGesturesEnabled={false}
          locale="ko"
          onCameraIdle={event => {
            center.current = { latitude: event.latitude, longitude: event.longitude };
          }}
        />

        <View pointerEvents="none" style={styles.pinWrap}>
          <MapPin size={40} color="#a187b0" fill="#e5d9f0" strokeWidth={1.8} />
          <View style={styles.pinShadow} />
        </View>

        <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
          <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
            <X size={16} color="#7b8d99" strokeWidth={2} />
          </Pressable>
          <View style={styles.titleChip}>
            <Text style={styles.titleText}>{title}</Text>
          </View>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]}>
          <Text style={styles.hint}>지도를 움직여 핀을 정확한 곳에 맞춰 주세요.</Text>
          <View style={styles.row}>
            <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="장소 이름 (예: 석사동 산책길 입구)" placeholderTextColor="#b0a5af" maxLength={200} />
            <Pressable style={styles.locate} onPress={goToMe} disabled={locating}>
              {locating ? <ActivityIndicator size="small" color="#a38bac" /> : <LocateFixed size={18} color="#a38bac" strokeWidth={1.8} />}
            </Pressable>
          </View>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <PuppyButton label="이 위치로 선택" disabled={!label.trim()} onPress={() => onConfirm({ ...center.current, label: label.trim() })} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#edf0e4' },
  map: { flex: 1 },
  pinWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  pinShadow: { position: 'absolute', bottom: '50%', marginBottom: -3, width: 10, height: 5, borderRadius: 5, backgroundColor: 'rgba(60,56,70,0.25)' },
  top: { position: 'absolute', left: 24, right: 24, top: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f7fcfc', borderWidth: 0.8, borderColor: '#cce2e7', alignItems: 'center', justifyContent: 'center' },
  titleChip: { height: 34, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: '#fffef4', borderWidth: 1, borderColor: '#ded6cf', borderRadius: 12 },
  titleText: { fontFamily: fonts.pixel, fontSize: 12, color: '#8c749f' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 16, gap: 12, backgroundColor: '#fcfaf4', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 0.8, borderColor: '#e6dce2' },
  hint: { fontFamily: fonts.body, fontSize: 11, color: '#a99cb2' },
  row: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, height: 46, paddingHorizontal: 15, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#e1d8d1', borderRadius: 12, fontFamily: fonts.body, fontSize: 12.5, color: '#8b808f' },
  locate: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1ebf5', borderRadius: 12 },
  message: { fontFamily: fonts.body, fontSize: 11, color: '#c0526b' },
});
