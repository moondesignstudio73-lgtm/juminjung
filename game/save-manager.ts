import { recalculateRoomEffects } from "./aura-effect-manager.ts";
import { createEventFlags } from "./event-manager.ts";
import { createGuests } from "./guest-data.ts";
import { createResources } from "./resource-manager.ts";
import { createRooms } from "./room-manager.ts";
import { FACILITIES } from "./facility-data.ts";
import { ENDING_NARRATIVES } from "./ending-narrative-data.ts";
import { CUTSCENES } from "./cutscene-data.ts";
import { pruneStaffAssignments, SCAVENGE_MISSIONS } from "./staff-operation-manager.ts";
import type { FacilityId, GameState, Guest, Room, StaffAssignments } from "./types.ts";

export const SAVE_KEY = "juju-hotel-save-v2";
export const LEGACY_SAVE_KEY = "juju-hotel-save-v1";

function mergeGuest(catalogGuest: ReturnType<typeof createGuests>[number], savedGuest: Partial<ReturnType<typeof createGuests>[number]> | undefined) {
  if (!savedGuest) return catalogGuest;
  const savedEvents = savedGuest.eventChain ?? [];
  return {
    ...catalogGuest,
    ...savedGuest,
    portrait: catalogGuest.portrait,
    portraitVariants: catalogGuest.portraitVariants,
    expressions: catalogGuest.expressions,
    introDialogue: catalogGuest.introDialogue,
    negotiationDialogue: catalogGuest.negotiationDialogue,
    questions: catalogGuest.questions,
    negotiatedOffer: catalogGuest.negotiatedOffer,
    aura: catalogGuest.aura,
    baseTraits: [...new Set([...catalogGuest.baseTraits, ...(savedGuest.baseTraits ?? [])])],
    hiddenTraits: [...new Set([...catalogGuest.hiddenTraits, ...(savedGuest.hiddenTraits ?? [])])],
    discoveredTraits: [...new Set(savedGuest.discoveredTraits ?? [])],
    relationships: catalogGuest.relationships.map((relation) => savedGuest.relationships?.find((item) => item.targetId === relation.targetId) ?? relation),
    storyFlags: { ...catalogGuest.storyFlags, ...savedGuest.storyFlags },
    eventChain: catalogGuest.eventChain.map((event) => ({ ...event, ...savedEvents.find((item) => item.id === event.id) })),
    remainingNights: Math.max(0, Math.min(savedGuest.remainingNights ?? catalogGuest.remainingNights, savedGuest.stayDuration ?? catalogGuest.stayDuration)),
  };
}

function normalizeRoomCondition(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : fallback;
}

