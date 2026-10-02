import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PawPrint, WifiOff } from 'lucide-react-native';
import { fonts } from '../lib/fonts';

interface ConnectionErrorViewProps {
  /** First grey line, e.g. "보호소 목록을 불러오지 못했어요." */
  message: string;
  onRetry: () => void;
  /** Optional second action ("이전 화면으로"). */
  onBack?: () => void;
}

// Figma "20 연결 오류" (pencil BBuuT): white card, pale blob with the broken-signal icon,
// 21px title, two grey lines, lavender primary button, lilac text link.
export function ConnectionErrorView({ message, onRetry, onBack }: ConnectionErrorViewProps) {
  return (
    <View style={styles.card}>
      <View style={styles.blob}>
        <WifiOff size={38} color="#b19bc2" strokeWidth={1.5} />
        <View style={styles.pawBadge}>
          <PawPrint size={14} color="#d7c7e2" strokeWidth={2} />
        </View>
      </View>
      <Text style={styles.title}>연결이 잠시 끊겼어요</Text>
      <View style={styles.lines}>
        <Text style={styles.line}>{message}</Text>
        <Text style={styles.line}>인터넷 연결을 확인한 뒤 다시 시도해 주세요.</Text>
      </View>
      <Pressable style={styles.primary} onPress={onRetry}>
        <Text style={styles.primaryText}>다시 시도</Text>
      </Pressable>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.back}>이전 화면으로</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingTop: 41,
    paddingBottom: 32,
    paddingHorizontal: 24,
    backgroundColor: '#fffefa',
    borderRadius: 20,
    shadowColor: '#4a4659',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  blob: { width: 152, height: 106, borderRadius: 52, backgroundColor: '#eef0f6', alignItems: 'center', justifyContent: 'center' },
  pawBadge: { position: 'absolute', left: -22, bottom: 14 },
  title: { fontFamily: fonts.pixel, fontSize: 21, lineHeight: 29, color: '#667484', marginTop: 22 },
  lines: { marginTop: 14, gap: 7, alignItems: 'center' },
  line: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: '#a294aa', textAlign: 'center' },
  primary: {
    alignSelf: 'stretch',
    marginTop: 34,
    height: 51,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5d9f0',
    borderWidth: 1,
    borderColor: '#b9a6ca',
    borderRadius: 13,
    shadowColor: '#c5b6cf',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 3 },
  },
  primaryText: { fontFamily: fonts.pixel, fontSize: 14, lineHeight: 20, color: '#89709b' },
  back: { fontFamily: fonts.pixel, fontSize: 13, lineHeight: 18, color: '#a28cae', marginTop: 24 },
});
