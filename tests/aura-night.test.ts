import test from "node:test";
import assert from "node:assert/strict";
import { getInjuryRecovery, recalculateRoomEffects } from "../game/aura-effect-manager.ts";
import { getNightFoodDemand, getNightWaterDemand, isCareTeamEligible, isNurseryEligible, resolveAuraNight } from "../game/aura-night-manager.ts";
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

test("Grace의 공동 구호조는 객실 보수 Aura 뒤 Hotel Condition을 1 더 회복한다", () => {
  const state=place([["walter",202]]);
  const withoutAid=resolveAuraNight(state.rooms,state.guests,7,"STABLE",0);
  const withAid=resolveAuraNight(state.rooms,state.guests,7,"STABLE",0,{grace_mutual_aid:true});
  assert.equal(withoutAid.hotelConditionDelta,3);
  assert.equal(withAid.hotelConditionDelta,4);
  assert.equal(withAid.mutualAidConditionRepair,1);
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

test("Rosa의 공동 생활조는 배정된 투숙객 두 명 이상일 때 물 수요를 1 절감한다", () => {
  const state=place([["walter",101],["claire",110]]);
  assert.deepEqual(getNightWaterDemand(state.guests),{demand:2,saving:0});
  assert.deepEqual(getNightWaterDemand(state.guests,{rosa_household_network:true}),{demand:1,saving:1});
  const result=resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,{rosa_household_network:true});
  assert.equal(result.waterDemand,1);
  assert.equal(result.householdWaterSaving,1);
});

test("공동 생활조는 한 명만 남거나 객실이 없는 투숙객 때문에 물 수요를 0으로 만들지 않는다", () => {
  const state=place([["walter",101]]);
  state.guests=state.guests.map((guest)=>guest.id==="mia"?{...guest,status:"STAYING" as const,currentRoomNumber:null}:guest);
  assert.deepEqual(getNightWaterDemand(state.guests,{rosa_household_network:true}),{demand:1,saving:0});
});

test("공동 생활조는 객실 번호가 남은 비투숙객을 인원과 절감 기준에서 제외한다", () => {
  const state=place([["walter",101],["claire",110]]);
  state.guests=state.guests.map((guest)=>guest.id==="claire"?{...guest,status:"CHECKED_OUT" as const}:guest);
  assert.deepEqual(getNightWaterDemand(state.guests,{rosa_household_network:true}),{demand:1,saving:0});
});

test("Samuel의 민간 경비대는 본인 체크아웃 뒤에도 야간 치안과 범죄를 보정한다", () => {
  const state = place([["walter",101]]);
  const result = resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,{samuel_civil_guard:true});
  assert.equal(result.civilGuardSecurityGain,2);
  assert.equal(result.civilGuardCrimeReduction,2);
  assert.equal(result.securityDelta,2);
  assert.equal(result.crimeDelta,-2);
});

test("공동 돌봄팀 대상은 데이터로 판정하고 건강한 일반 성인에게 무차별 적용하지 않는다", () => {
  const state=createInitialGameState();
  const mia=state.guests.find((guest)=>guest.id==="mia")!;
  const claire=state.guests.find((guest)=>guest.id==="claire")!;
  const walter=state.guests.find((guest)=>guest.id==="walter")!;
  assert.equal(isCareTeamEligible(mia),true);
  assert.equal(isCareTeamEligible(claire),true);
  assert.equal(isCareTeamEligible({...walter,health:79}),true);
  assert.equal(isCareTeamEligible({...walter,age:45,health:100,infectionState:"HEALTHY",baseTraits:[]}),false);
});

