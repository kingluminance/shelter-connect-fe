import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Calendar, Clock } from 'lucide-react-native';
import { fonts } from '../../../shared/lib/fonts';

const pad = (n: number) => String(n).padStart(2, '0');
const formatDate = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
const formatTime = (d: Date) => `${d.getHours() < 12 ? '오전' : '오후'} ${d.getHours() % 12 === 0 ? 12 : d.getHours() % 12}:${pad(d.getMinutes())}`;

// Figma "발생 날짜·시간": two 43px fields side by side. iOS shows the native compact picker inside
// each box; Android opens the system date / time dialog on tap.
export function DateTimeFields({ value, onChange }: { value: Date | null; onChange: (date: Date) => void }) {
  const merge = (base: Date, part: 'date' | 'time', picked: Date) => {
    const next = new Date(base);
    if (part === 'date') next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    return next;
  };

  return (
    <View style={styles.row}>
      <Field icon={<Calendar size={15} color="#b4a0bc" strokeWidth={1.8} />} value={value} part="date" label={value ? formatDate(value) : '날짜 선택'} onChange={onChange} merge={merge} />
      <Field icon={<Clock size={15} color="#b4a0bc" strokeWidth={1.8} />} value={value} part="time" label={value ? formatTime(value) : '시간 선택'} onChange={onChange} merge={merge} />
    </View>
  );
}

function Field({ icon, value, part, label, onChange, merge }: { icon: React.ReactNode; value: Date | null; part: 'date' | 'time'; label: string; onChange: (date: Date) => void; merge: (base: Date, part: 'date' | 'time', picked: Date) => Date }) {
  if (Platform.OS === 'ios' && value) {
    return (
      <View style={styles.field}>
        {icon}
        <DateTimePicker value={value} mode={part} display="compact" maximumDate={new Date()} locale="ko-KR" onChange={(_e, picked) => picked && onChange(merge(value, part, picked))} />
      </View>
    );
  }
  const open = () => {
    const base = value ?? new Date();
    if (Platform.OS === 'ios') return onChange(base); // first tap seeds "now"; the native picker then takes over
    DateTimePickerAndroid.open({ value: base, mode: part, maximumDate: new Date(), onChange: (e, picked) => e.type === 'set' && picked && onChange(merge(base, part, picked)) });
  };
  return (
    <Pressable style={styles.field} onPress={open}>
      {icon}
      <Text style={value ? styles.value : styles.placeholder}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1, height: 43, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#e1d8d1', borderRadius: 12 },
  placeholder: { fontFamily: fonts.body, fontSize: 12, color: '#b0a5af' },
  value: { fontFamily: fonts.body, fontSize: 12, color: '#8b808f' },
});
