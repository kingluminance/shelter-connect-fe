export type RootStackParamList = {
  Home: undefined;
  Game: { shelterId: string };
  Chat: { dogId: string; dogName: string; identityIndex: number };
  Login: undefined;
  Profile: {
    dogId: string;
    dogName: string;
    identityIndex: number;
    knownFacts: string[];
    pendingQuestions: string[];
  };
};
