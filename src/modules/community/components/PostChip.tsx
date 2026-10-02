import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../../shared/lib/fonts';
import { CATEGORY_LABEL } from '../postText';
import type { CommunityCategory } from '../types';

// Figma "게시글 유형" chip: pink (찾고 있어요) / green (발견했어요); 동네 소식 reuses the app's lavender.
const CHIP: Record<CommunityCategory, { bg: string; fg: string }> = {
  LOST: { bg: '#f5e4e7', fg: '#ba8693' },
  FOUND: { bg: '#eaf0e3', fg: '#8a9e77' },
  NEIGHBOR_NEWS: { bg: '#efe9f5', fg: '#9d8cab' },
};

export function PostChip({ category, large }: { category: CommunityCategory; large?: boolean }) {
  const color = CHIP[category];
  return (
    <View style={[styles.chip, large && styles.chipLarge, { backgroundColor: color.bg }]}>
      <Text style={[styles.text, { color: color.fg }]}>{CATEGORY_LABEL[category]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', height: 23, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' },
  chipLarge: { height: 25 },
  text: { fontFamily: fonts.pixel, fontSize: 10, lineHeight: 14 },
});
