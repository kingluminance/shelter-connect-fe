import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { PawPrint } from 'lucide-react-native';
import { fonts } from '../../../shared/lib/fonts';

// Scrapbook decorations of the "친구의 프로필" paper board (design: puppy-profile.html .dp-*): clipboard clip,
// heart sticker, "MY LITTLE FRIEND" ticket, tape, paw sticker and sparkles.

export function Clip() {
  return (
    <View style={styles.clipWrap} pointerEvents="none">
      <View style={styles.clipLoop}>
        <View style={styles.clipHole} />
      </View>
      <View style={styles.clipBody}>
        <View style={styles.clipHighlight} />
      </View>
    </View>
  );
}

export function HeartSticker() {
  return (
    <View style={styles.heartSticker}>
      <Svg width={24} height={24} viewBox="0 0 40 40">
        <Path d="M20 33 6 19C-2 8 11 0 20 11 29 0 42 8 34 19Z" fill="#f19c95" stroke="#a96461" strokeWidth={2.5} />
      </Svg>
    </View>
  );
}

export function Ticket() {
  return (
    <View style={styles.ticket}>
      <Text style={styles.ticketSmall}>MY LITTLE</Text>
      <Text style={styles.ticketBig}>FRIEND</Text>
      <Text style={styles.ticketBars}>|||| ||||| ||||</Text>
      <View style={styles.paperclip} />
    </View>
  );
}

export function Tape() {
  return (
    <View style={styles.tape}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="tape" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#a8def1" stopOpacity={0.6} />
            <Stop offset="1" stopColor="#b9e5f3" stopOpacity={0.6} />
          </LinearGradient>
        </Defs>
        <Path d="M0 3 L62 3 L62 18 L0 18 Z" fill="url(#tape)" />
      </Svg>
    </View>
  );
}

export function PawSticker() {
  return (
    <View style={styles.pawSticker}>
      <PawPrint size={20} color="#5db0cb" strokeWidth={2} />
    </View>
  );
}

export function Sparkle({ size = 28, color = '#e8c46a' }: { size?: number; color?: string }) {
  return <Text style={{ fontSize: size, lineHeight: size + 4, color }}>✦</Text>;
}

const styles = StyleSheet.create({
  clipWrap: { position: 'absolute', alignSelf: 'center', top: -44, width: 128, height: 70, zIndex: 4 },
  clipLoop: { position: 'absolute', left: 41, top: 0, width: 45, height: 57, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomLeftRadius: 11, borderBottomRightRadius: 11, backgroundColor: '#b9beb7', borderWidth: 1, borderColor: '#767d76' },
  clipHole: { position: 'absolute', top: 8, left: 13, width: 18, height: 21, borderRadius: 11, backgroundColor: '#c9e8f1' },
  clipBody: { position: 'absolute', bottom: 0, width: 128, height: 34, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 7, borderBottomRightRadius: 7, borderWidth: 1, borderColor: '#858379', backgroundColor: '#a9ada5', overflow: 'hidden', shadowColor: '#937e65', shadowOpacity: 0.45, shadowRadius: 0, shadowOffset: { width: 0, height: 4 } },
  clipHighlight: { height: 9, backgroundColor: '#e6e5d9' },
  heartSticker: { position: 'absolute', left: 1, top: 18, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: 10, transform: [{ rotate: '-17deg' }], shadowColor: '#d5c7b7', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 } },
  ticket: { position: 'absolute', right: -7, top: 14, alignItems: 'center', paddingTop: 6, paddingBottom: 3, paddingHorizontal: 9, borderWidth: 1, borderColor: '#a7896b', backgroundColor: '#fff7db', transform: [{ rotate: '13deg' }], shadowColor: '#e0c8b3', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 } },
  ticketSmall: { fontFamily: fonts.pixel, fontSize: 7, letterSpacing: 0.8, color: '#90836a' },
  ticketBig: { fontFamily: fonts.pixel, fontSize: 11, letterSpacing: 0.3, color: '#90836a' },
  ticketBars: { fontFamily: fonts.pixel, fontSize: 8, color: '#90836a' },
  paperclip: { position: 'absolute', right: -3, top: -12, width: 12, height: 43, borderWidth: 2, borderColor: '#7c8d9c', borderRadius: 10, transform: [{ rotate: '8deg' }] },
  tape: { position: 'absolute', top: -6, left: -11, width: 62, height: 21, transform: [{ rotate: '-29deg' }] },
  pawSticker: { width: 33, height: 33, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: 11, transform: [{ rotate: '14deg' }], shadowColor: '#d9cbba', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 1, height: 2 } },
});