function normalizeOccupancy(savedRooms: Room[], guests: Guest[]): { rooms: Room[]; guests: Guest[] } {
  const canonicalRooms = createRooms();
  const roomNumbers = new Set(canonicalRooms.map((room) => room.roomNumber));
  const savedRoomByNumber = new Map(savedRooms.filter((room) => roomNumbers.has(room.roomNumber)).map((room) => [room.roomNumber, room]));
  const claimedRoomsByGuest = new Map<string, number[]>();

  for (const room of savedRoomByNumber.values()) {
    if (!room.guestId) continue;
    claimedRoomsByGuest.set(room.guestId, [...(claimedRoomsByGuest.get(room.guestId) ?? []), room.roomNumber]);
  }

  const occupiedByRoom = new Map<number, string>();
  const assignedRoomByGuest = new Map<string, number>();
  const seenGuestIds = new Set<string>();
  const stayingGuests = guests.filter((guest) => {
    if (seenGuestIds.has(guest.id)) return false;
    seenGuestIds.add(guest.id);
    return guest.alive && (guest.status === "STAYING" || guest.currentRoomNumber !== null || claimedRoomsByGuest.has(guest.id));
  });
  const isUsable = (roomNumber: number) => !["DAMAGED", "LOCKED"].includes(savedRoomByNumber.get(roomNumber)?.status ?? "EMPTY");
  const desiredRoom = (guest: Guest) => {
    if (guest.currentRoomNumber !== null && roomNumbers.has(guest.currentRoomNumber) && isUsable(guest.currentRoomNumber)) return guest.currentRoomNumber;
    const claims = claimedRoomsByGuest.get(guest.id) ?? [];
    return claims.length === 1 && isUsable(claims[0]) ? claims[0] : null;
  };

  const orderedGuests = [...stayingGuests].sort((a, b) => {
    const aRoom = desiredRoom(a);
    const bRoom = desiredRoom(b);
    const aMatches = aRoom ? savedRoomByNumber.get(aRoom)?.guestId === a.id : false;
    const bMatches = bRoom ? savedRoomByNumber.get(bRoom)?.guestId === b.id : false;
    return Number(bMatches) - Number(aMatches) || Number(a.checkedInDay ?? 0) - Number(b.checkedInDay ?? 0) || a.id.localeCompare(b.id);
  });

  for (const guest of orderedGuests) {
    const preferred = desiredRoom(guest);
    const fallback = canonicalRooms.find((room) => !occupiedByRoom.has(room.roomNumber) && isUsable(room.roomNumber))?.roomNumber;
    const roomNumber = preferred && !occupiedByRoom.has(preferred) ? preferred : fallback;
    if (roomNumber === undefined) continue;
    occupiedByRoom.set(roomNumber, guest.id);
    assignedRoomByGuest.set(guest.id, roomNumber);
  }

  const normalizedGuests = guests.map((guest) => ({
    ...guest,
    status: assignedRoomByGuest.has(guest.id) ? "STAYING" as const : guest.status,
    currentRoomNumber: assignedRoomByGuest.get(guest.id) ?? null,
  }));
  const rooms = canonicalRooms.map((room) => {
    const saved = savedRoomByNumber.get(room.roomNumber);
    const guestId = occupiedByRoom.get(room.roomNumber) ?? null;
    return {
      ...room,
      ...(saved ? { roomCondition: normalizeRoomCondition(saved.roomCondition, room.roomCondition), permanentEffects: saved.permanentEffects ?? [] } : {}),
      occupied: Boolean(guestId),
      guestId,
      status: guestId ? "OCCUPIED" as const : saved?.status === "DAMAGED" || saved?.status === "LOCKED" ? saved.status : "EMPTY" as const,
      temporaryEffects: [],
    };
  });
  return { rooms, guests: normalizedGuests };
}

export function createInitialGameState(): GameState {
  return { version: 12, phase: "title", day: 0, rooms: createRooms(), guests: createGuests(), resources: createResources(), flags: createEventFlags(), asked: [], inspected: [], negotiated: false, held: false, decision: null, assignmentMode: null, selectedRoomNumber: null, eventHistory: [], lastDaySummary: null, worldState: "STABLE", hotelStats: { hotelCondition: 60, security: 35, foodSustainability: 0, waterSustainability: 0, crime: 0, survivorPopulation: 0, averageTrust: 0, resources: 40 }, reputations: { community: 0, military: 0, refugee: 0, merchant: 0, humanitarian: 0 }, facilities: {}, availableEndings: [], completedEndingFlags: [], endingProgress: {}, fatherStoryProgress: 0, endingRelatedFlags: {}, activeEndingId: null, endingSceneIndex: 0, actionPoints: 3, maxActionPoints: 3, foodRationPolicy: "NORMAL", powerAllocation: ["SECURITY", "CLINIC", "KITCHEN"], selectedNightEventId: null, selectedNightChoiceId: null, lastNightEventId: null, pendingStoryEventId: null, pendingVisitorReactionId: null, visitorSeed: Math.floor(Math.random() * 0x7fffffff) || 1, visitorQueueDay: 0, dailyVisitorQueue: [], dailyVisitorIndex: 0, visitorHistory: [], staffAssignments: {}, lastScavengeDay: 0, lastScavengeReport: null, activeCutsceneId: null, queuedCutsceneIds: [], seenCutsceneIds: [] };
}

