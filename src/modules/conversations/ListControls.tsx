import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { fonts } from '../../shared/lib/fonts';
import { SvgIcon } from '../../shared/ui/SvgIcon';
import { svgAssets as dogSvgAssets } from '../dog/assets/svgAssets';

// Search box + filter chips + sort label shared by both 대화 tab lists (Figma 04).
export function SearchBox({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <Search size={18} color="#b2a7b9" strokeWidth={1.7} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#aaa4ae"
        returnKeyType="search"
        autoCorrect={false}
      />
    </View>
  );
}

export interface FilterOption {
  key: string;
  label: string;
  count?: number;
}

export function FilterRow({ options, selected, onSelect, sortLabel }: { options: FilterOption[]; selected: string; onSelect: (key: string) => void; sortLabel: string }) {
  return (
    <View style={styles.filterRow}>
      {options.map(option => {
        const active = option.key === selected;
        return (
          <Pressable key={option.key} style={[styles.chip, active && styles.chipActive]} onPress={() => onSelect(option.key)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            {option.count !== undefined && (
              <View style={[styles.chipCount, active && styles.chipCountActive]}>
                <Text style={styles.chipCountText}>{option.count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
      <View style={styles.sort}>
        <Text style={styles.sortText}>{sortLabel}</Text>
        <SvgIcon xml={dogSvgAssets.sort} width={7} height={5} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 17,
    backgroundColor: '#fffefa',
    borderWidth: 1,
    borderColor: '#dddcd9',
    borderRadius: 13,
  },
  searchInput: { flex: 1, padding: 0, fontFamily: fonts.body, fontSize: 12, color: '#6b6878' },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  chip: { height: 32, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fffef9', borderWidth: 0.8, borderColor: '#e4ded8', borderRadius: 13 },
  chipActive: { backgroundColor: '#ede2f3', borderColor: '#d0bce0' },
  chipText: { fontFamily: fonts.pixel, fontSize: 11, lineHeight: 15, color: '#99929e' },
  chipTextActive: { color: '#8c749f' },
  chipCount: { minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 8, backgroundColor: '#f0eaf3', alignItems: 'center', justifyContent: 'center' },
  chipCountActive: { backgroundColor: '#e3d4ee' },
  chipCountText: { fontFamily: fonts.pixel, fontSize: 9, lineHeight: 13, color: '#a591b0' },
  sort: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 },
  sortText: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 15, color: '#9c98a2' },
});
