import test from "node:test";
import assert from "node:assert/strict";
import { getInjuryRecovery, recalculateRoomEffects } from "../game/aura-effect-manager.ts";
import { getNightFoodDemand, resolveAuraNight } from "../game/aura-night-manager.ts";
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

test("Noah의 공동 식당은 두 명 이상이 식사할 때 최종 식량 수요를 1 절감한다", () => {
  const state = place([["walter",101],["claire",110]]);
  const withoutKitchen = resolveAuraNight(state.rooms,state.guests,1,"STABLE",0);
  const withKitchen = resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,{noah_community_kitchen:true});
  assert.equal(withoutKitchen.foodDemand,2);
  assert.equal(withKitchen.foodDemand,1);
  assert.equal(withKitchen.communityKitchenFoodSaving,1);
});

test("공동 식당 수요는 배정된 투숙객만 세고 Aura 하한과 올림 뒤 정확히 1을 절감한다", () => {
  const state = place([["walter",101],["claire",102]]);
  state.rooms = state.rooms.map((room) => room.roomNumber===101 ? {
    ...room,
    permanentEffects:[...room.permanentEffects,{id:"test-low-food",sourceGuestId:"walter",name:"절약",metric:"foodUse",operation:"ADD",value:-75}],
  } : room.roomNumber===102 ? {
    ...room,
    permanentEffects:[...room.permanentEffects,{id:"test-high-food",sourceGuestId:"claire",name:"추가 배급",metric:"foodUse",operation:"ADD",value:1}],
  } : room);
  state.guests = state.guests.map((guest) => guest.id==="mia" ? {...guest,status:"STAYING" as const,currentRoomNumber:null} : guest.id==="samuel" ? {...guest,status:"WAITING" as const,currentRoomNumber:103} : guest);
  const withoutKitchen = getNightFoodDemand(state.rooms,state.guests);
  const withKitchen = getNightFoodDemand(state.rooms,state.guests,{noah_community_kitchen:true});
  assert.deepEqual(withoutKitchen,{demand:2,saving:0});
  assert.deepEqual(withKitchen,{demand:1,saving:1});
});

test("공동 식당은 혼자 남은 투숙객의 식량 수요를 0으로 만들지 않는다", () => {
  const state = place([["walter",101]]);
  const result = resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,{noah_community_kitchen:true});
  assert.equal(result.foodDemand,1);
  assert.equal(result.communityKitchenFoodSaving,0);
});

test("Eleanor의 의료 Aura는 범위 안 질병만 막고 범위 밖 투숙객은 보호하지 않는다", () => {
  const state = place([["eleanor",201],["walter",210]]);
  const result = resolveAuraNight(state.rooms, state.guests, 7, "STABLE", 100);
  assert.equal(result.guests.find((guest) => guest.id === "eleanor")?.infectionState, "HEALTHY");
  assert.equal(result.guests.find((guest) => guest.id === "walter")?.infectionState, "SICK");
});

test("Eleanor의 상설 진료소는 호텔 전체 질병 확률을 5%p 낮추고 예방 대상을 기록한다", () => {
  const state = place([["walter",101]]);
  const withoutClinic = resolveAuraNight(state.rooms, state.guests, 1, "STABLE", 10);
  const withClinic = resolveAuraNight(state.rooms, state.guests, 1, "STABLE", 10, { eleanor_clinic_established: true });
  assert.equal(withoutClinic.guests.find((guest) => guest.id === "walter")?.infectionState, "SICK");
  assert.equal(withClinic.guests.find((guest) => guest.id === "walter")?.infectionState, "HEALTHY");
  assert.deepEqual(withClinic.clinicPreventedGuestIds, ["walter"]);
  assert.deepEqual(withoutClinic.clinicPreventedGuestIds, []);
});

test("일반 의료망이나 순회 진료 플래그는 상설 진료소 효과를 대신하지 않는다", () => {
  const state = place([["walter",101]]);
  const result = resolveAuraNight(state.rooms, state.guests, 1, "STABLE", 10, { medical_network_active: true, eleanor_mobile_medic: true });
  assert.equal(result.guests.find((guest) => guest.id === "walter")?.infectionState, "SICK");
  assert.deepEqual(result.clinicPreventedGuestIds, []);
});

test("객실 Medical Aura가 이미 막은 질병을 상설 진료소 예방으로 중복 기록하지 않는다", () => {
  const state = place([["eleanor",102],["walter",101]]);
  const result = resolveAuraNight(state.rooms, state.guests, 1, "STABLE", 10, { eleanor_clinic_established: true });
  assert.equal(result.guests.find((guest) => guest.id === "walter")?.infectionState, "HEALTHY");
  assert.ok(!result.clinicPreventedGuestIds.includes("walter"));
});

