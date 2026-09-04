import { FACILITIES } from "./facility-data.ts";
import type { FacilityId, FacilityLevelDefinition, GameState, HotelActionId, HotelLogEntry, HotelStats, Reputations, Resources } from "./types.ts";

type ActionResult = { state: GameState; ok: boolean; message: string };
export type HotelActionDefinition = { name: string; cost: Partial<Resources>; resources?: Partial<Resources>; stats?: Partial<HotelStats>; reputation?: Partial<Reputations>; guestTrust?: number };

function clamp(value: number) { return Math.max(0, Math.min(100, value)); }
function mergeNumbers<T extends Record<string, number>>(current: T, changes: Partial<T>): T {
  return Object.fromEntries(Object.entries(current).map(([key, value]) => [key, clamp(value + Number(changes[key] ?? 0))])) as T;
}
function canAfford(resources: Resources, cost: Partial<Resources>) { return Object.entries(cost).every(([key, value]) => resources[key as keyof Resources] >= Number(value)); }
function spend(resources: Resources, cost: Partial<Resources>): Resources { return Object.fromEntries(Object.entries(resources).map(([key, value]) => [key, Math.max(0, value - Number(cost[key as keyof Resources] ?? 0))])) as Resources; }
function log(state: GameState, message: string): HotelLogEntry[] { return [...state.eventHistory, { day: state.day, type: "EVENT", message }]; }

const RESOURCE_KEYS = ["food", "water", "medicine", "fuel", "parts", "security"] as const satisfies readonly (keyof Resources)[];
const QUARTERMASTER_UPKEEP_PRIORITY = ["fuel", "water", "food", "parts", "medicine", "security"] as const satisfies readonly (keyof Resources)[];
export const QUARTERMASTER_UPKEEP_SAVING = 1;

function totalFacilityUpkeep(running: { active: FacilityLevelDefinition }[]): Resources {
  return Object.fromEntries(RESOURCE_KEYS.map((key) => [key, running.reduce((sum, item) => sum + Number(item.active.upkeep?.[key] ?? 0), 0)])) as Resources;
}

function getQuartermasterUpkeepSaving(state: GameState, requested: Resources): Partial<Resources> {
  if (state.flags.eli_quartermaster !== true) return {};
  const key = QUARTERMASTER_UPKEEP_PRIORITY.find((candidate) => requested[candidate] > 0);
  return key ? { [key]: Math.min(QUARTERMASTER_UPKEEP_SAVING, requested[key]) } : {};
}

function subtractSaving(requested: Resources, saving: Partial<Resources>): Resources {
  return Object.fromEntries(RESOURCE_KEYS.map((key) => [key, Math.max(0, requested[key] - Number(saving[key] ?? 0))])) as Resources;
}

export function buildFacility(state: GameState, facilityId: FacilityId): ActionResult {
  const facility = FACILITIES.find((item) => item.id === facilityId);
  if (!facility) return { state, ok: false, message: "존재하지 않는 시설입니다." };
  const currentLevel = state.facilities[facilityId] ?? 0;
  const nextLevel = facility.levels[currentLevel];
  if (!nextLevel) return { state, ok: false, message: "이미 최고 단계인 시설입니다." };
  if (state.actionPoints < 1) return { state, ok: false, message: "오늘 사용할 행동 포인트가 없습니다." };
  if (!canAfford(state.resources, nextLevel.cost)) return { state, ok: false, message: "건설 자원이 부족합니다." };
  const spent = spend(state.resources, nextLevel.cost);
  const resources = spent;
  const verb = currentLevel === 0 ? "완공" : "업그레이드";
  return { ok: true, message: `${facility.name} LV.${nextLevel.level} ${verb}`, state: { ...state, actionPoints: state.actionPoints - 1, facilities: { ...state.facilities, [facilityId]: nextLevel.level }, resources, hotelStats: mergeNumbers<HotelStats>(state.hotelStats, nextLevel.statChanges), reputations: mergeNumbers<Reputations>(state.reputations, nextLevel.reputationChanges), eventHistory: log(state, `시설 ${verb} · ${facility.name} LV.${nextLevel.level} · ${nextLevel.name}`) } };
}

export function canBuildFacility(state: GameState, facilityId: FacilityId): boolean {
  const facility = FACILITIES.find((item) => item.id === facilityId);
  if (!facility) return false;
  const nextLevel = facility.levels[state.facilities[facilityId] ?? 0];
  return Boolean(nextLevel && state.actionPoints > 0 && canAfford(state.resources, nextLevel.cost));
}

