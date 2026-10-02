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

// docs/personal-discovery-api.md — GET /v1/shelter-discovery. distanceMeters is null unless
// the request carried a reference latitude/longitude (or this shelter has no coordinates).
export interface ShelterDiscoveryItem {
  id: string;
  name: string;
  region: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  mapKey: string;
  dogCount: number;
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

// docs/dog-action-playback-spec.md (v2) — GET /v1/dogs/{dogId}/assets.
export interface DogAssetFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  durationMs: number;
}

export interface DogAssetClip {
  spritesheetUrl: string;
  frameCount: number;
  loop: boolean;
  holdLastFrame: boolean;
  returnToIdle: 'DIRECT' | 'REVERSE_FRAMES';
  frames: DogAssetFrame[];
  // Not read anywhere (dogStateMachine.ts derives movement from a pre-computed target,
  // not this field) — optional because per-direction clips (mapDirections below) don't
  // carry it at all, unlike the original single-direction `animations` clips.
  movement?: { mode: 'STATIONARY' | 'FORWARD' | 'BACKWARD'; defaultSpeedTilesPerSecond: number };
}

// docs/map-dog-sprites.md (2026.09.28 배송) — RIGHT reuses `animations` above 1:1; DOWN/UP
// are new front/rear art (IDLE+WALK only so far); LEFT has no art of its own, it's RIGHT
// mirrored (see spritePlayback.ts's selectDirectionalClip).
export type DogSpriteDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface DogAssetManifest {
  id: string;
  availableActions: DogActionKey[];
  fallbackAction: DogActionKey;
  frameSize: { width: number; height: number };
  anchorPixels: { x: number; y: number };
  baseUrl: string;
  expiresAt: string;
  animations: Partial<Record<DogActionKey, DogAssetClip>>;
  mapDirections?: Partial<Record<DogSpriteDirection, Partial<Record<DogActionKey, DogAssetClip>>>>;
}

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

// docs/personal-discovery-api.md (B-35)
export interface UserPreferences {
  currentShelterId: string | null;
}

export interface SavedDog {
  dogId: string;
  dogName: string;
  shelterId: string;
  shelterName: string;
  avatarKey: string;
  adoptionStatus: AdoptionStatus;
  savedAt: string;
  sessionId: string | null;
}

// docs/chat-storage-api.md (B-06) + docs/grounded-chat-api.md (B-07)
export interface ChatSession {
  id: string;
  dogId: string;
  status: 'OPEN' | 'CLOSED';
  canSend: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ChatMessageRole = 'USER' | 'ASSISTANT';
export type ChatProcessingStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface ChatMessage {
  id: string;
  sessionId: string;
  dogId: string;
  role: ChatMessageRole;
  text: string;
  clientMessageId: string | null;
  replyToMessageId: string | null;
  processingStatus: ChatProcessingStatus;
  failureCode: string | null;
  needsShelterConfirmation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatReplyResult {
  requestMessageId: string;
  processingStatus: ChatProcessingStatus;
  failureCode: string | null;
  retryable: boolean;
  reply: ChatMessage | null;
}

// docs/photo-read-api.md (B-08/B-12) — only reachable after 1+ COMPLETED chat reply.
export interface DogPhoto {
  id: string;
  dogId: string;
  sortOrder: number;
  caption: string | null;
  url: string;
  expiresAt: string;
}
