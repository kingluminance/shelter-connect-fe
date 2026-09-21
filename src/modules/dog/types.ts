// Matches the deployed backend's real contract — see HANN-Creator/shelter-connect
// docs/read-api.md and docs/dog-behavior-api.md (not the earlier Obsidian draft).

export interface Shelter {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  mapKey: string;
  dogCount: number;
}

export interface ShelterDetail extends Shelter {
  address: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
}

export type AdoptionStatus = 'AVAILABLE' | 'IN_PROGRESS' | 'ADOPTED' | 'PAUSED';

export interface DogSummary {
  id: string;
  shelterId: string;
  name: string;
  species: 'DOG';
  adoptionStatus: AdoptionStatus;
  avatarKey: string;
  traitLabels: string[];
}

export type BirthDatePrecision = 'UNKNOWN' | 'YEAR' | 'MONTH' | 'DAY';

export interface DogProfile extends DogSummary {
  sex: 'MALE' | 'FEMALE' | 'UNKNOWN';
  breed: string | null;
  birthDate: string | null;
  birthDatePrecision: BirthDatePrecision;
  birthDateEstimated: boolean | null;
  weightKg: number | null;
  neutered: boolean | null;
  introduction: string | null;
}

export type DogActionKey =
  | 'IDLE'
  | 'WALK'
  | 'RUN'
  | 'SNIFF'
  | 'TAIL_WAG'
  | 'BACK_OFF'
  | 'SIT'
  | 'LIE_DOWN';

export interface DogActionSetting {
  weight: number;
  speedTilesPerSecond: number;
  minDurationMs: number;
  maxDurationMs: number;
  cooldownMs: number;
}

export interface DogBehaviorSettings {
  actions: Record<DogActionKey, DogActionSetting>;
  approachDistanceTiles: number;
  personalSpaceTiles: number;
  reactionDelayMs: number;
  ballPlay: { chaseEnabled: boolean; returnEnabled: boolean; reactionDelayMs: number };
}

export interface DogBehavior {
  dogId: string;
  schemaVersion: number;
  basis: 'CONFIRMED' | 'DEFAULT';
  revision: number | null;
  settings: DogBehaviorSettings;
}

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}
