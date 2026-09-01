import { NIGHT_EVENTS } from "./night-event-data.ts";
import { getNightFoodDemand } from "./aura-night-manager.ts";
import { getActiveRelationships } from "./relationship-manager.ts";
import { openInvestigationCase } from "./investigation-manager.ts";
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
  if (condition.shortage) {
    const demand = condition.shortage === "food" ? getNightFoodDemand(state.rooms,state.guests,state.flags).demand : staying.length;
    if (state.resources[condition.shortage] >= demand) return false;
  }
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

export const DEFENSE_FORCE_SECURITY_COST = 4;
export const DEFENSE_FORCE_PARTS_COST = 2;
export const DEFENSE_FORCE_INJURY_DIVISOR = 2;
export const PUBLIC_BUNKER_FOOD_COST = 2;
export const PUBLIC_BUNKER_WATER_COST = 2;
export const PUBLIC_BUNKER_THREAT_GAIN = 1;

export function getEffectiveNightChoice(state: GameState, choice: NightEventChoice): NightEventChoice {
  let effective = choice;
  if (choice.id === "hold_lobby" && state.flags.owen_siege_plan === true) {
    const mitigatedInjury = Math.trunc(Number(choice.effect.targetGuestHealth ?? 0) / DEFENSE_FORCE_INJURY_DIVISOR);
    effective = {
      ...choice,
      description: `자치 방위대가 보안 물자 ${DEFENSE_FORCE_SECURITY_COST}와 부품 ${DEFENSE_FORCE_PARTS_COST}로 방어선을 조직합니다. 침입을 격퇴하고 선두 투숙객의 부상을 ${Math.abs(mitigatedInjury)} Health로 줄입니다.`,
      requiredResources: { ...choice.requiredResources, security: DEFENSE_FORCE_SECURITY_COST, parts: DEFENSE_FORCE_PARTS_COST },
      effect: {
        ...choice.effect,
        resources: { ...choice.effect.resources, security: -DEFENSE_FORCE_SECURITY_COST, parts: -DEFENSE_FORCE_PARTS_COST },
        targetGuestHealth: mitigatedInjury,
      },
    };
  }
  if (choice.id === "shelter" && choice.effect.flags?.refugees_sheltered === true && state.flags.bunker_network_open === true && state.flags.victor_public_trust === true && state.flags.victor_monopoly_alliance !== true) {
    effective = {
      ...effective,
      description: `공동 신탁이 공개한 벙커 좌석과 비축품으로 식량 ${PUBLIC_BUNKER_FOOD_COST}·물 ${PUBLIC_BUNKER_WATER_COST}만 사용해 피난민을 분산 수용하고 위협 증가를 ${PUBLIC_BUNKER_THREAT_GAIN}로 낮춥니다.`,
      requiredResources: { ...effective.requiredResources, food: PUBLIC_BUNKER_FOOD_COST, water: PUBLIC_BUNKER_WATER_COST },
      effect: {
        ...effective.effect,
        resources: { ...effective.effect.resources, food: -PUBLIC_BUNKER_FOOD_COST, water: -PUBLIC_BUNKER_WATER_COST },
        threat: PUBLIC_BUNKER_THREAT_GAIN,
        flags: { ...effective.effect.flags, bunker_refugees_sheltered: true },
      },
    };
  }
  return effective;
}

export function canChooseNightChoice(state: GameState, choice: NightEventChoice): boolean {
  const effective = getEffectiveNightChoice(state, choice);
  return hasRequiredNightResources(state, effective);
}

function hasRequiredNightResources(state: GameState, choice: NightEventChoice): boolean {
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
  const choice = getEffectiveNightChoice(state, requested);
  if (!hasRequiredNightResources(state, choice)) throw new Error("이 선택에 필요한 자원이 부족합니다.");
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
    const health = clamp(guest.health + (guest.id === targetId ? Number(effect.targetGuestHealth ?? 0) : 0) + Number(guestEffect?.health ?? 0));
    const protectedHealth = guest.id === targetId && effect.targetGuestHealthMinimum !== undefined ? Math.max(effect.targetGuestHealthMinimum, health) : health;
    return { ...guest, relationships, trust: clamp(guest.trust + Number(guestEffect?.trust ?? 0)), stress: clamp(guest.stress + Number(effect.allGuestStress ?? 0) + Number(guestEffect?.stress ?? 0)), health: protectedHealth };
  });
  const threat = clamp(Number(state.flags.monster_threat ?? 0) + Number(effect.threat ?? 0));
  const rooms = effect.roomChange ? state.rooms.map((room) => room.roomNumber === effect.roomChange!.roomNumber ? { ...room, occupied: false, guestId: null, status: effect.roomChange!.status, roomCondition: clamp(effect.roomChange!.roomCondition), temporaryEffects: [] } : room) : state.rooms;
  const next = { ...state, guests, rooms, resources: addRecord(state.resources, effect.resources), hotelStats: addRecord(state.hotelStats, effect.hotelStats), reputations: addRecord(state.reputations, effect.reputations), flags: { ...state.flags, ...effect.flags, monster_threat: threat }, fatherStoryProgress: clamp(state.fatherStoryProgress + Number(effect.fatherStoryProgress ?? 0)), selectedNightEventId: event.id, selectedNightChoiceId: choice.id };
  const withCase = effect.openCaseId ? openInvestigationCase(next,effect.openCaseId) : next;
  return { state: withCase, event, choice, entry: { day: state.day, type: "EVENT", message: `야간 사건 · ${event.title} · ${choice.label}`, relationshipChanges: effectiveRelationshipChanges } };
}
