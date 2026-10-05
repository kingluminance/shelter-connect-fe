import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { fonts } from '../lib/fonts';
import { ActionSheet, SheetOption } from './ActionSheet';
import { SvgIcon } from './SvgIcon';

// "최신순 ▾" label that actually opens a picker. The backend lists are fixed-order (no sort
// parameter), so callers re-order what is already loaded.
const SORT_CHEVRON = '<svg xmlns="http://www.w3.org/2000/svg" width="7" height="5" viewBox="0 0 7 5"><path d="M0.5 0.75L3.5 3.75L6.5 0.75" fill="none" stroke="#9c98a2" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function SortButton<K extends string>({ options, value, onChange, leading, size = 10.5 }: { options: { key: K; label: string }[]; value: K; onChange: (key: K) => void; leading?: ReactNode; size?: number }) {
  const [open, setOpen] = useState(false);
  const current = options.find(option => option.key === value) ?? options[0];
  return (
    <>
      <Pressable style={styles.button} onPress={() => setOpen(true)} hitSlop={10}>
        {leading}
        <Text style={[styles.text, { fontSize: size }]}>{current.label}</Text>
        <SvgIcon xml={SORT_CHEVRON} width={7} height={5} />
      </Pressable>
      <ActionSheet visible={open} onClose={() => setOpen(false)} title="정렬">
        {options.map(option => (
          <SheetOption
            key={option.key}
            title={option.label}
            selected={option.key === value}
            onPress={() => {
              setOpen(false);
              onChange(option.key);
            }}
          />
        ))}
      </ActionSheet>
    </>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { fontFamily: fonts.body, lineHeight: 15, color: '#9c98a2' },
});