test("Ruth가 체크아웃해도 공동 돌봄팀은 취약 투숙객만 실제 회복한다", () => {
  const state=place([["mia",101],["claire",110],["walter",205]]);
  state.guests=state.guests.map((guest)=>guest.id==="mia"?{...guest,health:70,stress:20}:guest.id==="claire"?{...guest,health:90,stress:20}:guest.id==="walter"?{...guest,age:45,health:100,stress:10,infectionState:"HEALTHY" as const,baseTraits:[]}:guest);
  const withoutTeam=resolveAuraNight(state.rooms,state.guests,1,"STABLE",0);
  const result=resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,{ruth_care_team:true});
  const mia=result.guests.find((guest)=>guest.id==="mia")!;
  const claire=result.guests.find((guest)=>guest.id==="claire")!;
  const walter=result.guests.find((guest)=>guest.id==="walter")!;
  const miaWithout=withoutTeam.guests.find((guest)=>guest.id==="mia")!;
  const claireWithout=withoutTeam.guests.find((guest)=>guest.id==="claire")!;
  assert.deepEqual({health:mia.health-miaWithout.health,stress:miaWithout.stress-mia.stress},{health:3,stress:4});
  assert.deepEqual({health:claire.health-claireWithout.health,stress:claireWithout.stress-claire.stress},{health:3,stress:4});
  assert.deepEqual({health:walter.health,stress:walter.stress},{health:100,stress:10});
  assert.deepEqual(result.careTeamGuestIds,["mia","claire"]);
});

test("안전 육아실은 배정된 아이와 임신한 주민만 야간 불안을 낮춘다", () => {
  const state=place([["mia",101],["claire",110],["walter",205]]);
  const mia=state.guests.find((guest)=>guest.id==="mia")!;
  const claire=state.guests.find((guest)=>guest.id==="claire")!;
  const walter=state.guests.find((guest)=>guest.id==="walter")!;
  assert.equal(isNurseryEligible(mia),true);
  assert.equal(isNurseryEligible(claire),true);
  assert.equal(isNurseryEligible({...walter,health:50}),false);
  const baseline=resolveAuraNight(state.rooms,state.guests,1,"STABLE",0);
  const result=resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,{claire_nursery:true});
  assert.equal(result.guests.find((guest)=>guest.id==="mia")!.stress,baseline.guests.find((guest)=>guest.id==="mia")!.stress-3);
  assert.equal(result.guests.find((guest)=>guest.id==="claire")!.stress,baseline.guests.find((guest)=>guest.id==="claire")!.stress-3);
  assert.equal(result.guests.find((guest)=>guest.id==="walter")!.stress,baseline.guests.find((guest)=>guest.id==="walter")!.stress);
  assert.deepEqual(result.nurseryGuestIds,["mia","claire"]);
});

test("안전 육아실과 공동 돌봄팀은 같은 주민에게 독립적으로 중첩된다", () => {
  const state=place([["mia",101],["claire",110]]);
  const nurseryOnly=resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,{claire_nursery:true});
  const result=resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,{claire_nursery:true,ruth_care_team:true});
  assert.equal(result.guests.find((guest)=>guest.id==="mia")!.stress,nurseryOnly.guests.find((guest)=>guest.id==="mia")!.stress-4);
  assert.deepEqual(result.careTeamGuestIds,["mia","claire"]);
  assert.deepEqual(result.nurseryGuestIds,["mia","claire"]);
});

