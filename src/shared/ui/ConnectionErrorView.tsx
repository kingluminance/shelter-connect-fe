import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { fonts } from '../lib/fonts';

// Figma "20 연결 오류" (46:26861) — that frame couldn't be fetched (Figma MCP quota), so this
// follows the app's other empty/state cards until its own design is checked.
export function ConnectionErrorView({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <WifiOff size={22} color="#a286b5" strokeWidth={1.7} />
      </View>
      <Text style={styles.title}>연결이 잠시 끊겼어요</Text>
      <Text style={styles.body}>{message ?? '인터넷 연결을 확인하고 다시 시도해 주세요.'}</Text>
      <Pressable style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 12, paddingVertical: 28, paddingHorizontal: 20, backgroundColor: '#fffef8', borderWidth: 1, borderColor: '#e2dacf', borderRadius: 20 },
  icon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#ede2f3', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.pixel, fontSize: 16, lineHeight: 22, color: '#7d708b' },
  body: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: '#a0959b', textAlign: 'center' },
  button: { marginTop: 4, height: 36, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8ddf0', borderWidth: 1, borderColor: '#c3afcf', borderRadius: 10 },
  buttonText: { fontFamily: fonts.pixel, fontSize: 11, color: '#846d95' },
});
