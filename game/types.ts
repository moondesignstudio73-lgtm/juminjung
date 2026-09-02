export type RoomStatus = "EMPTY" | "OCCUPIED" | "DAMAGED" | "LOCKED";
export type DiseaseType = "NORMAL_DISEASE" | "MONSTER_INFECTION" | "STORY_DISEASE" | "INJURY";
export type GuestExpression = "neutral" | "happy" | "sad" | "angry" | "afraid" | "suspicious" | "injured";
export type NpcType = "NORMAL" | "MAIN";
export type GuestResidency = "TEMPORARY" | "STORY_LOCKED" | "RESIDENT" | "STAFF";
export type RevisitPolicy = "ALWAYS" | "CONDITIONAL" | "NEVER";
export type GuestSkills = { work: number; combat: number; medical: number; repair: number; scavenge: number; social: number };
export type StaffDutyId = "MAINTENANCE" | "SECURITY" | "MEDICAL" | "KITCHEN" | "SCAVENGE";
export type StaffAssignments = Partial<Record<StaffDutyId, string>>;
export type ScavengeMissionId = "NEARBY_BLOCK" | "ABANDONED_PHARMACY" | "FUEL_DEPOT";
export type ScavengeOutcome = "CLEAN_SUCCESS" | "SUCCESS" | "SETBACK";
export type InvestigationCaseId = "ROOM_207";
export type EvidenceId = "ROOM_207_INTERIOR_KEY" | "ROOM_207_WINDOW_TRACE" | "ROOM_207_BLACK_RESIDUE" | "ROOM_207_GUEST_LEDGER";
export type InvestigationPointId = "ROOM_207_DOOR" | "ROOM_207_WINDOW" | "ROOM_207_FLOOR" | "ROOM_207_LUGGAGE";
export type InvestigationConclusionId = "VOLUNTARY_EXIT" | "HUMAN_ATTACK" | "MONSTER_ENTRY" | "UNRESOLVED";
export type InvestigationCaseStatus = "OPEN" | "INVESTIGATING" | "SOLVED" | "UNRESOLVED";
export type EvidenceAssessment = "UNKNOWN" | "SUPPORTED" | "CONTRADICTED";
export type VisitorStatementAssessment = "RECORDED" | "CORROBORATED" | "CONTRADICTED";
export type VisitorStatementId = "RUTH_SCRATCH_CLAIM" | "HAZEL_TRACKS_TESTIMONY" | "WHITE_FALSE_VOICE_WARNING";
export type MonsterCodexEntryId = "MIMIC_STALKER" | "SIGNAL_PARASITE";
export type MonsterInsightId = "TRIPLE_CLAW_PATTERN" | "SHIFTING_GAIT" | "INTERIOR_EXIT_ROUTE" | "BORROWED_VOICE" | "SYNCHRONIZED_CALLS" | "RELAY_ECHO";
export type MonsterKnowledgeSourceId = "RUTH_SCRATCH_CONTRADICTION" | "HAZEL_TRACKS_TESTIMONY" | "ROOM_207_MONSTER_CONCLUSION" | "WHITE_FALSE_VOICE_WARNING" | "RADIO_SURVIVOR_CHORUS" | "FATHER_RELAY_TRACE";
export type MonsterKnowledgeCertainty = "RUMOR" | "CORROBORATED" | "VERIFIED";

export type Position = { x: number; y: number };