export function getFacilityEconomy(state: GameState, available: Resources): { resources: Resources; production: Partial<Resources>; upkeep: Partial<Resources>; upkeepSaving: Partial<Resources>; inactiveFacilities: FacilityId[] } {
  let resources = { ...available };
  const production: Partial<Resources> = {};
  const upkeep: Partial<Resources> = {};
  const configured = FACILITIES.flatMap((facility) => {
    const level = state.facilities[facility.id] ?? 0;
    const active = level ? facility.levels[level - 1] : null;
    return active ? [{ id: facility.id, active }] : [];
  });
  let running = configured.filter(item => !(state.flags.generator_outage_day === state.day && Number(item.active.upkeep?.fuel ?? 0) > 0));
  while (running.length) {
    const requested = totalFacilityUpkeep(running);
    const payable = subtractSaving(requested, getQuartermasterUpkeepSaving(state, requested));
    const deficient = RESOURCE_KEYS.filter((key) => payable[key] > resources[key]);
    if (!deficient.length) break;
    const next = running.filter((item) => !deficient.some((key) => Number(item.active.upkeep?.[key] ?? 0) > 0));
    if (next.length === running.length) break;
    running = next;
  }
  const runningIds = new Set(running.map((item) => item.id));
  const inactiveFacilities = configured.filter((item) => !runningIds.has(item.id)).map((item) => item.id);
  const requestedUpkeep = totalFacilityUpkeep(running);
  const upkeepSaving = getQuartermasterUpkeepSaving(state, requestedUpkeep);
  for (const { active } of running) {
    for (const [key, value] of Object.entries(active.production ?? {})) {
      const resourceKey = key as keyof Resources;
      production[resourceKey] = Number(production[resourceKey] ?? 0) + Number(value);
    }
  }
  for (const key of RESOURCE_KEYS) {
    const value = Math.max(0, requestedUpkeep[key] - Number(upkeepSaving[key] ?? 0));
    if (value > 0) upkeep[key] = value;
  }
  resources = spend(resources, upkeep);
  for (const [key, value] of Object.entries(production)) resources[key as keyof Resources] += Number(value);
  return { resources, production, upkeep, upkeepSaving, inactiveFacilities };
}

const ACTIONS: Record<HotelActionId, HotelActionDefinition> = {
  repair_hotel: { name: "호텔 보수", cost: { parts: 2 }, stats: { hotelCondition: 8 } },
  community_outreach: { name: "공동체 회의", cost: {}, reputation: { community: 8, humanitarian: 5 }, guestTrust: 5 },
  security_patrol: { name: "경계 순찰", cost: { fuel: 1 }, resources: { security: 5 }, stats: { security: 5 }, reputation: { military: 5, refugee: -2 } },
  trade_run: { name: "교역 원정", cost: { fuel: 2 }, resources: { food: 4, water: 4, parts: 1 }, stats: { resources: 4 }, reputation: { merchant: 6, humanitarian: -2 } },
};

export function getHotelActionDefinition(state: GameState, actionId: HotelActionId): HotelActionDefinition {
  const action = ACTIONS[actionId];
  if (actionId !== "trade_run" || state.flags.jack_fair_market !== true) return action;
  return {
    ...action,
    name: "공정 교역 원정",
    cost: { ...action.cost, fuel: 1 },
    reputation: { ...action.reputation, humanitarian: 0 },
  };
}

export function canPerformHotelAction(state: GameState, actionId: HotelActionId): boolean {
  const action = getHotelActionDefinition(state, actionId);
  return state.actionPoints > 0 && canAfford(state.resources, action.cost);
}

export function performHotelAction(state: GameState, actionId: HotelActionId, spendActionPoint = true): ActionResult {
  const action = getHotelActionDefinition(state, actionId);
  if (spendActionPoint && state.actionPoints < 1) return { state, ok: false, message: "오늘 사용할 행동 포인트가 없습니다." };
  if (!canAfford(state.resources, action.cost)) return { state, ok: false, message: "필요한 자원이 부족합니다." };
  const spent = spend(state.resources, action.cost);
  const guests = action.guestTrust ? state.guests.map((guest) => guest.checkedInDay !== null && guest.alive ? { ...guest, trust: clamp(guest.trust + action.guestTrust!) } : guest) : state.guests;
  const unavailableRoom = actionId === "repair_hotel" ? [...state.rooms].filter((room) => !room.recovery && (room.status === "DAMAGED" || room.status === "LOCKED")).sort((a, b) => a.roomCondition - b.roomCondition || a.roomNumber - b.roomNumber)[0] : null;
  const rooms = unavailableRoom ? state.rooms.map((room) => room.roomNumber === unavailableRoom.roomNumber ? { ...room, status: "EMPTY" as const, roomCondition: 100, occupied: false, guestId: null, temporaryEffects: [] } : room) : state.rooms;
  const repairedSiege = actionId === "repair_hotel" && state.flags.hotel_siege_breached === true;
  const repairDetails = [unavailableRoom ? `${unavailableRoom.roomNumber}호 복구` : null, repairedSiege ? "공성 피해 복구" : null].filter(Boolean);
  const repairDetail = repairDetails.length ? ` · ${repairDetails.join(" · ")}` : "";
  const flags = repairedSiege ? { ...state.flags, hotel_siege_breached: false, hotel_siege_damage_repaired: true } : state.flags;
  return { ok: true, message: `${action.name}${repairDetail} 완료`, state: { ...state, actionPoints: state.actionPoints - Number(spendActionPoint), guests, rooms, flags, resources: mergeNumbers<Resources>(spent, action.resources ?? {}), hotelStats: mergeNumbers<HotelStats>(state.hotelStats, action.stats ?? {}), reputations: mergeNumbers<Reputations>(state.reputations, action.reputation ?? {}), eventHistory: log(state, `${spendActionPoint ? '낮 행동' : '야간 작업'} · ${action.name}${repairDetail}`) } };
}
