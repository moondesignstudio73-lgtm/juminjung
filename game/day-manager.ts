import { getInjuryRecovery, recalculateRoomEffects } from "./aura-effect-manager.ts";
import { checkoutGuest } from "./room-manager.ts";
import { advanceHotelStories } from "./story-event-manager.ts";
import { evaluateEndings } from "./ending-manager.ts";
import { determineWorldState } from "./world-state-manager.ts";
import { applyNightChoice, canChooseNightChoice, selectNightEvent } from "./night-event-manager.ts";
import { getFacilityEconomy } from "./hotel-action-manager.ts";
import { FACILITIES } from "./facility-data.ts";
import { queueNightEventCutscene } from "./cutscene-manager.ts";
import { resolveAuraNight } from "./aura-night-manager.ts";
import { getNextRevisitDay } from "./visitor-manager.ts";
import type { DaySummary, GameState, HotelLogEntry } from "./types.ts";

const FACILITY_NAMES = Object.fromEntries(FACILITIES.map((facility) => [facility.id, facility.name])) as Record<string, string>;
export const BASE_GENERATOR_FUEL_DEMAND = 1;

export function advanceDay(day: number): number { return Math.max(0, day) + 1; }

export function resolveDay(state: GameState): GameState {
  if (state.phase !== "night") throw new Error("DAY 정산은 야간 단계에서 한 번만 실행할 수 있습니다.");
  const selectedEvent = selectNightEvent(state);
  const fallbackChoice = [...selectedEvent.choices].reverse().find((choice) => canChooseNightChoice(state, choice)) ?? selectedEvent.choices[0];
  const night = applyNightChoice(state, state.selectedNightEventId ?? selectedEvent.id, state.selectedNightChoiceId ?? fallbackChoice.id);
  state = night.state;
  const story = advanceHotelStories(state.guests, state.day, state.rooms);
  const activeRooms = recalculateRoomEffects(state.rooms, story.guests);
  const auraNight = resolveAuraNight(activeRooms, story.guests, state.day, state.worldState, undefined, state.flags);
  const staying = auraNight.guests.filter((guest) => guest.status === "STAYING" && guest.currentRoomNumber !== null);
  const stayingIds = new Set(staying.map((guest) => guest.id));
  const microgridActive = state.flags.generator_network_stable === true;
  const demand = { food: auraNight.foodDemand, water: staying.length, fuel: microgridActive ? 0 : BASE_GENERATOR_FUEL_DEMAND };
  const consumed = { food: Math.min(state.resources.food, demand.food), water: Math.min(state.resources.water, demand.water), fuel: Math.min(state.resources.fuel, demand.fuel) };
  const checkedOutGuestIds: string[] = [];
  const guests = auraNight.guests.map((guest) => {
    if (!stayingIds.has(guest.id)) return guest;
    const room = activeRooms.find((candidate) => candidate.roomNumber === guest.currentRoomNumber);
    const health = Math.min(100, guest.health + (room ? getInjuryRecovery(room) : 0));
    const remainingNights = Math.max(0, guest.remainingNights - 1);
    if (remainingNights === 0) {
      checkedOutGuestIds.push(guest.id);
      return { ...guest, health, remainingNights, currentRoomNumber: null, status: "CHECKED_OUT" as const, storyFlags: { ...guest.storyFlags, last_checked_out_day: state.day, next_revisit_day: getNextRevisitDay(state.day) } };
    }
    return { ...guest, health, remainingNights };
  });
  const emptied = checkedOutGuestIds.reduce((rooms, guestId) => checkoutGuest(rooms, guestId), activeRooms);
  const nextDay = advanceDay(state.day);
  const afterGuestConsumption = {
    ...state.resources,
    food: Math.max(0, state.resources.food - consumed.food + auraNight.tradeBonus.food),
    water: Math.max(0, state.resources.water - consumed.water),
    fuel: Math.max(0, state.resources.fuel - consumed.fuel),
    parts: state.resources.parts + auraNight.tradeBonus.parts,
  };
  const economy = getFacilityEconomy(state, afterGuestConsumption);
  const threatBeforeAuraNight = Math.max(0,Number(state.flags.monster_threat??0));
  const threatAfterAuraNight = Math.max(0,threatBeforeAuraNight+auraNight.threatDelta);
  const threatWithoutAlarm = Math.max(0,threatBeforeAuraNight+auraNight.threatDelta+auraNight.perimeterAlarmThreatReduction);
  const appliedAlarmThreatReduction = threatWithoutAlarm-threatAfterAuraNight;
  const securityWithoutCivilGuard = Math.max(0,Math.min(100,state.hotelStats.security+auraNight.securityDelta-auraNight.civilGuardSecurityGain));
  const securityAfterAuraNight = Math.max(0,Math.min(100,state.hotelStats.security+auraNight.securityDelta));
  const appliedCivilGuardSecurityGain = securityAfterAuraNight-securityWithoutCivilGuard;
  const crimeWithoutCivilGuard = Math.max(0,Math.min(100,state.hotelStats.crime+auraNight.crimeDelta+auraNight.civilGuardCrimeReduction));
  const crimeAfterAuraNight = Math.max(0,Math.min(100,state.hotelStats.crime+auraNight.crimeDelta));
  const appliedCivilGuardCrimeReduction = crimeWithoutCivilGuard-crimeAfterAuraNight;
  const summary: DaySummary = { completedDay: state.day, nextDay, occupiedGuests: staying.length, consumed, facilityProduction: economy.production, facilityUpkeep: economy.upkeep, inactiveFacilities: economy.inactiveFacilities, checkedOutGuestIds };
  const entries: HotelLogEntry[] = [
    night.entry,
    ...story.entries,
    { day: state.day, type: "RESOURCE", message: `식량 ${consumed.food}, 물 ${consumed.water}, 연료 ${consumed.fuel} 소비` },
    ...(microgridActive ? [{day:state.day,type:"RESOURCE" as const,message:`독립 마이크로그리드 · 기본 발전기 연료 ${BASE_GENERATOR_FUEL_DEMAND} 절감`}] : []),
    ...(auraNight.communityKitchenFoodSaving ? [{day:state.day,type:"RESOURCE" as const,message:`공동 식당 배급 · 식량 ${auraNight.communityKitchenFoodSaving} 절감`}] : []),
    ...(auraNight.tradeBonus.food||auraNight.tradeBonus.parts ? [{day:state.day,type:"RESOURCE" as const,message:`Aura 교역 · 식량 +${auraNight.tradeBonus.food} · 부품 +${auraNight.tradeBonus.parts}`}] : []),
    ...(auraNight.sickGuestIds.length ? [{day:state.day,type:"EVENT" as const,message:`객실 질병 발생 · ${auraNight.sickGuestIds.map((id)=>guests.find((guest)=>guest.id===id)?.name??id).join(" · ")}`}] : []),
    ...(auraNight.clinicPreventedGuestIds.length ? [{day:state.day,type:"EVENT" as const,message:`상설 진료소 예방 · ${auraNight.clinicPreventedGuestIds.map((id)=>guests.find((guest)=>guest.id===id)?.name??id).join(" · ")}`}] : []),
    ...(appliedAlarmThreatReduction ? [{day:state.day,type:"EVENT" as const,message:`외곽 조기경보망 가동 · Monster Threat 보정 -${appliedAlarmThreatReduction}`}] : []),
    ...(appliedCivilGuardSecurityGain||appliedCivilGuardCrimeReduction ? [{day:state.day,type:"EVENT" as const,message:`민간 경비대 순찰${appliedCivilGuardSecurityGain?` · Security +${appliedCivilGuardSecurityGain}`:""}${appliedCivilGuardCrimeReduction?` · Crime -${appliedCivilGuardCrimeReduction}`:""}`}] : []),
    ...(Object.keys(economy.production).length ? [{ day: state.day, type: "RESOURCE" as const, message: `시설 생산 · ${Object.entries(economy.production).map(([key,value]) => `${key} +${value}`).join(" · ")}` }] : []),
    ...(economy.inactiveFacilities.length ? [{ day: state.day, type: "EVENT" as const, message: `유지비 부족 · ${economy.inactiveFacilities.map((id) => FACILITY_NAMES[id]).join(" · ")} 가동 중단` }] : []),
    ...checkedOutGuestIds.map((guestId): HotelLogEntry => ({ day: nextDay, type: "CHECK_OUT", message: `${state.guests.find((guest) => guest.id === guestId)?.name ?? guestId} · 숙박 종료 자동 체크아웃` })),
  ];
  const eleanor = guests.find((guest) => guest.id === "eleanor");
  const stayingAfter = guests.filter((guest) => guest.status === "STAYING");
  const acceptedSurvivors = guests.filter((guest) => guest.checkedInDay !== null && guest.status !== "REFUSED" && guest.alive);
  const nextState: GameState = {
    ...state,
    day: nextDay,
    phase: "report",
    guests,
    rooms: recalculateRoomEffects(emptied, guests),
    resources: economy.resources,
    flags: {
      ...state.flags,
      monster_threat: threatAfterAuraNight,
      eleanor_checked_in: eleanor?.status === "STAYING",
      eleanor_room: eleanor?.currentRoomNumber ?? 0,
    },
    eventHistory: [...state.eventHistory, ...entries],
    lastDaySummary: summary,
    hotelStats: {
      ...state.hotelStats,
      hotelCondition: Math.max(0,Math.min(100,state.hotelStats.hotelCondition+auraNight.hotelConditionDelta)),
      security: securityAfterAuraNight,
      crime: crimeAfterAuraNight,
      survivorPopulation: acceptedSurvivors.length,
      averageTrust: acceptedSurvivors.length ? Math.round(acceptedSurvivors.reduce((sum, guest) => sum + guest.trust, 0) / acceptedSurvivors.length) : 0,
      resources: Math.min(100, Math.round((economy.resources.food + economy.resources.water + economy.resources.fuel) / 3)),
    },
    actionPoints: state.maxActionPoints,
    selectedNightEventId: null,
    selectedNightChoiceId: null,
    lastNightEventId: night.event.id,
  };
  nextState.worldState = determineWorldState(nextState);
  const endings = evaluateEndings(nextState);
  return queueNightEventCutscene({ ...nextState, availableEndings: endings.available, endingProgress: endings.progress }, night.event.id, night.choice.id, summary.completedDay);
}
