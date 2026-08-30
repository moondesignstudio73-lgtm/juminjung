export type RoomStatus = "EMPTY" | "OCCUPIED" | "DAMAGED" | "LOCKED";
export type DiseaseType = "NORMAL_DISEASE" | "MONSTER_INFECTION" | "STORY_DISEASE" | "INJURY";

export type Position = { x: number; y: number };

export type AuraMetric = "diseaseChance" | "injuryRecovery" | "breakdownRisk" | "stress" | "security" | "foodUse" | "trade" | "information" | "monsterThreat" | "theftRisk" | "trust";
export type RoomEffect = {
  id: string;
  sourceGuestId: string;
  name: string;
  metric: AuraMetric;
  diseaseType?: DiseaseType;
  operation: "SET" | "ADD" | "MULTIPLY";
  value: number;
};

export type Room = {
  roomNumber: number;
  floor: number;
  position: Position;
  occupied: boolean;
  guestId: string | null;
  roomCondition: number;
  status: RoomStatus;
  temporaryEffects: RoomEffect[];
  permanentEffects: RoomEffect[];
};

export type AuraDefinition = Omit<RoomEffect, "id" | "sourceGuestId"> & {
  id: string;
  radius: number;
  distance: "CHEBYSHEV" | "MANHATTAN";
  description: string;
};

export type Guest = {
  id: string;
  name: string;
  role: string;
  age: number;
  gender: string;
  description: string;
  portrait: string;
  expressions: string[];
  arrivalDay: number;
  arrivalDayRange: [number, number];
  arrivalConditions: { type: "GUEST_APPEARED" | "FLAG"; key: string; value?: boolean | number | string }[];
  conditionLabel: string;
  introDialogue: string;
  negotiationDialogue: string;
  questions: { id: string; label: string; answer: string }[];
  offeredItems: { id: string; type: "FOOD" | "FUEL" | "MEDICINE" | "VALUABLE" | "INFORMATION"; name: string; short: string; detail: string; negotiatedOnly?: boolean }[];
  offer: Partial<Resources>;
  negotiatedOffer: Partial<Resources>;
  hiddenTraits: string[];
  baseTraits: string[];
  discoveredTraits: string[];
  health: number;
  stress: number;
  trust: number;
  riskLevel: number;
  relationships: { targetId: string; type: string; value: number }[];
  storyFlags: Record<string, boolean | number | string>;
  eventChain: { id: string; stage: "ARRIVAL" | "LIFE_AT_HOTEL" | "CONFLICT" | "RESOLUTION"; title: string; completed: boolean }[];
  infectionState: "HEALTHY" | "INJURED" | "SICK" | "INFECTED_SUSPECTED" | "INFECTED";
  alive: boolean;
  endingState: string | null;
  currentRoomNumber: number | null;
  stayDuration: number;
  remainingNights: number;
  checkedInDay: number | null;
  status: "WAITING" | "STAYING" | "CHECKED_OUT" | "REFUSED";
  aura: AuraDefinition | null;
};

export type Resources = {
  food: number;
  water: number;
  medicine: number;
  fuel: number;
  parts: number;
  security: number;
};

export type HotelLogEntry = { day: number; type: "CHECK_IN" | "CHECK_OUT" | "RESOURCE" | "EVENT"; message: string };

export type DaySummary = {
  completedDay: number;
  nextDay: number;
  occupiedGuests: number;
  consumed: { food: number; water: number; fuel: number };
  checkedOutGuestIds: string[];
};

export type EventFlags = Record<string, boolean | number | string>;
export type WorldState = "STABLE" | "UNREST" | "COLLAPSE" | "CRITICAL" | "END_STAGE";
export type EndingStatus = "UNKNOWN" | "IN_PROGRESS" | "AVAILABLE" | "COMPLETED";
export type EndingId = "SAFE_HAVEN" | "THE_TRUTH" | "FORTRESS" | "HOME" | "KING_OF_THE_RUINS" | "MILITARY_OCCUPATION" | "THE_DOOR";
export type EndingCondition = {
  endingId: EndingId;
  name: string;
  priority: number;
  hidden?: boolean;
  description: string;
  requiredFlags?: EventFlags;
  forbiddenFlags?: string[];
  minimumStats?: Partial<HotelStats>;
  maximumStats?: Partial<HotelStats>;
  requiredNPCStates?: { id: string; alive?: boolean; minimumTrust?: number; completedStory?: boolean }[];
  requiredRelationships?: { sourceId: string; targetId: string; minimumValue: number }[];
  requiredFacilities?: string[];
  requiredReputation?: Partial<Reputations>;
  maximumReputation?: Partial<Reputations>;
  requiredWorldState?: WorldState[];
  requiredStoryProgress?: string[];
};
export type HotelStats = { hotelCondition: number; security: number; foodSustainability: number; waterSustainability: number; crime: number; survivorPopulation: number; averageTrust: number; resources: number };
export type Reputations = { community: number; military: number; refugee: number; merchant: number; humanitarian: number };
export type FacilityId = "water_purifier" | "food_production" | "armory" | "trade_network";
export type HotelActionId = "repair_hotel" | "community_outreach" | "security_patrol" | "trade_run";
export type FacilityDefinition = { id: FacilityId; name: string; description: string; cost: Partial<Resources>; statChanges: Partial<HotelStats>; reputationChanges: Partial<Reputations> };
export type NightEventCondition = { worldStates?: WorldState[]; minimumDay?: number; dayModulo?: number; minimumThreat?: number; maximumSecurity?: number; maximumResource?: Partial<Resources>; shortage?: "food" | "water"; requiresGuests?: boolean };
export type NightEventEffect = { resources?: Partial<Resources>; hotelStats?: Partial<HotelStats>; reputations?: Partial<Reputations>; flags?: EventFlags; threat?: number; allGuestStress?: number; targetGuestHealth?: number };
export type NightEventChoice = { id: string; label: string; description: string; requiredResources?: Partial<Resources>; effect: NightEventEffect };
export type NightEventDefinition = { id: string; title: string; description: string; quote: string; priority: number; condition: NightEventCondition; choices: NightEventChoice[] };
export type ActiveRelationship = { sourceId: string; targetId: string; type: string; value: number; distanceMultiplier: 1 | 1.5 | 2; weightedValue: number };
export type ActiveSynergy = { id: string; name: string; guestIds: string[]; affectedRoomNumbers: number[]; description: string };

export type GamePhase =
  | "title"
  | "prologue"
  | "desk"
  | "assignment"
  | "management"
  | "night"
  | "report"
  | "ending";

export type GameState = {
  version: 7;
  phase: GamePhase;
  day: number;
  rooms: Room[];
  guests: Guest[];
  resources: Resources;
  flags: EventFlags;
  asked: string[];
  inspected: string[];
  negotiated: boolean;
  held: boolean;
  decision: "checkin" | "refuse" | null;
  assignmentMode: "checkin" | "move" | null;
  selectedRoomNumber: number | null;
  eventHistory: HotelLogEntry[];
  lastDaySummary: DaySummary | null;
  worldState: WorldState;
  hotelStats: HotelStats;
  reputations: Reputations;
  facilities: Record<string, boolean>;
  availableEndings: EndingId[];
  completedEndingFlags: EndingId[];
  endingProgress: Partial<Record<EndingId, EndingStatus>>;
  fatherStoryProgress: number;
  endingRelatedFlags: EventFlags;
  activeEndingId: EndingId | null;
  actionPoints: number;
  maxActionPoints: number;
  selectedNightEventId: string | null;
  selectedNightChoiceId: string | null;
  lastNightEventId: string | null;
};
