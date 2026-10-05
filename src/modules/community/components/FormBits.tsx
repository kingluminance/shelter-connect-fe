import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../../shared/lib/fonts';

// Figma 08 form rows: Galmuri label (+ optional hint / counter), 43px cream inputs.
export function FieldLabel({ text, hint, counter, large }: { text: string; hint?: string; counter?: string; large?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, large && styles.labelLarge]}>{text}</Text>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
      {!!counter && <Text style={styles.counter}>{counter}</Text>}
    </View>
  );
}

export const inputStyles = StyleSheet.create({
  input: { height: 43, paddingHorizontal: 15, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#e1d8d1', borderRadius: 12, fontFamily: fonts.body, fontSize: 12, color: '#8b808f' },
  area: { paddingTop: 14, paddingBottom: 14, borderRadius: 13, lineHeight: 19 },
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', marginTop: 22, marginBottom: 12, marginLeft: 1 },
  label: { fontFamily: fonts.pixel, fontSize: 12.5, lineHeight: 18, color: '#85788e' },
  labelLarge: { fontSize: 13, color: '#7b7187' },
  hint: { marginLeft: 12, fontFamily: fonts.body, fontSize: 10, color: '#b0a5af' },
  counter: { marginLeft: 'auto', fontFamily: fonts.body, fontSize: 9.5, color: '#b3a7b1' },
});
