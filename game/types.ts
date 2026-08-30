export type RoomStatus = "EMPTY" | "OCCUPIED" | "DAMAGED" | "LOCKED";
export type DiseaseType = "NORMAL_DISEASE" | "MONSTER_INFECTION" | "STORY_DISEASE" | "INJURY";

export type Position = { x: number; y: number };

export type AuraMetric = "diseaseChance" | "breakdownRisk" | "stress" | "security" | "foodUse" | "trade" | "information" | "monsterThreat" | "theftRisk" | "trust";
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
  version: 4;
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
};
