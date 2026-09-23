import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Canvas, useImage } from '@shopify/react-native-skia';
// Same cross-module reuse as ChatScreen — see the comment there.
import { SpriteFrame } from '../game/core/entities/SpriteFrame';
import { DOG_FRAME_SIZE, dogIdleRow, dogWalkAtlas } from '../game/core/assets/dog/dogWalkAtlas';
import { useDogProfile } from './hooks/useDogProfile';
import { formatBirthDate } from './birthDate';
import type { RootStackParamList } from '../../app/navigation';

const AVATAR_SIZE = 140;
const SEX_LABEL: Record<string, string> = { MALE: '남아', FEMALE: '여아', UNKNOWN: '성별 미확인' };

export function ProfileScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Profile'>>();
  const dogSheet = useImage(dogWalkAtlas);
  const state = useDogProfile(params.dogId);
  const [showRealPhoto, setShowRealPhoto] = useState(true);

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>소개서를 못 불러왔어요: {state.message}</Text>
      </View>
    );
  }

  const { profile, photos } = state;
  const firstPhoto = photos.status === 'ready' ? photos.photos[0] : null;
  const showPhoto = showRealPhoto && firstPhoto;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>우리 대화에,{'\n'}이제 얼굴을 더해요.</Text>

      <View style={styles.sheet}>
        <Text style={styles.sheetKicker}>HELLO, MY FRIEND</Text>
        <Text style={styles.sheetTitle}>나를 소개할게!</Text>

        <View style={styles.portrait}>
          {showPhoto ? (
            <Image source={{ uri: firstPhoto.url }} style={styles.photoImage} resizeMode="cover" />
          ) : dogSheet ? (
            <Canvas style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}>
              <SpriteFrame
                sheet={dogSheet}
                frameSize={DOG_FRAME_SIZE}
                col={0}
                row={dogIdleRow(params.identityIndex)}
                x={0}
                y={0}
                size={AVATAR_SIZE}
              />
            </Canvas>
          ) : null}
        </View>

        <View style={styles.basicInfo}>
          <InfoRow label="이름" value={profile.name} />
          <InfoRow label="성별 · 나이" value={SEX_LABEL[profile.sex]} />
          <InfoRow label="생일" value={formatBirthDate(profile)} />
        </View>

        {photos.status === 'ready' && photos.photos.length > 0 && (
          <View style={styles.switchRow}>
            <Pressable style={[styles.switchButton, !showRealPhoto && styles.switchButtonActive]} onPress={() => setShowRealPhoto(false)}>
              <Text style={styles.switchButtonText}>도트 모습</Text>
            </Pressable>
            <Pressable style={[styles.switchButton, showRealPhoto && styles.switchButtonActive]} onPress={() => setShowRealPhoto(true)}>
              <Text style={styles.switchButtonText}>실제 사진</Text>
            </Pressable>
          </View>
        )}
        {photos.status === 'locked' && (
          <Text style={styles.lockedNote}>실제 사진은 대화를 나눈 뒤에 열려요. 조금 더 이야기해볼까요?</Text>
        )}
        {photos.status === 'error' && (
          <Text style={styles.lockedNote}>사진을 못 불러왔어요: {photos.message}</Text>
        )}

        <View style={styles.lines}>
          <InfoLine label="외형 특징" value={profile.breed ?? '아직 기록 없음'} />
          <InfoLine
            label="체중"
            value={profile.weightKg != null ? `${profile.weightKg}kg` : '아직 기록 없음'}
          />
          <InfoLine
            label="중성화"
            value={profile.neutered === true ? '완료' : profile.neutered === false ? '미실시' : '미확인'}
          />
          <InfoLine label="소개" value={profile.introduction ?? '아직 소개 글이 없어요.'} />
        </View>
      </View>

      {params.knownFacts.length > 0 && (
        <View style={styles.factsBlock}>
          <Text style={styles.factsTitle}>우리 대화에서 알아본 것</Text>
          {params.knownFacts.map((fact, i) => (
            <Text key={i} style={styles.factItem}>· {fact}</Text>
          ))}
        </View>
      )}

      {params.pendingQuestions.length > 0 && (
        <View style={styles.factsBlock}>
          <Text style={styles.factsTitle}>아직 확인할 이야기</Text>
          {params.pendingQuestions.map((q, i) => (
            <Text key={i} style={styles.factItem}>· {q}</Text>
          ))}
        </View>
      )}

      <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>조금 더 이야기하기</Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLineLabel}>{label}</Text>
      <Text style={styles.infoLineValue}>{value}</Text>
    </View>
  );
}

const INK = '#584b42';
const PAPER = '#fffbef';
const LINE = '#cfbca8';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e9f2f8',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e9f2f8',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  errorText: {
    color: '#b3364f',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: '#277fb0',
    marginBottom: 16,
  },
  sheet: {
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: '#bca885',
    borderRadius: 14,
    padding: 18,
  },
  sheetKicker: {
    fontSize: 10,
    letterSpacing: 1,
    color: INK,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: INK,
    marginTop: 4,
    marginBottom: 14,
  },
  portrait: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignSelf: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#cdd8e8',
    marginBottom: 14,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  basicInfo: {
    gap: 10,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    borderStyle: 'dashed',
    paddingBottom: 8,
  },
  infoRowLabel: {
    fontSize: 12,
    color: '#8c7a5f',
  },
  infoRowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: INK,
  },
  switchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  switchButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  switchButtonActive: {
    backgroundColor: '#ffe4e9',
    borderColor: '#ff879e',
  },
  switchButtonText: {
    fontSize: 12,
    color: INK,
  },
  lockedNote: {
    fontSize: 12,
    color: '#8c7a5f',
    marginBottom: 14,
    lineHeight: 18,
  },
  lines: {
    gap: 12,
  },
  infoLine: {
    borderTopWidth: 1,
    borderTopColor: LINE,
    borderStyle: 'dashed',
    paddingTop: 10,
  },
  infoLineLabel: {
    fontSize: 12,
    color: '#8c7a5f',
    marginBottom: 4,
  },
  infoLineValue: {
    fontSize: 13,
    lineHeight: 20,
    color: INK,
  },
  factsBlock: {
    marginTop: 18,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
  },
  factsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#277fb0',
    marginBottom: 8,
  },
  factItem: {
    fontSize: 12,
    color: '#333',
    lineHeight: 20,
  },
  secondaryButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#277fb0',
    fontSize: 13,
  },
});