test("Stress가 이미 0인 육아실 대상자는 회복·수혜 기록·호텔 로그를 만들지 않는다", () => {
  const state=place([["mia",101]]);
  state.guests=state.guests.map((guest)=>guest.id==="mia"?{...guest,stress:0,health:77,remainingNights:2}:guest);
  const night=resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,{claire_nursery:true});
  const mia=night.guests.find((guest)=>guest.id==="mia")!;
  assert.deepEqual({stress:mia.stress,health:mia.health},{stress:0,health:77});
  assert.deepEqual(night.nurseryGuestIds,[]);
  state.phase="night";
  state.flags.claire_nursery=true;
  state.selectedNightEventId="quiet_watch";
  state.selectedNightChoiceId="rest";
  const resolved=resolveDay(state);
  assert.equal(resolved.eventHistory.some((entry)=>entry.message.startsWith("안전 육아실 돌봄")),false);
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

test("DAY 정산은 공동 구호조의 실제 호텔 보수를 적용하고 기록한다", () => {
  const state=place([["claire",101]]);
  state.phase="night";
  state.hotelStats.hotelCondition=50;
  state.flags.grace_mutual_aid=true;
  state.selectedNightEventId="quiet_watch";
  state.selectedNightChoiceId="rest";
  state.guests=state.guests.map((guest)=>guest.id==="claire"?{...guest,remainingNights:2}:guest);
  const resolved=resolveDay(state);
  assert.equal(resolved.hotelStats.hotelCondition,51);
  assert.ok(resolved.eventHistory.some((entry)=>entry.message==="공동 구호조 보수 · Hotel Condition +1"));
});

test("Hotel Condition 100에서는 공동 구호조가 허위 보수 로그를 남기지 않는다", () => {
  const state=place([["claire",101]]);
  state.phase="night";
  state.hotelStats.hotelCondition=100;
  state.flags.grace_mutual_aid=true;
  state.selectedNightEventId="quiet_watch";
  state.selectedNightChoiceId="rest";
  state.guests=state.guests.map((guest)=>guest.id==="claire"?{...guest,remainingNights:2}:guest);
  const resolved=resolveDay(state);
  assert.equal(resolved.hotelStats.hotelCondition,100);
  assert.equal(resolved.eventHistory.some((entry)=>entry.message.startsWith("공동 구호조 보수")),false);
});

test("공동 구호조는 Hotel Condition 0 하한에서도 큰 파손을 1 완화한 만큼 기록한다", () => {
  const state=place([["claire",101]]);
  state.rooms=state.rooms.map((room)=>room.roomNumber===101?{
    ...room,
    permanentEffects:[...room.permanentEffects,{id:"test-heavy-damage",sourceGuestId:"claire",name:"대규모 파손",metric:"breakdownRisk",operation:"ADD",value:100}],
  }:room);
  state.phase="night";
  state.hotelStats.hotelCondition=10;
  state.flags.grace_mutual_aid=true;
  state.selectedNightEventId="quiet_watch";
  state.selectedNightChoiceId="rest";
  state.guests=state.guests.map((guest)=>guest.id==="claire"?{...guest,remainingNights:2}:guest);
  const night=resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,state.flags);
  assert.deepEqual({delta:night.hotelConditionDelta,repair:night.mutualAidConditionRepair},{delta:-9,repair:1});
  const resolved=resolveDay(state);
  assert.equal(resolved.hotelStats.hotelCondition,1);
  assert.ok(resolved.eventHistory.some((entry)=>entry.message==="공동 구호조 보수 · Hotel Condition +1"));
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

test("Eli의 길잡이 임명만 안전 통로의 지속 위협 감소를 활성화한다", () => {
  const state=place([["walter",101]]);
  const mappedOnly=resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,{safe_routes_mapped:true});
  const pathfinder=resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,{eli_pathfinder:true,safe_routes_mapped:true});
  assert.equal(mappedOnly.pathfinderThreatReduction,0);
  assert.equal(mappedOnly.threatDelta,0);
  assert.equal(pathfinder.pathfinderThreatReduction,1);
  assert.equal(pathfinder.threatDelta,-1);
});

test("Vale와 Lily의 공동 연구 완성만 괴물 행동 예측의 지속 위협 감소를 활성화한다", () => {
  const state=place([["walter",101]]);
  const researchOnly=resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,{vale_research_complete:true});
  const shared=resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,{vale_research_complete:true,lily_vale_research_shared:true});
  assert.equal(researchOnly.researchPredictionThreatReduction,0);
  assert.equal(researchOnly.threatDelta,0);
  assert.equal(shared.researchPredictionThreatReduction,2);
  assert.equal(shared.threatDelta,-2);
});

