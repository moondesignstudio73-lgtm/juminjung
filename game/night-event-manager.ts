import { NIGHT_EVENTS } from "./night-event-data.ts";
import type { GameState, HotelLogEntry, NightEventChoice, NightEventDefinition } from "./types.ts";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function meetsCondition(state: GameState, event: NightEventDefinition): boolean {
  const condition = event.condition;
  const staying = state.guests.filter((guest) => guest.status === "STAYING");
  if (condition.worldStates && !condition.worldStates.includes(state.worldState)) return false;
  if (condition.minimumDay !== undefined && state.day < condition.minimumDay) return false;
  if (condition.dayModulo !== undefined && state.day % condition.dayModulo !== 0) return false;
  if (condition.minimumThreat !== undefined && Number(state.flags.monster_threat ?? 0) < condition.minimumThreat) return false;
  if (condition.maximumSecurity !== undefined && state.hotelStats.security > condition.maximumSecurity) return false;
  if (condition.requiresGuests && staying.length === 0) return false;
  if (condition.maximumResource && !Object.entries(condition.maximumResource).every(([key, value]) => state.resources[key as keyof GameState["resources"]] <= Number(value))) return false;
  if (condition.shortage && state.resources[condition.shortage] >= staying.length) return false;
  return true;
}

export function selectNightEvent(state: GameState): NightEventDefinition {
  return [...NIGHT_EVENTS].sort((a, b) => b.priority - a.priority).find((event) => meetsCondition(state, event)) ?? NIGHT_EVENTS.at(-1)!;
}

export function canChooseNightChoice(state: GameState, choice: NightEventChoice): boolean {
  return !choice.requiredResources || Object.entries(choice.requiredResources).every(([key, value]) => state.resources[key as keyof GameState["resources"]] >= Number(value));
}

function addRecord<T extends Record<string, number>>(current: T, changes: Partial<T> | undefined): T {
  if (!changes) return current;
  return Object.fromEntries(Object.entries(current).map(([key, value]) => [key, clamp(value + Number(changes[key] ?? 0))])) as T;
}

export function applyNightChoice(state: GameState, _eventId: string, choiceId: string): { state: GameState; event: NightEventDefinition; choice: NightEventChoice; entry: HotelLogEntry } {
  const selected = selectNightEvent(state);
  const event = selected;
  const requested = event.choices.find((item) => item.id === choiceId);
  const choice = requested && canChooseNightChoice(state, requested) ? requested : event.choices.find((item) => canChooseNightChoice(state, item)) ?? event.choices[0];
  const effect = choice.effect;
  const stayingIds = state.guests.filter((guest) => guest.status === "STAYING").map((guest) => guest.id);
  const targetId = stayingIds[0];
  const guests = state.guests.map((guest) => stayingIds.includes(guest.id) ? { ...guest, stress: clamp(guest.stress + Number(effect.allGuestStress ?? 0)), health: guest.id === targetId ? clamp(guest.health + Number(effect.targetGuestHealth ?? 0)) : guest.health } : guest);
  const threat = clamp(Number(state.flags.monster_threat ?? 0) + Number(effect.threat ?? 0));
  const next = { ...state, guests, resources: addRecord(state.resources, effect.resources), hotelStats: addRecord(state.hotelStats, effect.hotelStats), reputations: addRecord(state.reputations, effect.reputations), flags: { ...state.flags, ...effect.flags, monster_threat: threat }, selectedNightEventId: event.id, selectedNightChoiceId: choice.id };
  return { state: next, event, choice, entry: { day: state.day, type: "EVENT", message: `야간 사건 · ${event.title} · ${choice.label}` } };
}