export function restoreGameState(raw: string | null): GameState {
  if (!raw) return createInitialGameState();
  try {
    const decoded = JSON.parse(raw) as { version?: number; rooms?: unknown; guests?: unknown };
    if (![2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(decoded.version ?? 0) || !Array.isArray(decoded.rooms) || !Array.isArray(decoded.guests)) return createInitialGameState();
    const parsed = decoded as unknown as Partial<GameState>;
    const base = createInitialGameState();
    const savedGuests = parsed.guests!;
    const catalogGuests = createGuests().map((catalogGuest) => mergeGuest(catalogGuest, savedGuests.find((guest) => guest.id === catalogGuest.id)));
    const generatedGuests = savedGuests.filter((guest) => guest.npcType === "NORMAL" && guest.generated === true && typeof guest.id === "string" && !catalogGuests.some((catalogGuest) => catalogGuest.id === guest.id)).map((guest) => guest as Guest);
    const guests = [...catalogGuests, ...generatedGuests];
    const savedFacilities = (parsed.facilities ?? {}) as Record<string, unknown>;
    const knownFacilityIds = new Set(FACILITIES.map((facility) => facility.id));
    const facilities = Object.fromEntries(Object.entries(savedFacilities).flatMap(([id, value]) => {
      if (!knownFacilityIds.has(id as FacilityId) || value === false) return [];
      const numeric = value === true ? 1 : Number(value);
      if (!Number.isFinite(numeric)) return [];
      const level = Math.max(0, Math.min(3, Math.trunc(numeric)));
      return level > 0 ? [[id, level]] : [];
    })) as GameState["facilities"];
    const completedEndingFlags = parsed.completedEndingFlags ?? [];
    const activeNarrative = parsed.activeEndingId ? ENDING_NARRATIVES.find((ending) => ending.endingId === parsed.activeEndingId) : null;
    const activeEndingId = activeNarrative && parsed.activeEndingId && !completedEndingFlags.includes(parsed.activeEndingId) ? parsed.activeEndingId : null;
    const endingSceneIndex = activeEndingId && activeNarrative ? Math.max(0, Math.min(activeNarrative.scenes.length - 1, Math.trunc(Number(parsed.endingSceneIndex) || 0))) : 0;
    const knownCutsceneIds = new Set(CUTSCENES.map((cutscene) => cutscene.id));
    const activeCutsceneId = parsed.activeCutsceneId && knownCutsceneIds.has(parsed.activeCutsceneId) ? parsed.activeCutsceneId : null;
    const savedSeenCutsceneIds = Array.isArray(parsed.seenCutsceneIds) ? parsed.seenCutsceneIds : [];
    const seenCutsceneIds = [...new Set(savedSeenCutsceneIds)].filter((id) => knownCutsceneIds.has(id));
    const savedQueuedCutsceneIds = Array.isArray(parsed.queuedCutsceneIds) ? parsed.queuedCutsceneIds : [];
    const queuedCutsceneIds = [...new Set(savedQueuedCutsceneIds)].filter((id) => knownCutsceneIds.has(id) && id !== activeCutsceneId && !seenCutsceneIds.includes(id));
    const phase = parsed.phase === "ending" && !activeEndingId ? "report" : parsed.phase ?? base.phase;
    const occupancy = normalizeOccupancy(parsed.rooms!, guests);
    const knownPowerCircuits = new Set(base.powerAllocation);
    const powerAllocation = Array.isArray(parsed.powerAllocation) ? [...new Set(parsed.powerAllocation)].filter((id) => knownPowerCircuits.has(id)) : base.powerAllocation;
    const foodRationPolicy = ["NORMAL", "LIMITED", "SEVERE"].includes(parsed.foodRationPolicy ?? "") ? parsed.foodRationPolicy! : base.foodRationPolicy;
    const legacyFullActionPoints = (decoded.version ?? 0) < 10 && parsed.actionPoints === parsed.maxActionPoints;
    const actionPoints = legacyFullActionPoints ? base.maxActionPoints : Math.max(0, Math.min(base.maxActionPoints, Math.trunc(Number(parsed.actionPoints ?? base.maxActionPoints))));
    const visitorSeed = Number.isFinite(Number(parsed.visitorSeed)) && Number(parsed.visitorSeed) > 0 ? Math.trunc(Number(parsed.visitorSeed)) : base.visitorSeed;
    const knownGuestIds = new Set(guests.map((guest) => guest.id));
    const visitorQueueDay = Math.max(0,Math.trunc(Number(parsed.visitorQueueDay??0)));
    const dailyVisitorQueue = Array.isArray(parsed.dailyVisitorQueue) ? [...new Set(parsed.dailyVisitorQueue)].filter((id) => typeof id === "string" && knownGuestIds.has(id)) : [];
    const dailyVisitorIndex = Math.max(0,Math.min(dailyVisitorQueue.length,Math.trunc(Number(parsed.dailyVisitorIndex??0))));
    const savedVisitorHistory = Array.isArray(parsed.visitorHistory) ? parsed.visitorHistory.filter((entry) => entry && typeof entry.visitorId === "string" && knownGuestIds.has(entry.visitorId)) : [];
    const recordedVisitorIds = new Set(savedVisitorHistory.map((entry)=>entry.visitorId));
    const visitorHistory = [...savedVisitorHistory,...guests.filter((guest)=>guest.status!=="WAITING"&&!recordedVisitorIds.has(guest.id)).map((guest)=>({visitorId:guest.id,firstVisitDay:Number(guest.checkedInDay??guest.storyFlags.last_revisit_refused_day??0),lastVisitDay:Number(guest.storyFlags.last_checked_out_day??guest.storyFlags.last_revisit_refused_day??guest.checkedInDay??0),acceptedCount:guest.checkedInDay===null?0:Math.max(1,Number(guest.storyFlags.visit_count??1)),refusedCount:guest.status==="REFUSED"?1:0,roomsStayed:guest.currentRoomNumber===null?[]:[guest.currentRoomNumber],itemsPaid:{},events:["이전 저장에서 복원된 방문 기록"],finalState:guest.status}))];
    const staffAssignments = pruneStaffAssignments((parsed.staffAssignments && typeof parsed.staffAssignments === "object" ? parsed.staffAssignments : {}) as StaffAssignments, occupancy.guests);
    const lastScavengeDay = Math.max(0,Math.trunc(Number(parsed.lastScavengeDay??0)));
    const savedScavengeReport = parsed.lastScavengeReport;
    const lastScavengeReport = savedScavengeReport && Number.isFinite(Number(savedScavengeReport.day)) && knownGuestIds.has(savedScavengeReport.guestId) && SCAVENGE_MISSIONS.some((mission)=>mission.id===savedScavengeReport.missionId) ? savedScavengeReport : null;
    const state = { ...base, ...parsed, version: 12, phase, resources: { ...base.resources, ...parsed.resources }, flags: { ...base.flags, ...parsed.flags }, hotelStats: { ...base.hotelStats, ...parsed.hotelStats }, reputations: { ...base.reputations, ...parsed.reputations }, facilities, endingRelatedFlags: { ...base.endingRelatedFlags, ...parsed.endingRelatedFlags }, rooms: occupancy.rooms, guests: occupancy.guests, eventHistory: parsed.eventHistory ?? [], lastDaySummary: parsed.lastDaySummary ?? null, availableEndings: parsed.availableEndings ?? [], completedEndingFlags, endingProgress: parsed.endingProgress ?? {}, activeEndingId, endingSceneIndex, actionPoints, maxActionPoints: base.maxActionPoints, foodRationPolicy, powerAllocation, selectedNightEventId: parsed.selectedNightEventId ?? null, selectedNightChoiceId: parsed.selectedNightChoiceId ?? null, lastNightEventId: parsed.lastNightEventId ?? null, pendingStoryEventId: parsed.pendingStoryEventId ?? null, pendingVisitorReactionId: parsed.pendingVisitorReactionId ?? null, visitorSeed, visitorQueueDay, dailyVisitorQueue, dailyVisitorIndex, visitorHistory, staffAssignments, lastScavengeDay, lastScavengeReport, activeCutsceneId, queuedCutsceneIds, seenCutsceneIds } as GameState;
    return { ...state, rooms: recalculateRoomEffects(state.rooms, state.guests) };
  } catch { return createInitialGameState(); }
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify({ ...state, rooms: state.rooms.map((room) => ({ ...room, temporaryEffects: [] })) });
}

export function loadBrowserGame(): GameState {
  if (typeof window === "undefined") return createInitialGameState();
  const current = window.localStorage.getItem(SAVE_KEY);
  if (current) return restoreGameState(current);
  const legacy = window.localStorage.getItem(LEGACY_SAVE_KEY);
  if (!legacy) return createInitialGameState();
  try {
    const old = JSON.parse(legacy) as Partial<GameState>;
    const fresh = createInitialGameState();
    const safeRefusal = old.decision === "refuse" && (old.phase === "night" || old.phase === "report");
    return {
      ...fresh,
      phase: old.phase === "title" || old.phase === "prologue" ? old.phase : safeRefusal ? old.phase! : "desk",
      asked: old.asked ?? [],
      inspected: old.inspected ?? [],
      negotiated: old.negotiated ?? false,
      held: old.held ?? false,
      decision: safeRefusal ? "refuse" : null,
      ...("prologue" in old ? { prologue: Number((old as GameState & { prologue?: number }).prologue ?? 0) } : {}),
    };
  } catch { return createInitialGameState(); }
}

export function saveBrowserGame(state: GameState): void {
  if (typeof window !== "undefined") window.localStorage.setItem(SAVE_KEY, serializeGameState(state));
}

export function clearBrowserGame(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SAVE_KEY);
  window.localStorage.removeItem(LEGACY_SAVE_KEY);
}