test("DAY 정산은 괴물 행동 예측의 실제 위협 감소를 적용하고 기록한다", () => {
  const state=place([["walter",101]]);
  state.phase="night";
  state.flags.lily_vale_research_shared=true;
  state.flags.monster_threat=10;
  state.selectedNightEventId="quiet_watch";
  state.selectedNightChoiceId="rest";
  state.guests=state.guests.map((guest)=>guest.id==="walter"?{...guest,remainingNights:2}:guest);
  const resolved=resolveDay(state);
  assert.equal(resolved.flags.monster_threat,8);
  assert.ok(resolved.eventHistory.some((entry)=>entry.message==="괴물 행동 예측 · Monster Threat 보정 -2"));
});

test("경보망·안전 통로·행동 예측 순서로 위협 0 하한의 실제 감소량만 귀속한다", () => {
  const cases=[
    {threat:0,final:0,alarm:0,pathfinder:0,research:0},
    {threat:2,final:0,alarm:2,pathfinder:0,research:0},
    {threat:4,final:0,alarm:3,pathfinder:1,research:0},
    {threat:5,final:0,alarm:3,pathfinder:1,research:1},
    {threat:7,final:1,alarm:3,pathfinder:1,research:2},
  ];
  for (const expected of cases) {
    const state=place([["walter",101]]);
    state.phase="night";
    state.flags.perimeter_alarm=true;
    state.flags.eli_pathfinder=true;
    state.flags.lily_vale_research_shared=true;
    state.flags.monster_threat=expected.threat;
    state.selectedNightEventId="quiet_watch";
    state.selectedNightChoiceId="rest";
    state.guests=state.guests.map((guest)=>guest.id==="walter"?{...guest,remainingNights:2}:guest);
    const resolved=resolveDay(state);
    const alarmLog=resolved.eventHistory.find((entry)=>entry.message.startsWith("외곽 조기경보망 가동"));
    const pathfinderLog=resolved.eventHistory.find((entry)=>entry.message.startsWith("안전 통로 정찰"));
    const researchLog=resolved.eventHistory.find((entry)=>entry.message.startsWith("괴물 행동 예측"));
    assert.equal(resolved.flags.monster_threat,expected.final);
    assert.equal(alarmLog?.message,expected.alarm?`외곽 조기경보망 가동 · Monster Threat 보정 -${expected.alarm}`:undefined);
    assert.equal(pathfinderLog?.message,expected.pathfinder?`안전 통로 정찰 · Monster Threat 보정 -${expected.pathfinder}`:undefined);
    assert.equal(researchLog?.message,expected.research?`괴물 행동 예측 · Monster Threat 보정 -${expected.research}`:undefined);
  }
});

test("DAY 정산은 안전 통로의 실제 위협 감소를 적용하고 기록한다", () => {
  const state=place([["walter",101]]);
  state.phase="night";
  state.flags.eli_pathfinder=true;
  state.flags.monster_threat=10;
  state.selectedNightEventId="quiet_watch";
  state.selectedNightChoiceId="rest";
  state.guests=state.guests.map((guest)=>guest.id==="walter"?{...guest,remainingNights:2}:guest);
  const resolved=resolveDay(state);
  assert.equal(resolved.flags.monster_threat,9);
  assert.ok(resolved.eventHistory.some((entry)=>entry.message==="안전 통로 정찰 · Monster Threat 보정 -1"));
});