export type AuraMetric = "diseaseChance" | "injuryRecovery" | "breakdownRisk" | "stress" | "security" | "foodUse" | "trade" | "information" | "monsterThreat" | "theftRisk" | "trust";
export type AuraCategory = "MEDICAL" | "MAINTENANCE" | "SECURITY" | "FOOD" | "MENTAL" | "DANGER" | "UNKNOWN" | "TRADE" | "INFORMATION";
export type AuraIcon = "heart-pulse" | "wrench" | "shield" | "utensils" | "brain" | "triangle-alert" | "circle-help" | "handshake" | "search";
export type AuraId = "medical-care-zone" | "maintenance-zone" | "comfort-presence" | "family-bond" | "security-presence" | "nursing-care" | "trade-network" | "faith" | "combat-readiness" | "military-control" | "information-network" | "kitchen-efficiency" | "resource-optimization" | "community-care" | "theft-risk" | "monster-analysis" | "perimeter-watch" | "power-optimization" | "protective-instinct" | "unknown-presence";
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
  id: AuraId;
  shortLabel: string;
  category: AuraCategory;
  icon: AuraIcon;
  radius: number;
  distance: "CHEBYSHEV" | "MANHATTAN";
  description: string;
};

export type Guest = {
  id: string;
  npcType: NpcType;
  residency: GuestResidency;
  storyLockedResident: boolean;
  revisitPolicy: RevisitPolicy;
  generated: boolean;
  faction: "INDEPENDENT" | "REFUGEE" | "MERCHANT" | "MILITARY" | "COMMUNITY";
  name: string;
  role: string;
  age: number;
  gender: string;
  description: string;
  portrait: string;
  portraitVariants: Partial<Record<GuestExpression, string>>;
  expressions: GuestExpression[];
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
  skills: GuestSkills;
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

export type VisitorDecision = "ACCEPTED" | "REFUSED";
export type StoryVisitorArrivalId = "samuel_rescue_survivor";
export type VisitorHistoryRecord = {
  visitorId: string;
  firstVisitDay: number;
  lastVisitDay: number;
  acceptedCount: number;
  refusedCount: number;
  roomsStayed: number[];
  itemsPaid: Partial<Resources>;
  events: string[];
  finalState: string;
};

export type Resources = {
  food: number;
  water: number;
  medicine: number;
  fuel: number;
  parts: number;
  security: number;
};

export type FoodRationPolicy = "NORMAL" | "LIMITED" | "SEVERE";
export type PowerCircuitId = "SECURITY" | "CLINIC" | "KITCHEN";
export type NightPreparationCategory = "PATROL" | "ISOLATION" | "EXTERIOR_LIGHT" | "NOISE";
export type NightPreparationOptionId = "STANDARD_WATCH" | "ROVING_PATROL" | "OPEN_FLOORS" | "SEALED_WINGS" | "DARK_PERIMETER" | "EXTERIOR_LIGHTS" | "NORMAL_HOURS" | "SILENCE_PROTOCOL";
export type NightPreparationConfig = Record<NightPreparationCategory, NightPreparationOptionId>;
export type NightPreparationEffect = { fuelCost?: number; hotelStats?: Partial<Pick<HotelStats, "security" | "crime" | "hotelCondition">>; threat?: number; allGuestStress?: number; diseaseChance?: number };
export type NightPreparationOptionDefinition = { id: NightPreparationOptionId; category: NightPreparationCategory; name: string; description: string; tradeoff: string; requiresPowerCircuit?: PowerCircuitId; effect: NightPreparationEffect };
export type DailyPriority = "URGENT" | "RECOMMENDED" | "OPTIONAL";
export type DailyObjective = {
  id: string;
  priority: DailyPriority;
  title: string;
  description: string;
  actionHint: string;
};

export type RelationshipChange = { sourceId: string; targetId: string; delta: number; type?: string };
export type HotelLogEntry = { day: number; type: "CHECK_IN" | "CHECK_OUT" | "RESOURCE" | "EVENT"; message: string; relationshipChanges?: RelationshipChange[] };

export type DaySummary = {
  completedDay: number;
  nextDay: number;
  occupiedGuests: number;
  consumed: { food: number; water: number; fuel: number };
  baseFoodDemand?: number;
  foodRationPolicy?: FoodRationPolicy;
  poweredCircuits?: PowerCircuitId[];
  powerCapacity?: number;
  survivalWarnings?: string[];
  facilityProduction?: Partial<Resources>;
  facilityUpkeep?: Partial<Resources>;
  facilityUpkeepSaving?: Partial<Resources>;
  inactiveFacilities?: FacilityId[];
  staffFoodSaving?: number;
  staffDutyResults?: StaffDutyResult[];
  nightPreparationOptionIds?: NightPreparationOptionId[];
  checkedOutGuestIds: string[];
};

export type StaffDutyResult = { dutyId: Exclude<StaffDutyId, "SCAVENGE">; guestId: string; guestName: string; effect: string };
export type ScavengeReport = {
  day: number;
  missionId: ScavengeMissionId;
  missionName: string;
  guestId: string;
  guestName: string;
  chance: number;
  roll: number;
  outcome: ScavengeOutcome;
  resources: Partial<Resources>;
  threatDelta: number;
  healthDelta: number;
  message: string;
};

export type EventFlags = Record<string, boolean | number | string>;
export type WorldState = "STABLE" | "UNREST" | "COLLAPSE" | "CRITICAL" | "END_STAGE";
export type EndingStatus = "UNKNOWN" | "IN_PROGRESS" | "AVAILABLE" | "COMPLETED";
export type EndingId = "SAFE_HAVEN" | "THE_TRUTH" | "FORTRESS" | "HOME" | "KING_OF_THE_RUINS" | "MILITARY_OCCUPATION" | "THE_DOOR";
export type EndingScene = { id: string; title: string; body: string; quote: string };
export type EndingNarrative = { endingId: EndingId; kicker: string; image?: string; imageAlt?: string; scenes: EndingScene[] };
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
  requiredFacilities?: FacilityId[];
  requiredReputation?: Partial<Reputations>;
  maximumReputation?: Partial<Reputations>;
  requiredWorldState?: WorldState[];
  requiredStoryProgress?: string[];
};
export type HotelStats = { hotelCondition: number; security: number; foodSustainability: number; waterSustainability: number; crime: number; survivorPopulation: number; averageTrust: number; resources: number };
export type Reputations = { community: number; military: number; refugee: number; merchant: number; humanitarian: number };
export type VisitorReactionDefinition = { id: string; guestId: string; label: string; faction: keyof Reputations; dialogue: string; requiredFlags?: EventFlags; forbiddenFlags?: string[]; minimumReputation?: Partial<Reputations>; maximumReputation?: Partial<Reputations>; trustDelta: number; riskDelta?: number; offerBonus?: Partial<Resources> };
export type FacilityId = "water_purifier" | "food_production" | "armory" | "trade_network";
export type HotelActionId = "repair_hotel" | "community_outreach" | "security_patrol" | "trade_run";
export type FacilityLevelDefinition = { level: 1 | 2 | 3; name: string; description: string; cost: Partial<Resources>; production?: Partial<Resources>; upkeep?: Partial<Resources>; statChanges: Partial<HotelStats>; reputationChanges: Partial<Reputations> };
export type FacilityDefinition = { id: FacilityId; name: string; description: string; levels: FacilityLevelDefinition[] };
export type NightEventCondition = { worldStates?: WorldState[]; minimumDay?: number; dayModulo?: number; minimumThreat?: number; maximumSecurity?: number; maximumResource?: Partial<Resources>; shortage?: "food" | "water"; requiresGuests?: boolean; requiredEmptyRoomNumber?: number; requiredFlags?: EventFlags; forbiddenFlags?: string[]; relationship?: { sourceId: string; targetId: string; minimumWeightedValue?: number; maximumWeightedValue?: number } };
export type NightEventEffect = { resources?: Partial<Resources>; hotelStats?: Partial<HotelStats>; reputations?: Partial<Reputations>; flags?: EventFlags; threat?: number; fatherStoryProgress?: number; allGuestStress?: number; targetGuestHealth?: number; targetGuestHealthMinimum?: number; roomChange?: { roomNumber: number; status: "DAMAGED" | "LOCKED"; roomCondition: number }; openCaseId?: InvestigationCaseId; monsterKnowledgeSourceIds?: MonsterKnowledgeSourceId[]; guestEffects?: { guestId: string; trust?: number; stress?: number; health?: number }[]; relationshipChanges?: RelationshipChange[] };
export type NightEventChoice = { id: string; label: string; description: string; requiredResources?: Partial<Resources>; effect: NightEventEffect };
export type NightEventDefinition = { id: string; title: string; description: string; quote: string; priority: number; condition: NightEventCondition; choices: NightEventChoice[] };
export type StoryChoiceEffect = { resources?: Partial<Resources>; hotelStats?: Partial<HotelStats>; reputations?: Partial<Reputations>; flags?: EventFlags; trust?: number; stress?: number; health?: number; threat?: number; fatherStoryProgress?: number; relationship?: { targetId: string; delta: number }; discoverTrait?: string; departure?: { endingState: string; finalState: string }; scheduledVisitorArrival?: { id: StoryVisitorArrivalId; delayDays: number } };
export type StoryChoice = { id: string; label: string; description: string; requiredResources?: Partial<Resources>; requiredFlags?: EventFlags; effect: StoryChoiceEffect };
export type StoryChoiceEvent = { id: string; guestId: string; stage: "CONFLICT" | "RESOLUTION"; title: string; description: string; quote: string; choices: StoryChoice[] };
export type CutsceneId = "first_night" | "first_monster_sighting" | "guest_attacked" | "generator_blackout" | "refugees_sheltered" | "refugees_denied" | "room_body_discovery" | "father_radio_signal" | "father_at_gate_quarantine" | "father_at_gate_opened" | "hotel_siege_held" | "hotel_siege_retreat" | "mia_daniel_reunion" | "daniel_mia_choice" | "carter_safe_passage" | "walter_archive_opened" | "walter_key_hidden" | "eleanor_clinic_opened" | "eleanor_mobile_rounds" | "hazel_perimeter_watch" | "hazel_vengeance_expedition" | "thomas_microgrid_online" | "thomas_radio_relay" | "noah_community_table" | "noah_ration_lab" | "samuel_civil_guard" | "samuel_rescue_patrol" | "ruth_care_team" | "ruth_field_nurse" | "rosa_household_network" | "eli_quartermaster" | "eli_safe_passage" | "claire_nursery" | "claire_medical_passage" | "grace_mutual_aid" | "grace_pilgrimage" | "vale_behavior_map" | "vale_research_destroyed" | "owen_defense_force" | "owen_escape_route" | "hayes_command_signed" | "hayes_civilian_command" | "jack_fair_exchange" | "jack_monopoly_market" | "victor_public_trust" | "victor_monopoly_alliance" | "lily_truth_broadcast" | "lily_truth_archive" | "white_door_accepted" | "white_banished";
export type CutsceneDefinition = { id: CutsceneId; triggerEventId?: string; triggerChoiceId?: string; triggerStoryEventId?: string; triggerStoryChoiceId?: string; priority: number; minimumCompletedDay?: number; maximumCompletedDay?: number; kicker: string; title: string; body: string; quote: string; image: string; imageAlt: string };
export type ActiveRelationship = { sourceId: string; targetId: string; type: string; value: number; distanceMultiplier: 1 | 1.5 | 2; weightedValue: number };
export type ActiveSynergy = { id: string; name: string; guestIds: string[]; affectedRoomNumbers: number[]; description: string };
export type EvidenceDefinition = { id: EvidenceId; name: string; type: "PHYSICAL" | "RECORD"; source: string; description: string; relatedRoom: number; storyFlag: string };
export type InvestigationPointDefinition = { id: InvestigationPointId; name: string; description: string; finding: string; evidenceId: EvidenceId; actionCost: 1 };
export type InvestigationConclusionDefinition = { id: InvestigationConclusionId; label: string; description: string; supportedBy: EvidenceId[]; contradictedBy: EvidenceId[]; minimumSupport: number; supportedOnlyFlags?: string[]; effect: { hotelStats?: Partial<HotelStats>; reputations?: Partial<Reputations>; flags: EventFlags; threat: number } };
export type InvestigationCaseDefinition = { id: InvestigationCaseId; title: string; summary: string; relatedRoom: number; minimumEvidenceToConclude: number; points: InvestigationPointDefinition[]; conclusions: InvestigationConclusionDefinition[]; correctConclusionId: InvestigationConclusionId; correctFlag: string };
export type InvestigationCaseState = { caseId: InvestigationCaseId; status: InvestigationCaseStatus; openedDay: number; inspectedPointIds: InvestigationPointId[]; collectedEvidenceIds: EvidenceId[]; conclusionId: InvestigationConclusionId | null; resolvedDay: number | null };
export type VisitorStatementDefinition = { id: VisitorStatementId; guestId: string; questionId: string; claim: string; finding: string; assessment: VisitorStatementAssessment; requiredInspectedItemId?: string; knowledgeSourceId: MonsterKnowledgeSourceId };
export type VisitorStatementRecord = { statementId: VisitorStatementId; guestId: string; questionId: string; recordedDay: number; assessment: VisitorStatementAssessment };
export type MonsterInsightDefinition = { id: MonsterInsightId; name: string; description: string };
export type MonsterCodexEntryDefinition = { id: MonsterCodexEntryId; name: string; classification: string; description: string; tacticalThreshold: number; minimumSources: number; countermeasure: string; preparationCountermeasure?: { optionId: NightPreparationOptionId; effect: Omit<NightPreparationEffect, "fuelCost"> }; insights: MonsterInsightDefinition[] };
export type MonsterKnowledgeSourceDefinition = { id: MonsterKnowledgeSourceId; entryId: MonsterCodexEntryId; insightId: MonsterInsightId; name: string; certainty: MonsterKnowledgeCertainty };
export type MonsterCodexEntryState = { entryId: MonsterCodexEntryId; sourceIds: MonsterKnowledgeSourceId[]; insightIds: MonsterInsightId[]; updatedDay: number };

