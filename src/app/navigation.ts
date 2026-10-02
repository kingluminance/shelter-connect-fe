import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type MainTabParamList = {
  홈: undefined;
  보호소: undefined;
  커뮤니티: undefined;
  '저장한 친구': undefined;
  대화: undefined;
};

export type RootStackParamList = {
  Home: undefined;
  Game: { shelterId: string; shelterName: string };
  Chat: { dogId: string; dogName: string; identityIndex: number; shelterName: string };
  Login: undefined;
  Profile: {
    dogId: string;
    dogName: string;
    identityIndex: number;
    knownFacts: string[];
    pendingQuestions: string[];
  };
};

/** For screens that live inside MainTabs but still need to push a root-stack route
 * (Game/Login/...) or switch to a sibling tab — e.g. HomeScreen, ShelterTabScreen. */
export type HomeTabScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;
