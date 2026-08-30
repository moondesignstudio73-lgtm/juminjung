import { recalculateRoomEffects } from "./aura-effect-manager.ts";
import { createEventFlags } from "./event-manager.ts";
import { createGuests } from "./guest-data.ts";
import { createResources } from "./resource-manager.ts";
import { createRooms } from "./room-manager.ts";
import type { GameState } from "./types.ts";

export const SAVE_KEY = "juju-hotel-save-v2";
export const LEGACY_SAVE_KEY = "juju-hotel-save-v1";

function mergeGuest(catalogGuest: ReturnType<typeof createGuests>[number], savedGuest: Partial<ReturnType<typeof createGuests>[number]> | undefined) {
  if (!savedGuest) return catalogGuest;
  const savedEvents = savedGuest.eventChain ?? [];
  return {
    ...catalogGuest,
    ...savedGuest,
    baseTraits: [...new Set([...catalogGuest.baseTraits, ...(savedGuest.baseTraits ?? [])])],
    hiddenTraits: [...new Set([...catalogGuest.hiddenTraits, ...(savedGuest.hiddenTraits ?? [])])],
    discoveredTraits: [...new Set(savedGuest.discoveredTraits ?? [])],
    relationships: catalogGuest.relationships.map((relation) => savedGuest.relationships?.find((item) => item.targetId === relation.targetId) ?? relation),
    storyFlags: { ...catalogGuest.storyFlags, ...savedGuest.storyFlags },
    eventChain: catalogGuest.eventChain.map((event) => ({ ...event, ...savedEvents.find((item) => item.id === event.id) })),
    remainingNights: Math.max(0, Math.min(savedGuest.remainingNights ?? catalogGuest.remainingNights, savedGuest.stayDuration ?? catalogGuest.stayDuration)),
  };
}

export function createInitialGameState(): GameState {
  return { version: 6, phase: "title", day: 0, rooms: createRooms(), guests: createGuests(), resources: createResources(), flags: createEventFlags(), asked: [], inspected: [], negotiated: false, held: false, decision: null, assignmentMode: null, selectedRoomNumber: null, eventHistory: [], lastDaySummary: null, worldState: "STABLE", hotelStats: { hotelCondition: 60, security: 35, foodSustainability: 0, waterSustainability: 0, crime: 0, survivorPopulation: 0, averageTrust: 0, resources: 40 }, reputations: { community: 0, military: 0, refugee: 0, merchant: 0, humanitarian: 0 }, facilities: {}, availableEndings: [], completedEndingFlags: [], endingProgress: {}, fatherStoryProgress: 0, endingRelatedFlags: {}, activeEndingId: null, actionPoints: 2, maxActionPoints: 2 };
}

export function restoreGameState(raw: string | null): GameState {
  if (!raw) return createInitialGameState();
  try {
    const decoded = JSON.parse(raw) as { version?: number; rooms?: unknown; guests?: unknown };
    if (![2, 3, 4, 5, 6].includes(decoded.version ?? 0) || !Array.isArray(decoded.rooms) || !Array.isArray(decoded.guests)) return createInitialGameState();
    const parsed = decoded as unknown as Partial<GameState>;
    const base = createInitialGameState();
    const savedGuests = parsed.guests!;
    const guests = createGuests().map((catalogGuest) => mergeGuest(catalogGuest, savedGuests.find((guest) => guest.id === catalogGuest.id)));
    const state = { ...base, ...parsed, version: 6, phase: parsed.phase === "ending" && !parsed.activeEndingId ? "report" : parsed.phase ?? base.phase, resources: { ...base.resources, ...parsed.resources }, flags: { ...base.flags, ...parsed.flags }, hotelStats: { ...base.hotelStats, ...parsed.hotelStats }, reputations: { ...base.reputations, ...parsed.reputations }, facilities: { ...base.facilities, ...parsed.facilities }, endingRelatedFlags: { ...base.endingRelatedFlags, ...parsed.endingRelatedFlags }, rooms: parsed.rooms!, guests, eventHistory: parsed.eventHistory ?? [], lastDaySummary: parsed.lastDaySummary ?? null, availableEndings: parsed.availableEndings ?? [], completedEndingFlags: parsed.completedEndingFlags ?? [], endingProgress: parsed.endingProgress ?? {}, activeEndingId: parsed.activeEndingId ?? null, actionPoints: parsed.actionPoints ?? base.maxActionPoints, maxActionPoints: parsed.maxActionPoints ?? base.maxActionPoints } as GameState;
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
