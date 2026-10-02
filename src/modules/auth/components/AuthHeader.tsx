import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { SvgIcon } from '../../../shared/ui/SvgIcon';
import { fonts } from '../../../shared/lib/fonts';
import { svgAssets as dogSvgAssets } from '../../dog/assets/svgAssets';

// Round back button + page title + paw (Figma 15/16/18 header, y=54).
export function AuthHeader({ title }: { title: string }) {
  const navigation = useNavigation();
  return (
    <View style={styles.row}>
      <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={10}>
        <ChevronLeft size={16} color="#7b8d99" strokeWidth={2} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <SvgIcon xml={dogSvgAssets.pawTitle} width={22} height={22} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 34 },
  back: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f7fcfc', borderWidth: 0.8, borderColor: '#cce2e7', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, marginLeft: 17, fontFamily: fonts.pixel, fontSize: 21, lineHeight: 29, color: '#5e7383' },
});
