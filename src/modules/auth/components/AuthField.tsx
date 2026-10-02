import { useState, type ComponentType } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { fonts } from '../../../shared/lib/fonts';

interface AuthFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  /** Password fields get the eye toggle (Figma 15/16). */
  secure?: boolean;
}

// Figma "Auth / Field": 13px Galmuri label over a 48px rounded input with a leading icon.
export function AuthField({ label, Icon, secure, ...input }: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        <Icon size={18} color="#b2a3bc" strokeWidth={1.6} />
        <TextInput
          {...input}
          style={styles.input}
          placeholderTextColor="#b0a2b7"
          secureTextEntry={secure && !revealed}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {secure && (
          <Pressable onPress={() => setRevealed(v => !v)} hitSlop={10}>
            {revealed ? <EyeOff size={18} color="#b2a3bc" strokeWidth={1.6} /> : <Eye size={18} color="#b2a3bc" strokeWidth={1.6} />}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  label: { fontFamily: fonts.pixel, fontSize: 13, lineHeight: 18, color: '#8c7b99', marginLeft: 1 },
  box: {
    height: 49,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fffefa',
    borderWidth: 0.9,
    borderColor: '#dccfe3',
    borderRadius: 13,
  },
  input: { flex: 1, padding: 0, fontFamily: fonts.body, fontSize: 12, color: '#6b6878' },
});
