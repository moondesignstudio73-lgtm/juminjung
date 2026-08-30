import { recalculateRoomEffects } from "./aura-effect-manager.ts";
import { createEventFlags } from "./event-manager.ts";
import { createGuests } from "./guest-data.ts";
import { createResources } from "./resource-manager.ts";
import { createRooms } from "./room-manager.ts";
import type { GameState } from "./types.ts";

export const SAVE_KEY = "juju-hotel-save-v2";
export const LEGACY_SAVE_KEY = "juju-hotel-save-v1";

export function createInitialGameState(): GameState {
  return { version: 3, phase: "title", day: 0, rooms: createRooms(), guests: createGuests(), resources: createResources(), flags: createEventFlags(), asked: [], inspected: [], negotiated: false, held: false, decision: null, assignmentMode: null, selectedRoomNumber: null, eventHistory: [], lastDaySummary: null };
}

export function restoreGameState(raw: string | null): GameState {
  if (!raw) return createInitialGameState();
  try {
    const decoded = JSON.parse(raw) as { version?: number; rooms?: unknown; guests?: unknown };
    if ((decoded.version !== 2 && decoded.version !== 3) || !Array.isArray(decoded.rooms) || !Array.isArray(decoded.guests)) return createInitialGameState();
    const parsed = decoded as unknown as Partial<GameState>;
    const base = createInitialGameState();
    const state = { ...base, ...parsed, version: 3, resources: { ...base.resources, ...parsed.resources }, flags: { ...base.flags, ...parsed.flags }, rooms: parsed.rooms!, guests: parsed.guests!.map((guest) => ({ ...createGuests().find((item) => item.id === guest.id), ...guest })), eventHistory: parsed.eventHistory ?? [], lastDaySummary: parsed.lastDaySummary ?? null } as GameState;
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
