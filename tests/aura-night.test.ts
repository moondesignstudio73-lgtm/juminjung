import test from "node:test";
import assert from "node:assert/strict";
import { getInjuryRecovery, recalculateRoomEffects } from "../game/aura-effect-manager.ts";
import { resolveAuraNight } from "../game/aura-night-manager.ts";
import { resolveDay } from "../game/day-manager.ts";
import { createInitialGameState } from "../game/save-manager.ts";
import { assignGuest } from "../game/room-manager.ts";

function place(entries: Array<[string, number]>) {
  const state = createInitialGameState();
  const assigned = new Map(entries);
  state.guests = state.guests.map((guest) => assigned.has(guest.id) ? {
    ...guest,
    status: "STAYING" as const,
    currentRoomNumber: assigned.get(guest.id)!,
    checkedInDay: 1,
  } : guest);
  state.rooms = entries.reduce((rooms, [guestId, roomNumber]) => assignGuest(rooms, roomNumber, guestId), state.rooms);
  state.rooms = recalculateRoomEffects(state.rooms, state.guests);
  return state;
}

function guestResult(guestId: string, roomNumber = 202, baseDiseaseChance = 0) {
  const state = place([[guestId, roomNumber]]);
  return resolveAuraNight(state.rooms, state.guests, 7, "STABLE", baseDiseaseChance);
}

test("Walter의 정비 Aura가 실제 호텔 상태 보정으로 환산된다", () => {
  assert.equal(guestResult("walter").hotelConditionDelta, 3);
});

test("Samuel의 보안 Aura가 실제 치안 보정으로 환산된다", () => {
  assert.equal(guestResult("samuel").securityDelta, 1);
});

test("Mia와 Claire의 Aura가 투숙객 Stress와 Trust를 실제 변경한다", () => {
  const mia = guestResult("mia").guests.find((guest) => guest.id === "mia")!;
  const claire = guestResult("claire").guests.find((guest) => guest.id === "claire")!;
  assert.equal(mia.stress, 37);
  assert.equal(claire.trust, 33);
});

test("Hazel의 경계와 Lily의 정보 Aura가 괴물 위협도를 낮춘다", () => {
  assert.equal(guestResult("hazel").threatDelta, -1);
  assert.equal(guestResult("lily").threatDelta, -1);
});

test("Eli의 절도 Aura는 낮은 Trust일 때만 범죄 위험을 만든다", () => {
  const lowTrust = guestResult("eli");
  const state = place([["eli", 202]]);
  state.guests = state.guests.map((guest) => guest.id === "eli" ? { ...guest, trust: 60 } : guest);
  const trusted = resolveAuraNight(recalculateRoomEffects(state.rooms, state.guests), state.guests, 7, "STABLE", 0);
  assert.equal(lowTrust.crimeDelta, 2);
  assert.equal(trusted.crimeDelta, 0);
});

test("Victor의 교역 Aura가 야간 자원 보너스를 만든다", () => {
  assert.deepEqual(guestResult("victor").tradeBonus, { food: 1, parts: 0 });
});

test("Noah의 식량 Aura는 여러 투숙객의 실제 식량 수요를 줄인다", () => {
  const state = place([["noah",202],["claire",201],["walter",203],["mia",101],["samuel",102],["ruth",103],["hazel",301]]);
  const result = resolveAuraNight(state.rooms, state.guests, 7, "STABLE", 0);
  assert.equal(result.foodDemand, 6);
  assert.ok(result.foodDemand < result.guests.filter((guest) => guest.status === "STAYING").length);
});

test("Eleanor의 의료 Aura는 범위 안 질병만 막고 범위 밖 투숙객은 보호하지 않는다", () => {
  const state = place([["eleanor",201],["walter",210]]);
  const result = resolveAuraNight(state.rooms, state.guests, 7, "STABLE", 100);
  assert.equal(result.guests.find((guest) => guest.id === "eleanor")?.infectionState, "HEALTHY");
  assert.equal(result.guests.find((guest) => guest.id === "walter")?.infectionState, "SICK");
});

test("Ruth 단독 치료는 5, Eleanor와 겹친 MEDICAL WARD는 최종 10을 회복한다", () => {
  const ruth = place([["ruth",302]]);
  const ward = place([["eleanor",301],["ruth",302]]);
  assert.equal(getInjuryRecovery(ruth.rooms.find((room) => room.roomNumber === 302)!), 5);
  assert.equal(getInjuryRecovery(ward.rooms.find((room) => room.roomNumber === 302)!), 10);
});

test("Aura 보정은 실제 DAY 정산의 호텔 상태와 치안에 반영된다", () => {
  const nightlyState = (guestId:string, auraEnabled:boolean) => {
    const state = place([[guestId,202]]);
    state.phase = "night";
    state.selectedNightEventId = "quiet_watch";
    state.selectedNightChoiceId = "rest";
    state.guests = state.guests.map((guest) => guest.id === guestId ? {
      ...guest,
      aura:auraEnabled ? guest.aura : undefined,
      remainingNights:2,
    } : guest);
    state.rooms = recalculateRoomEffects(state.rooms,state.guests);
    return state;
  };
  const walterWithAura = resolveDay(nightlyState("walter",true));
  const walterWithoutAura = resolveDay(nightlyState("walter",false));
  const samuelWithAura = resolveDay(nightlyState("samuel",true));
  const samuelWithoutAura = resolveDay(nightlyState("samuel",false));
  assert.equal(walterWithAura.hotelStats.hotelCondition-walterWithoutAura.hotelStats.hotelCondition,3);
  assert.equal(samuelWithAura.hotelStats.security-samuelWithoutAura.hotelStats.security,1);
});