test("경보망 다음 안전 통로 순서로 위협 0 하한의 실제 감소량만 귀속한다", () => {
  const cases=[
    {threat:0,final:0,alarm:0,pathfinder:0},
    {threat:2,final:0,alarm:2,pathfinder:0},
    {threat:4,final:0,alarm:3,pathfinder:1},
    {threat:5,final:1,alarm:3,pathfinder:1},
  ];
  for (const expected of cases) {
    const state=place([["walter",101]]);
    state.phase="night";
    state.flags.perimeter_alarm=true;
    state.flags.eli_pathfinder=true;
    state.flags.monster_threat=expected.threat;
    state.selectedNightEventId="quiet_watch";
    state.selectedNightChoiceId="rest";
    state.guests=state.guests.map((guest)=>guest.id==="walter"?{...guest,remainingNights:2}:guest);
    const resolved=resolveDay(state);
    const alarmLog=resolved.eventHistory.find((entry)=>entry.message.startsWith("외곽 조기경보망 가동"));
    const pathfinderLog=resolved.eventHistory.find((entry)=>entry.message.startsWith("안전 통로 정찰"));
    assert.equal(resolved.flags.monster_threat,expected.final);
    assert.equal(alarmLog?.message,expected.alarm?`외곽 조기경보망 가동 · Monster Threat 보정 -${expected.alarm}`:undefined);
    assert.equal(pathfinderLog?.message,expected.pathfinder?`안전 통로 정찰 · Monster Threat 보정 -${expected.pathfinder}`:undefined);
  }
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

test("DAY 정산은 공동 생활조의 실제 물 절감과 배급 로그를 반영한다", () => {
  const state=place([["walter",101],["claire",110]]);
  state.phase="night";
  state.flags.rosa_household_network=true;
  state.selectedNightEventId="quiet_watch";
  state.selectedNightChoiceId="rest";
  state.guests=state.guests.map((guest)=>guest.status==="STAYING"?{...guest,remainingNights:2}:guest);
  const resolved=resolveDay(state);
  assert.equal(resolved.lastDaySummary?.consumed.water,1);
  assert.ok(resolved.eventHistory.some((entry)=>entry.message==="공동 생활조 배급 · 물 1 절감"));
});

test("DAY 정산은 민간 경비대의 지속 치안·범죄 보정과 순찰 로그를 반영한다", () => {
  const state=place([["walter",101]]);
  state.phase="night";
  state.hotelStats.security=50;
  state.hotelStats.crime=10;
  state.flags.samuel_civil_guard=true;
  state.selectedNightEventId="quiet_watch";
  state.selectedNightChoiceId="rest";
  state.guests=state.guests.map((guest)=>guest.status==="STAYING"?{...guest,remainingNights:2}:guest);
  const resolved=resolveDay(state);
  assert.equal(resolved.hotelStats.security,52);
  assert.equal(resolved.hotelStats.crime,8);
  assert.ok(resolved.eventHistory.some((entry)=>entry.message==="민간 경비대 순찰 · Security +2 · Crime -2"));
});

test("민간 경비대 로그는 Security 100과 Crime 0 경계에서 실제 변화량만 기록한다", () => {
  const state=place([["walter",101]]);
  state.phase="night";
  state.hotelStats.security=99;
  state.hotelStats.crime=1;
  state.flags.samuel_civil_guard=true;
  state.selectedNightEventId="quiet_watch";
  state.selectedNightChoiceId="rest";
  state.guests=state.guests.map((guest)=>guest.status==="STAYING"?{...guest,remainingNights:2}:guest);
  const resolved=resolveDay(state);
  assert.equal(resolved.hotelStats.security,100);
  assert.equal(resolved.hotelStats.crime,0);
  assert.ok(resolved.eventHistory.some((entry)=>entry.message==="민간 경비대 순찰 · Security +1 · Crime -1"));
});

test("객실 Aura가 야간 Security 보정 +10에 이미 도달하면 경비대 기여를 허위 기록하지 않는다", () => {
  const state=place([["walter",101]]);
  state.phase="night";
  state.hotelStats.security=50;
  state.hotelStats.crime=0;
  state.flags.samuel_civil_guard=true;
  state.selectedNightEventId="quiet_watch";
  state.selectedNightChoiceId="rest";
  state.rooms=state.rooms.map((room)=>room.roomNumber===101?{...room,permanentEffects:[...room.permanentEffects,{id:"test-security-cap",sourceGuestId:"walter",name:"포화 경비",metric:"security",operation:"ADD",value:100}]}:room);
  state.guests=state.guests.map((guest)=>guest.status==="STAYING"?{...guest,remainingNights:2}:guest);
  const nightly=resolveAuraNight(state.rooms,state.guests,1,"STABLE",0,state.flags);
  assert.equal(nightly.securityDelta,10);
  assert.equal(nightly.civilGuardSecurityGain,0);
  const resolved=resolveDay(state);
  assert.equal(resolved.hotelStats.security,60);
  assert.equal(resolved.eventHistory.some((entry)=>entry.message.startsWith("민간 경비대 순찰")),false);
});

test("DAY 정산은 공동 돌봄팀이 실제 돌본 투숙객만 호텔 기록에 남긴다", () => {
  const state=place([["mia",101],["walter",110]]);
  state.phase="night";
  state.flags.ruth_care_team=true;
  state.selectedNightEventId="quiet_watch";
  state.selectedNightChoiceId="rest";
  state.guests=state.guests.map((guest)=>guest.id==="mia"?{...guest,health:70,stress:20,remainingNights:2}:guest.id==="walter"?{...guest,age:45,health:100,stress:0,infectionState:"HEALTHY" as const,baseTraits:[],remainingNights:2}:guest);
  const resolved=resolveDay(state);
  const mia=resolved.guests.find((guest)=>guest.id==="mia")!;
  const walter=resolved.guests.find((guest)=>guest.id==="walter")!;
  assert.deepEqual({health:mia.health,stress:mia.stress},{health:73,stress:0});
  assert.deepEqual({health:walter.health,stress:walter.stress},{health:100,stress:0});
  assert.ok(resolved.eventHistory.some((entry)=>entry.message==="공동 돌봄팀 돌봄 · 미아 카터"));
});

test("DAY 정산은 안전 육아실이 실제 안정시킨 주민만 호텔 기록에 남긴다", () => {
  const state=place([["mia",101],["claire",110],["walter",205]]);
  state.phase="night";
  state.flags.claire_nursery=true;
  state.selectedNightEventId="quiet_watch";
  state.selectedNightChoiceId="rest";
  state.guests=state.guests.map((guest)=>guest.status==="STAYING"?{...guest,remainingNights:2}:guest);
  const resolved=resolveDay(state);
  assert.ok(resolved.eventHistory.some((entry)=>entry.message==="안전 육아실 돌봄 · 미아 카터 · 클레어 노박"));
  assert.equal(resolved.eventHistory.some((entry)=>entry.message.includes("월터 브릭스")&&entry.message.startsWith("안전 육아실")),false);
});

test("공동 돌봄 뒤 같은 밤 질병이 발생해도 회복 순서와 돌봄 기록을 보존한다", () => {
  const state=place([["walter",101]]);
  state.day=1;
  state.phase="night";
  state.worldState="UNREST";
  state.flags.ruth_care_team=true;
  state.selectedNightEventId="quiet_watch";
  state.selectedNightChoiceId="rest";
  state.guests=state.guests.map((guest)=>guest.id==="walter"?{...guest,health:70,infectionState:"HEALTHY" as const,remainingNights:2}:guest);
  const resolved=resolveDay(state);
  const walter=resolved.guests.find((guest)=>guest.id==="walter")!;
  assert.equal(walter.infectionState,"SICK");
  assert.equal(walter.health,63);
  assert.ok(resolved.eventHistory.some((entry)=>entry.message==="공동 돌봄팀 돌봄 · 월터 브릭스"));
  assert.ok(resolved.eventHistory.some((entry)=>entry.message==="객실 질병 발생 · 월터 브릭스"));
});