export type GamePhase =
  | "title"
  | "prologue"
  | "desk"
  | "assignment"
  | "management"
  | "story"
  | "night"
  | "report"
  | "ending";

export type GameState = {
  version: 15;
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
  facilities: Partial<Record<FacilityId, 1 | 2 | 3>>;
  availableEndings: EndingId[];
  completedEndingFlags: EndingId[];
  endingProgress: Partial<Record<EndingId, EndingStatus>>;
  fatherStoryProgress: number;
  endingRelatedFlags: EventFlags;
  activeEndingId: EndingId | null;
  endingSceneIndex: number;
  actionPoints: number;
  maxActionPoints: number;
  foodRationPolicy: FoodRationPolicy;
  powerAllocation: PowerCircuitId[];
  nightPreparation: NightPreparationConfig;
  selectedNightEventId: string | null;
  selectedNightChoiceId: string | null;
  lastNightEventId: string | null;
  pendingStoryEventId: string | null;
  pendingVisitorReactionId: string | null;
  visitorSeed: number;
  visitorQueueDay: number;
  dailyVisitorQueue: string[];
  dailyVisitorIndex: number;
  visitorHistory: VisitorHistoryRecord[];
  staffAssignments: StaffAssignments;
  lastScavengeDay: number;
  lastScavengeReport: ScavengeReport | null;
  investigationCases: InvestigationCaseState[];
  visitorStatements: VisitorStatementRecord[];
  monsterCodex: MonsterCodexEntryState[];
  activeCutsceneId: CutsceneId | null;
  queuedCutsceneIds: CutsceneId[];
  seenCutsceneIds: CutsceneId[];
};
