import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Camera, X } from 'lucide-react-native';
import { fonts } from '../../../shared/lib/fonts';
import { RemoteImage } from '../../../shared/ui/RemoteImage';
import type { ComposePhoto } from '../composeForm';
import { useMediaUrl } from '../hooks/useMediaUrl';

// 사진 추가 칸 + 썸네일(대표 표시 · 삭제). Newly picked photos show their local uri; photos that
// came with an existing post load through the signed media URL. Skia-only loading (CLAUDE.md).
export function PhotoStrip({ photos, max, uploading, onAdd, onRemove }: { photos: ComposePhoto[]; max: number; uploading: boolean; onAdd: () => void; onRemove: (mediaId: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {photos.length < max && (
        <Pressable style={styles.add} onPress={onAdd} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#a58faf" /> : <Camera size={20} color="#a58faf" strokeWidth={1.7} />}
          <Text style={styles.addText}>
            {photos.length}/{max}
          </Text>
        </Pressable>
      )}
      {photos.map((photo, index) => (
        <Thumb key={photo.mediaId} photo={photo} cover={index === 0 && max > 1} onRemove={() => onRemove(photo.mediaId)} />
      ))}
    </ScrollView>
  );
}

function Thumb({ photo, cover, onRemove }: { photo: ComposePhoto; cover: boolean; onRemove: () => void }) {
  const remote = useMediaUrl(photo.uri ? undefined : photo.mediaId);
  const uri = photo.uri ?? remote;
  return (
    <View style={styles.thumb}>
      <RemoteImage url={uri} width={84} height={84} radius={14} />
      {cover && (
        <View style={styles.coverBadge}>
          <Text style={styles.coverText}>대표</Text>
        </View>
      )}
      <Pressable style={styles.remove} onPress={onRemove} hitSlop={8}>
        <X size={12} color="#ffffff" strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 4 },
  add: { width: 84, height: 84, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#cdbbdb', backgroundColor: '#f8f3fa', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addText: { fontFamily: fonts.pixel, fontSize: 10, color: '#a58faf' },
  thumb: { width: 84, height: 84 },
  coverBadge: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 7, height: 18, borderRadius: 7, backgroundColor: 'rgba(255,254,244,0.92)', justifyContent: 'center' },
  coverText: { fontFamily: fonts.pixel, fontSize: 8.5, color: '#9679aa' },
  remove: { position: 'absolute', top: 5, right: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(60,56,70,0.6)', alignItems: 'center', justifyContent: 'center' },
});
