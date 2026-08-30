import { FACILITIES } from "./facility-data.ts";
import type { FacilityId, GameState, HotelActionId, HotelLogEntry, HotelStats, Reputations, Resources } from "./types.ts";

type ActionResult = { state: GameState; ok: boolean; message: string };

function clamp(value: number) { return Math.max(0, Math.min(100, value)); }
function mergeNumbers<T extends Record<string, number>>(current: T, changes: Partial<T>): T {
  return Object.fromEntries(Object.entries(current).map(([key, value]) => [key, clamp(value + Number(changes[key] ?? 0))])) as T;
}
function canAfford(resources: Resources, cost: Partial<Resources>) { return Object.entries(cost).every(([key, value]) => resources[key as keyof Resources] >= Number(value)); }
function spend(resources: Resources, cost: Partial<Resources>): Resources { return Object.fromEntries(Object.entries(resources).map(([key, value]) => [key, Math.max(0, value - Number(cost[key as keyof Resources] ?? 0))])) as Resources; }
function log(state: GameState, message: string): HotelLogEntry[] { return [...state.eventHistory, { day: state.day, type: "EVENT", message }]; }

export function buildFacility(state: GameState, facilityId: FacilityId): ActionResult {
  const facility = FACILITIES.find((item) => item.id === facilityId);
  if (!facility) return { state, ok: false, message: "존재하지 않는 시설입니다." };
  if (state.facilities[facilityId]) return { state, ok: false, message: "이미 완공된 시설입니다." };
  if (state.actionPoints < 1) return { state, ok: false, message: "오늘 사용할 행동 포인트가 없습니다." };
  if (!canAfford(state.resources, facility.cost)) return { state, ok: false, message: "건설 자원이 부족합니다." };
  const spent = spend(state.resources, facility.cost);
  const resources = facility.statChanges.security ? { ...spent, security: clamp(spent.security + facility.statChanges.security) } : spent;
  return { ok: true, message: `${facility.name} 완공`, state: { ...state, actionPoints: state.actionPoints - 1, facilities: { ...state.facilities, [facilityId]: true }, resources, hotelStats: mergeNumbers<HotelStats>(state.hotelStats, facility.statChanges), reputations: mergeNumbers<Reputations>(state.reputations, facility.reputationChanges), eventHistory: log(state, `시설 완공 · ${facility.name}`) } };
}

export function canBuildFacility(state: GameState, facilityId: FacilityId): boolean {
  const facility = FACILITIES.find((item) => item.id === facilityId);
  return Boolean(facility && !state.facilities[facilityId] && state.actionPoints > 0 && canAfford(state.resources, facility.cost));
}

const ACTIONS: Record<HotelActionId, { name: string; cost: Partial<Resources>; resources?: Partial<Resources>; stats?: Partial<HotelStats>; reputation?: Partial<Reputations>; guestTrust?: number }> = {
  repair_hotel: { name: "호텔 보수", cost: { parts: 2 }, stats: { hotelCondition: 8 } },
  community_outreach: { name: "공동체 회의", cost: {}, reputation: { community: 8, humanitarian: 5 }, guestTrust: 5 },
  security_patrol: { name: "경계 순찰", cost: { fuel: 1 }, resources: { security: 5 }, stats: { security: 5 }, reputation: { military: 5, refugee: -2 } },
  trade_run: { name: "교역 원정", cost: { fuel: 2 }, resources: { food: 4, water: 4, parts: 1 }, stats: { resources: 4 }, reputation: { merchant: 6, humanitarian: -2 } },
};

export function performHotelAction(state: GameState, actionId: HotelActionId): ActionResult {
  const action = ACTIONS[actionId];
  if (state.actionPoints < 1) return { state, ok: false, message: "오늘 사용할 행동 포인트가 없습니다." };
  if (!canAfford(state.resources, action.cost)) return { state, ok: false, message: "필요한 자원이 부족합니다." };
  const spent = spend(state.resources, action.cost);
  const guests = action.guestTrust ? state.guests.map((guest) => guest.checkedInDay !== null && guest.alive ? { ...guest, trust: clamp(guest.trust + action.guestTrust!) } : guest) : state.guests;
  return { ok: true, message: `${action.name} 완료`, state: { ...state, actionPoints: state.actionPoints - 1, guests, resources: mergeNumbers<Resources>(spent, action.resources ?? {}), hotelStats: mergeNumbers<HotelStats>(state.hotelStats, action.stats ?? {}), reputations: mergeNumbers<Reputations>(state.reputations, action.reputation ?? {}), eventHistory: log(state, `낮 행동 · ${action.name}`) } };
}
