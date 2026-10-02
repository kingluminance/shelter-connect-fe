import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';
import { fonts } from '../../../shared/lib/fonts';

const pad = (n: number) => String(n).padStart(2, '0');
export const formatDateTime = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${d.getHours() < 12 ? '오전' : '오후'} ${pad(d.getHours() % 12 === 0 ? 12 : d.getHours() % 12)}:${pad(d.getMinutes())}`;

// iOS shows the native compact date+time picker inline; Android has no datetime mode, so a tap
// walks the date dialog and then the time dialog.
export function DateTimeField({ value, onChange, placeholder }: { value: Date | null; onChange: (date: Date) => void; placeholder: string }) {
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.row}>
        <Clock size={15} color="#b9a9c2" strokeWidth={1.8} />
        {value ? (
          <DateTimePicker value={value} mode="datetime" display="compact" maximumDate={new Date()} onChange={(_e: DateTimePickerEvent, date?: Date) => date && onChange(date)} locale="ko-KR" />
        ) : (
          <Pressable style={styles.placeholderWrap} onPress={() => onChange(new Date())}>
            <Text style={styles.placeholder}>{placeholder}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const open = () => {
    const base = value ?? new Date();
    DateTimePickerAndroid.open({
      value: base,
      mode: 'date',
      maximumDate: new Date(),
      onChange: (e, date) => {
        if (e.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          is24Hour: false,
          onChange: (e2, time) => {
            if (e2.type !== 'set' || !time) return;
            const picked = new Date(date);
            picked.setHours(time.getHours(), time.getMinutes(), 0, 0);
            onChange(picked);
          },
        });
      },
    });
  };
  return (
    <Pressable style={styles.row} onPress={open}>
      <Clock size={15} color="#b9a9c2" strokeWidth={1.8} />
      <Text style={value ? styles.value : styles.placeholder}>{value ? formatDateTime(value) : placeholder}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, backgroundColor: '#fffefa', borderWidth: 0.9, borderColor: '#e0d6e6', borderRadius: 13 },
  placeholderWrap: { flex: 1, justifyContent: 'center', height: 48 },
  placeholder: { fontFamily: fonts.body, fontSize: 13, color: '#b0a2b7' },
  value: { fontFamily: fonts.body, fontSize: 13, color: '#6b6878' },
});
