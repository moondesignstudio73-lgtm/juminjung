export type RoomStatus = "EMPTY" | "OCCUPIED" | "DAMAGED" | "LOCKED";
export type DiseaseType = "NORMAL_DISEASE" | "MONSTER_INFECTION" | "STORY_DISEASE" | "INJURY";

export type Position = { x: number; y: number };

export type RoomEffect = {
  id: string;
  sourceGuestId: string;
  name: string;
  metric: "diseaseChance";
  diseaseType: DiseaseType;
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
  currentRoomNumber: number | null;
  aura: AuraDefinition | null;
};

export type Resources = {
  food: number;
  medicine: number;
  fuel: number;
  security: number;
};

export type EventFlags = Record<string, boolean | number | string>;

export type GamePhase =
  | "title"
  | "prologue"
  | "desk"
  | "assignment"
  | "management"
  | "night"
  | "report";

export type GameState = {
  version: 2;
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
};
