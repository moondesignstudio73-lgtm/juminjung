import { NIGHT_EVENTS } from "./night-event-data.ts";
import { getActiveRelationships } from "./relationship-manager.ts";
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
  if (condition.requiredEmptyRoomNumber !== undefined && !state.rooms.some((room) => room.roomNumber === condition.requiredEmptyRoomNumber && room.status === "EMPTY" && !room.occupied && room.guestId === null)) return false;
  if (condition.maximumResource && !Object.entries(condition.maximumResource).every(([key, value]) => state.resources[key as keyof GameState["resources"]] <= Number(value))) return false;
  if (condition.shortage && state.resources[condition.shortage] >= staying.length) return false;
  if (condition.requiredFlags && !Object.entries(condition.requiredFlags).every(([key, value]) => state.flags[key] === value || state.endingRelatedFlags[key] === value)) return false;
  if (condition.forbiddenFlags?.some((key) => Boolean(state.flags[key]) || Boolean(state.endingRelatedFlags[key]))) return false;
  if (condition.relationship) {
    const active = getActiveRelationships(state.rooms, state.guests).find((item) => item.sourceId === condition.relationship!.sourceId && item.targetId === condition.relationship!.targetId);
    if (!active) return false;
    if (condition.relationship.minimumWeightedValue !== undefined && active.weightedValue < condition.relationship.minimumWeightedValue) return false;
    if (condition.relationship.maximumWeightedValue !== undefined && active.weightedValue > condition.relationship.maximumWeightedValue) return false;
  }
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

export function applyNightChoice(state: GameState, eventId: string, choiceId: string): { state: GameState; event: NightEventDefinition; choice: NightEventChoice; entry: HotelLogEntry } {
  const selected = selectNightEvent(state);
  const event = selected;
  if (event.id !== eventId) throw new Error("현재 진행 중인 야간 사건과 일치하지 않습니다.");
  const requested = event.choices.find((item) => item.id === choiceId);
  if (!requested) throw new Error("선택할 수 없는 야간 사건 응답입니다.");
  if (!canChooseNightChoice(state, requested)) throw new Error("이 선택에 필요한 자원이 부족합니다.");
  const choice = requested;
  const effect = choice.effect;
  for (const guestEffect of effect.guestEffects ?? []) {
    if (!state.guests.some((guest) => guest.id === guestEffect.guestId)) throw new Error(`NPC 상태 변경 대상을 찾을 수 없습니다: ${guestEffect.guestId}`);
  }
  const effectiveRelationshipChanges = effect.relationshipChanges?.map((change) => {
    const source = state.guests.find((guest) => guest.id === change.sourceId);
    const relation = source?.relationships.find((item) => item.targetId === change.targetId);
    if (!source || !relation) throw new Error(`관계 변경 대상을 찾을 수 없습니다: ${change.sourceId} → ${change.targetId}`);
    const nextValue = Math.max(-100, Math.min(100, relation.value + change.delta));
    return { ...change, delta: nextValue - relation.value };
  });
  const stayingIds = state.guests.filter((guest) => guest.status === "STAYING").map((guest) => guest.id);
  const targetId = stayingIds[0];
  const guests = state.guests.map((guest) => {
    const guestEffect = effect.guestEffects?.find((item) => item.guestId === guest.id);
    const relationshipChanges = effectiveRelationshipChanges?.filter((item) => item.sourceId === guest.id) ?? [];
    const relationships = relationshipChanges.length ? guest.relationships.map((relation) => {
      const change = relationshipChanges.find((item) => item.targetId === relation.targetId);
      return change ? { ...relation, value: Math.max(-100, Math.min(100, relation.value + change.delta)) } : relation;
    }) : guest.relationships;
    if (!stayingIds.includes(guest.id) && !guestEffect && !relationshipChanges.length) return guest;
    return { ...guest, relationships, trust: clamp(guest.trust + Number(guestEffect?.trust ?? 0)), stress: clamp(guest.stress + Number(effect.allGuestStress ?? 0) + Number(guestEffect?.stress ?? 0)), health: clamp(guest.health + (guest.id === targetId ? Number(effect.targetGuestHealth ?? 0) : 0) + Number(guestEffect?.health ?? 0)) };
  });
  const threat = clamp(Number(state.flags.monster_threat ?? 0) + Number(effect.threat ?? 0));
  const rooms = effect.roomChange ? state.rooms.map((room) => room.roomNumber === effect.roomChange!.roomNumber ? { ...room, occupied: false, guestId: null, status: effect.roomChange!.status, roomCondition: clamp(effect.roomChange!.roomCondition), temporaryEffects: [] } : room) : state.rooms;
  const next = { ...state, guests, rooms, resources: addRecord(state.resources, effect.resources), hotelStats: addRecord(state.hotelStats, effect.hotelStats), reputations: addRecord(state.reputations, effect.reputations), flags: { ...state.flags, ...effect.flags, monster_threat: threat }, selectedNightEventId: event.id, selectedNightChoiceId: choice.id };
  return { state: next, event, choice, entry: { day: state.day, type: "EVENT", message: `야간 사건 · ${event.title} · ${choice.label}`, relationshipChanges: effectiveRelationshipChanges } };
}
