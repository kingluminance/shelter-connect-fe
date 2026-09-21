import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useShelters } from './hooks/useShelters';
import type { Shelter } from './types';
import type { RootStackParamList } from '../../app/navigation';

// ponytail: only sunnyMeadow map assets exist so far (GameScreen.tsx), so every
// shelter opens that map regardless of its real mapKey. Wire mapKey → asset
// folder once woodlandTrail/lakesideRetreat are hooked up.
export function ShelterListScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const state = useShelters();

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.statusText}>보호소 불러오는 중… (서버가 잠들어 있으면 최대 1분)</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.statusText}>보호소를 못 불러왔어요: {state.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={state.shelters}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: Shelter }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('Game', { shelterId: item.id })}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.region} · 강아지 {item.dogCount}마리</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', gap: 8 },
  statusText: { color: '#000' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#f4f4f4',
    borderRadius: 12,
    padding: 16,
  },
  name: { fontSize: 18, fontWeight: '700', color: '#000' },
  meta: { fontSize: 14, color: '#666', marginTop: 4 },
});
