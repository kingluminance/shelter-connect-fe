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