test("Hazel의 외곽 조기경보망은 객실 Aura 계산 뒤 야간 위협을 3 낮춘다", () => {
  const state = place([["walter",101]]);
  const withoutAlarm = resolveAuraNight(state.rooms, state.guests, 1, "STABLE", 0);
  const withAlarm = resolveAuraNight(state.rooms, state.guests, 1, "STABLE", 0, { perimeter_alarm: true });
  assert.equal(withAlarm.threatDelta, withoutAlarm.threatDelta - 3);
  assert.equal(withAlarm.perimeterAlarmThreatReduction, 3);
  assert.equal(withoutAlarm.perimeterAlarmThreatReduction, 0);
});

test("객실 Aura가 이미 위협 보정 하한에 도달하면 경보망 감소를 중복 기록하지 않는다", () => {
  const state = place([["walter",101]]);
  state.rooms = state.rooms.map((room) => room.roomNumber === 101 ? {
    ...room,
    permanentEffects: [{ id:"test-perimeter-effect", sourceGuestId:"test", name:"Test Perimeter", metric:"monsterThreat", operation:"ADD", value:-100 }],
  } : room);
  const result = resolveAuraNight(state.rooms, state.guests, 1, "STABLE", 0, { perimeter_alarm: true });
  assert.equal(result.threatDelta, -10);
  assert.equal(result.perimeterAlarmThreatReduction, 0);
});

test("객실 Aura가 -9를 만든 경계에서는 경보망의 실제 추가 감소 1만 기록한다", () => {
  const state = place([["walter",101]]);
  state.rooms = state.rooms.map((room) => room.roomNumber === 101 ? {
    ...room,
    permanentEffects: [{ id:"test-perimeter-effect", sourceGuestId:"test", name:"Test Perimeter", metric:"monsterThreat", operation:"ADD", value:-90 }],
  } : room);
  const result = resolveAuraNight(state.rooms, state.guests, 1, "STABLE", 0, { perimeter_alarm: true });
  assert.equal(result.threatDelta, -10);
  assert.equal(result.perimeterAlarmThreatReduction, 1);
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

test("DAY 정산은 상설 진료소가 예방한 투숙객을 호텔 로그에 남긴다", () => {
  const state = place([["walter",101]]);
  state.day = 1;
  state.phase = "night";
  state.worldState = "UNREST";
  state.flags.eleanor_clinic_established = true;
  state.selectedNightEventId = "quiet_watch";
  state.selectedNightChoiceId = "rest";
  state.guests = state.guests.map((guest) => guest.id === "walter" ? { ...guest, remainingNights: 2 } : guest);
  const resolved = resolveDay(state);
  assert.equal(resolved.guests.find((guest) => guest.id === "walter")?.infectionState, "HEALTHY");
  assert.ok(resolved.eventHistory.some((entry) => entry.message === "상설 진료소 예방 · 월터 브릭스"));
});

test("DAY 정산은 외곽 조기경보망의 지속 위협 보정을 적용하고 기록한다", () => {
  const state = place([["walter",101]]);
  state.phase = "night";
  state.flags.perimeter_alarm = true;
  state.flags.monster_threat = 10;
  state.selectedNightEventId = "quiet_watch";
  state.selectedNightChoiceId = "rest";
  state.guests = state.guests.map((guest) => guest.id === "walter" ? { ...guest, remainingNights: 2 } : guest);
  const resolved = resolveDay(state);
  assert.equal(resolved.flags.monster_threat, 7);
  assert.ok(resolved.eventHistory.some((entry) => entry.message === "외곽 조기경보망 가동 · Monster Threat 보정 -3"));
});

test("DAY 정산 로그는 저장 위협도 0 하한까지 반영한 실제 경보망 감소량만 표시한다", () => {
  const state = place([["walter",101]]);
  state.phase = "night";
  state.flags.perimeter_alarm = true;
  state.flags.monster_threat = 1;
  state.selectedNightEventId = "quiet_watch";
  state.selectedNightChoiceId = "rest";
  state.guests = state.guests.map((guest) => guest.id === "walter" ? { ...guest, remainingNights: 2 } : guest);
  const resolved = resolveDay(state);
  assert.equal(resolved.flags.monster_threat, 0);
  assert.ok(resolved.eventHistory.some((entry) => entry.message === "외곽 조기경보망 가동 · Monster Threat 보정 -1"));
});

test("DAY 정산은 공동 식당의 실제 식량 절감과 공개 배급 로그를 반영한다", () => {
  const state = place([["walter",101],["claire",110]]);
  state.phase="night";
  state.flags.noah_community_kitchen=true;
  state.selectedNightEventId="quiet_watch";
  state.selectedNightChoiceId="rest";
  state.guests=state.guests.map((guest)=>guest.status==="STAYING"?{...guest,remainingNights:2}:guest);
  const resolved=resolveDay(state);
  assert.equal(resolved.lastDaySummary?.consumed.food,1);
  assert.ok(resolved.eventHistory.some((entry)=>entry.message==="공동 식당 배급 · 식량 1 절감"));
});
