import test from "node:test";
import assert from "node:assert/strict";
import { resolveDay } from "../game/day-manager.ts";
import { applyNightChoice, canChooseNightChoice, getEffectiveNightChoice, PUBLIC_BUNKER_FOOD_COST, PUBLIC_BUNKER_THREAT_GAIN, PUBLIC_BUNKER_WATER_COST, selectNightEvent } from "../game/night-event-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { dismissCutscene, queueNightEventCutscene } from "../game/cutscene-manager.ts";
import { evaluateEndings } from "../game/ending-manager.ts";

function withGuest() {
  const state = createInitialGameState();
  state.day = 12;
  state.guests[0] = { ...state.guests[0], status: "STAYING", currentRoomNumber: 301, checkedInDay: 1 };
  return state;
}

function withRelationshipPair(sourceId: string, targetId: string, sourceRoom = 301, targetRoom = 310) {
  const state = createInitialGameState();
  state.day = 16;
  state.guests = state.guests.map((guest) => guest.id === sourceId ? { ...guest, status: "STAYING", currentRoomNumber: sourceRoom, checkedInDay: 1 } : guest.id === targetId ? { ...guest, status: "STAYING", currentRoomNumber: targetRoom, checkedInDay: 1 } : guest);
  return state;
}

test("식량이 투숙객 수보다 적으면 배급실 사건이 선택된다", () => {
  const state = withGuest();
  state.resources.food = 0;
  assert.equal(selectNightEvent(state).id, "food_shortage");
});

test("공동 식당이 줄인 실제 수요만큼 식량이 있으면 배급 위기를 만들지 않는다", () => {
  const state = createInitialGameState();
  state.guests = state.guests.map((guest,index)=>index<2?{...guest,status:"STAYING",currentRoomNumber:101+index,checkedInDay:1}:guest);
  state.resources.food=1;
  assert.equal(selectNightEvent(state).id,"food_shortage");
  state.flags.noah_community_kitchen=true;
  assert.equal(selectNightEvent(state).id,"quiet_watch");
});

test("낮은 연료는 발전기 고장 사건을 발생시킨다", () => {
  const state = createInitialGameState();
  state.resources.fuel = 10;
  assert.equal(selectNightEvent(state).id, "generator_failure");
});

test("안정화된 마이크로그리드는 일반 저연료 발전기 고장을 억제한다", () => {
  const state = createInitialGameState();
  state.resources.fuel = 0;
  state.flags.generator_network_stable = true;
  assert.equal(selectNightEvent(state).id, "quiet_watch");
});

test("보유 자원이 부족한 야간 선택지는 비활성화된다", () => {
  const state = createInitialGameState();
  state.resources.fuel = 1;
  const event = selectNightEvent(state);
  const reserve = event.choices.find((choice) => choice.id === "reserve")!;
  assert.equal(canChooseNightChoice(state, reserve), false);
});

test("붕괴 단계의 높은 위협과 낮은 Security는 철문 침입 사건을 우선한다", () => {
  const state = withGuest();
  state.worldState = "COLLAPSE";
  state.flags.monster_threat = 25;
  state.hotelStats.security = 50;
  assert.equal(selectNightEvent(state).id, "perimeter_breach");
});

test("철문 침입 정산은 첫 괴물 목격 컷신을 한 번만 예약한다", () => {
  const state = withGuest();
  state.phase = "night";
  state.worldState = "COLLAPSE";
  state.flags.monster_threat = 25;
  state.hotelStats.security = 50;
  state.selectedNightEventId = "perimeter_breach";
  state.selectedNightChoiceId = "barricade";
  const resolved = resolveDay(state);
  assert.equal(resolved.activeCutsceneId, "first_monster_sighting");
  const dismissed = dismissCutscene(resolved);
  assert.equal(dismissed.activeCutsceneId, null);
  assert.deepEqual(dismissed.seenCutsceneIds, ["first_monster_sighting"]);
  assert.equal(queueNightEventCutscene(dismissed, "perimeter_breach", "barricade", 12), dismissed);
});

test("NPC 스토리 전용 컷신은 일반 야간 사건에서 잘못 예약되지 않는다", () => {
  const queued = queueNightEventCutscene(createInitialGameState(), "quiet_watch", "listen", 2);
  assert.equal(queued.activeCutsceneId, null);
});

test("철문 침입에 맞서 싸운 실제 정산은 투숙객을 다치게 하고 피습 컷신을 예약한다", () => {
  const state = withGuest();
  state.phase = "night";
  state.worldState = "COLLAPSE";
  state.flags.monster_threat = 25;
  state.hotelStats.security = 50;
  state.selectedNightEventId = "perimeter_breach";
  state.selectedNightChoiceId = "fight";
  const beforeHealth = state.guests[0].health;
  const resolved = resolveDay(state);
  assert.equal(resolved.activeCutsceneId, "guest_attacked");
  assert.equal(resolved.guests[0].health, beforeHealth - 15);
  assert.ok(resolved.eventHistory.some((entry) => entry.message.includes("무장 인원을 내보낸다")));
});

test("호텔 전체 공성은 DAY 25 이후 고위협·저치안 후반 상태에서만 발생한다", () => {
  const state = withGuest();
  state.day = 24;
  state.worldState = "CRITICAL";
  state.flags.monster_threat = 45;
  state.hotelStats.security = 74;
  assert.notEqual(selectNightEvent(state).id, "hotel_siege");
  state.day = 25;
  assert.equal(selectNightEvent(state).id, "hotel_siege");
  state.flags.monster_threat = 44;
  assert.notEqual(selectNightEvent(state).id, "hotel_siege");
  state.flags.monster_threat = 45;
  state.hotelStats.security = 75;
  assert.notEqual(selectNightEvent(state).id, "hotel_siege");
  state.hotelStats.security = 74;
  state.flags.hotel_siege_resolved = true;
  assert.notEqual(selectNightEvent(state).id, "hotel_siege");
  state.flags.hotel_siege_resolved = false;
  state.worldState = "END_STAGE";
  assert.equal(selectNightEvent(state).id, "hotel_siege");
  state.guests[0] = { ...state.guests[0], status: "CHECKED_OUT", currentRoomNumber: null };
  assert.notEqual(selectNightEvent(state).id, "hotel_siege");
});

test("호텔 공성은 동시에 발생 가능한 일반 철문 침입보다 우선한다", () => {
  const state = withGuest();
  state.day = 25;
  state.worldState = "CRITICAL";
  state.flags.monster_threat = 50;
  state.hotelStats.security = 50;
  assert.equal(selectNightEvent(state).id, "hotel_siege");
});

test("로비 사수는 방어 물자를 소모해 공성을 격퇴하지만 선두 투숙객이 다친다", () => {
  const state = withGuest();
  state.day = 25;
  state.phase = "night";
  state.worldState = "CRITICAL";
  state.flags.monster_threat = 50;
  state.hotelStats.security = 60;
  state.resources.security = 8;
  state.resources.parts = 5;
  state.selectedNightEventId = "hotel_siege";
  state.selectedNightChoiceId = "hold_lobby";
  const before = { securitySupply: state.resources.security, parts: state.resources.parts, condition: state.hotelStats.hotelCondition, hotelSecurity: state.hotelStats.security, threat: Number(state.flags.monster_threat), health: state.guests[0].health, stress: state.guests[0].stress, military: state.reputations.military, community: state.reputations.community };
  const resolved = resolveDay(state);
  assert.equal(resolved.activeCutsceneId, "hotel_siege_held");
  assert.equal(resolved.flags.hotel_siege_repelled, true);
  assert.equal(resolved.resources.security, before.securitySupply - 6);
  assert.equal(resolved.resources.parts, before.parts - 3);
  assert.equal(resolved.hotelStats.hotelCondition, before.condition - 5);
  assert.equal(resolved.hotelStats.security, before.hotelSecurity + 5);
  assert.equal(resolved.flags.monster_threat, before.threat - 18);
  assert.equal(resolved.guests[0].health, before.health - 20);
  assert.equal(resolved.guests[0].stress, before.stress + 1);
  assert.equal(resolved.reputations.military, before.military + 8);
  assert.equal(resolved.reputations.community, before.community + 4);
});

test("로비 방어전의 중상은 저체력 투숙객을 즉시 사망 수치로 만들지 않는다", () => {
  const state = withGuest();
  state.day = 25;
  state.worldState = "CRITICAL";
  state.flags.monster_threat = 50;
  state.hotelStats.security = 60;
  state.resources.security = 6;
  state.resources.parts = 3;
  state.guests[0] = { ...state.guests[0], health: 10 };
  const defended = applyNightChoice(state, "hotel_siege", "hold_lobby").state;
  assert.equal(defended.guests[0].health, 1);
  assert.equal(defended.guests[0].alive, true);
});

test("Owen의 자치 방위대는 화면 표시와 실제 공성 비용·부상을 함께 완화한다", () => {
  const state=withGuest();
  state.day=25;
  state.worldState="CRITICAL";
  state.flags.monster_threat=50;
  state.flags.owen_siege_plan=true;
  state.hotelStats.security=60;
  state.resources.security=4;
  state.resources.parts=2;
  const baseChoice=selectNightEvent(state).choices.find((candidate)=>candidate.id==="hold_lobby")!;
  const shownChoice=getEffectiveNightChoice(state,baseChoice);
  assert.deepEqual(shownChoice.requiredResources,{security:4,parts:2});
  assert.match(shownChoice.description,/보안 물자 4와 부품 2/);
  assert.match(shownChoice.description,/10 Health/);
  assert.equal(canChooseNightChoice(state,baseChoice),true);
  const beforeHealth=state.guests[0].health;
  const result=applyNightChoice(state,"hotel_siege","hold_lobby");
  assert.deepEqual({security:result.state.resources.security,parts:result.state.resources.parts},{security:0,parts:0});
  assert.equal(result.state.guests[0].health,beforeHealth-10);
  assert.deepEqual(result.choice.requiredResources,shownChoice.requiredResources);
  assert.equal(result.choice.description,shownChoice.description);
});

test("자치 방위대 부상 완화는 고정 문구가 아니라 원본 공성 부상의 절반에서 파생된다", () => {
  const state=withGuest();
  state.flags.owen_siege_plan=true;
  const baseChoice=selectNightEvent({ ...state, day:25, worldState:"CRITICAL", hotelStats:{...state.hotelStats,security:60}, flags:{...state.flags,monster_threat:50} }).choices.find((candidate)=>candidate.id==="hold_lobby")!;
  const changedBase={...baseChoice,effect:{...baseChoice.effect,targetGuestHealth:-30}};
  const effective=getEffectiveNightChoice(state,changedBase);
  assert.equal(effective.effect.targetGuestHealth,-15);
  assert.match(effective.description,/15 Health/);
});

test("자치 방위대도 완화된 공성 비용보다 자원이 부족하면 로비를 사수할 수 없다", () => {
  const state=withGuest();
  state.day=25;
  state.worldState="CRITICAL";
  state.flags.monster_threat=50;
  state.flags.owen_siege_plan=true;
  state.hotelStats.security=60;
  state.resources.security=3;
  state.resources.parts=2;
  const choice=selectNightEvent(state).choices.find((candidate)=>candidate.id==="hold_lobby")!;
  assert.equal(canChooseNightChoice(state,choice),false);
  assert.throws(()=>applyNightChoice(state,"hotel_siege","hold_lobby"),/필요한 자원이 부족/);
});

test("Samuel의 일반 민간 경비대 플래그는 Owen의 전용 공성 훈련을 대신하지 않는다", () => {
  const state=withGuest();
  state.day=25;
  state.worldState="CRITICAL";
  state.flags.monster_threat=50;
  state.flags.hotel_defense_force=true;
  state.flags.samuel_civil_guard=true;
  state.hotelStats.security=60;
  state.resources.security=4;
  state.resources.parts=2;
  const choice=selectNightEvent(state).choices.find((candidate)=>candidate.id==="hold_lobby")!;
  assert.equal(getEffectiveNightChoice(state,choice),choice);
  assert.equal(canChooseNightChoice(state,choice),false);
});

test("방어 물자가 부족하면 로비 사수는 선택할 수 없고 자원을 음수로 만들지 않는다", () => {
  const state = withGuest();
  state.day = 25;
  state.worldState = "CRITICAL";
  state.flags.monster_threat = 50;
  state.hotelStats.security = 60;
  state.resources.security = 5;
  state.resources.parts = 3;
  const choice = selectNightEvent(state).choices.find((candidate) => candidate.id === "hold_lobby")!;
  assert.equal(canChooseNightChoice(state, choice), false);
  assert.throws(() => applyNightChoice(state, "hotel_siege", "hold_lobby"), /필요한 자원이 부족/);
  assert.equal(state.resources.security, 5);
  assert.equal(state.resources.parts, 3);
});

test("지하 후퇴는 투숙객 부상 없이 호텔 손상·불안·추가 위협을 남긴다", () => {
  const state = withGuest();
  state.day = 25;
  state.worldState = "CRITICAL";
  state.flags.monster_threat = 50;
  state.hotelStats.security = 60;
  const before = { condition: state.hotelStats.hotelCondition, security: state.hotelStats.security, threat: Number(state.flags.monster_threat), health: state.guests[0].health, stress: state.guests[0].stress, community: state.reputations.community, humanitarian: state.reputations.humanitarian };
  const retreated = applyNightChoice(state, "hotel_siege", "retreat_basement").state;
  assert.equal(retreated.flags.hotel_siege_breached, true);
  assert.equal(retreated.hotelStats.hotelCondition, before.condition - 15);
  assert.equal(retreated.hotelStats.security, before.security - 10);
  assert.equal(retreated.flags.monster_threat, before.threat + 8);
  assert.equal(retreated.guests[0].health, before.health);
  assert.equal(retreated.guests[0].stress, before.stress + 12);
  assert.equal(retreated.reputations.community, before.community + 5);
  assert.equal(retreated.reputations.humanitarian, before.humanitarian + 3);
});

test("호텔 공성 결과별 컷신과 해결 상태는 저장 복원 후 한 번만 유지된다", () => {
  const state = withGuest();
  state.day = 25;
  state.worldState = "CRITICAL";
  state.flags.monster_threat = 50;
  state.hotelStats.security = 60;
  const retreated = applyNightChoice(state, "hotel_siege", "retreat_basement").state;
  const queued = queueNightEventCutscene(retreated, "hotel_siege", "retreat_basement", 25);
  assert.equal(queued.activeCutsceneId, "hotel_siege_retreat");
  const restored = restoreGameState(serializeGameState(queued));
  assert.equal(restored.flags.hotel_siege_resolved, true);
  assert.equal(restored.flags.hotel_siege_breached, true);
  assert.equal(restored.activeCutsceneId, "hotel_siege_retreat");
  const dismissed = dismissCutscene(restored);
  assert.equal(queueNightEventCutscene(dismissed, "hotel_siege", "retreat_basement", 25).activeCutsceneId, null);
});

test("DAY 1 정산은 첫날 밤 컷신을 한 번만 예약한다", () => {
  const state = createInitialGameState();
  state.day = 1;
  state.phase = "night";
  state.selectedNightEventId = "quiet_watch";
  state.selectedNightChoiceId = "rest";
  const resolved = resolveDay(state);
  assert.equal(resolved.lastDaySummary?.completedDay, 1);
  assert.equal(resolved.activeCutsceneId, "first_night");
  const dismissed = dismissCutscene(resolved);
  assert.deepEqual(dismissed.seenCutsceneIds, ["first_night"]);
  assert.equal(queueNightEventCutscene(dismissed, "quiet_watch", "rest", 1), dismissed);
});

test("첫날 밤 컷신은 quiet_watch가 아닌 사건 뒤에도 날짜로 예약된다", () => {
  const state = createInitialGameState();
  assert.equal(queueNightEventCutscene(state, "generator_failure", "reserve", 1).activeCutsceneId, "first_night");
});

test("발전기를 포기한 선택은 첫날에도 전용 정전 컷신을 우선한다", () => {
  const state = createInitialGameState();
  const blackout = queueNightEventCutscene(state, "generator_failure", "blackout", 1);
  assert.equal(blackout.activeCutsceneId, "generator_blackout");
  const dismissed = dismissCutscene(blackout);
  assert.equal(queueNightEventCutscene(dismissed, "generator_failure", "blackout", 2), dismissed);
  assert.equal(queueNightEventCutscene(state, "generator_failure", "reserve", 2).activeCutsceneId, null);
});

test("DAY 1에 범용 컷신이 겹쳐도 사건 전용 장면이 먼저 선택된다", () => {
  const state = createInitialGameState();
  assert.equal(queueNightEventCutscene(state, "perimeter_breach", "fight", 1).activeCutsceneId, "guest_attacked");
});

test("철문 침입에 맞서 싸우면 전용 피습 컷신이 우선되고 이후 첫 목격 장면도 남는다", () => {
  const state = createInitialGameState();
  const attacked = queueNightEventCutscene(state, "perimeter_breach", "fight", 12);
  assert.equal(attacked.activeCutsceneId, "guest_attacked");
  const dismissed = dismissCutscene(attacked);
  assert.equal(queueNightEventCutscene(dismissed, "perimeter_breach", "barricade", 13).activeCutsceneId, "first_monster_sighting");
});

test("피난민 수용과 거절은 같은 사건에서 서로 다른 결과 컷신을 예약한다", () => {
  const state = createInitialGameState();
  assert.equal(queueNightEventCutscene(state, "refugee_wave", "shelter", 7).activeCutsceneId, null);
  assert.equal(queueNightEventCutscene(state, "refugee_wave", "shelter", 8).activeCutsceneId, "refugees_sheltered");
  assert.equal(queueNightEventCutscene(state, "refugee_wave", "shelter", 9).activeCutsceneId, "refugees_sheltered");
  assert.equal(queueNightEventCutscene(state, "refugee_wave", "deny", 8).activeCutsceneId, "refugees_denied");
  assert.equal(queueNightEventCutscene(state, "refugee_wave", "unknown", 8).activeCutsceneId, null);
});

test("DAY 10 이후 낮은 보안과 위협이 겹치면 207호 시신 발견 사건이 선택된다", () => {
  const state = withGuest();
  state.day = 10;
  state.flags.monster_threat = 12;
  state.hotelStats.security = 55;
  assert.equal(selectNightEvent(state).id, "room_body_discovery");
});

test("207호가 투숙객에게 배정된 상태에서는 시신 발견 사건이 발생하지 않는다", () => {
  const state = withGuest();
  state.day = 10;
  state.flags.monster_threat = 12;
  state.hotelStats.security = 55;
  state.guests[0] = { ...state.guests[0], currentRoomNumber: 207 };
  state.rooms = state.rooms.map((room) => room.roomNumber === 207 ? { ...room, status: "OCCUPIED" as const, occupied: true, guestId: state.guests[0].id } : room);
  assert.notEqual(selectNightEvent(state).id, "room_body_discovery");
});

test("207호에 깨진 guestId 흔적이 남아 있으면 빈 객실 사건으로 오인하지 않는다", () => {
  const state = withGuest();
  state.day = 10;
  state.flags.monster_threat = 12;
  state.hotelStats.security = 55;
  state.rooms = state.rooms.map((room) => room.roomNumber === 207 ? { ...room, guestId: "stale-guest" } : room);
  assert.notEqual(selectNightEvent(state).id, "room_body_discovery");
});

test("207호 조사 선택은 사건 파일과 전용 컷신을 열지만 결론 전에는 괴물 침입을 확정하지 않는다", () => {
  const state = withGuest();
  state.day = 12;
  state.phase = "night";
  state.flags.monster_threat = 12;
  state.hotelStats.security = 55;
  state.selectedNightEventId = "room_body_discovery";
  state.selectedNightChoiceId = "investigate_body";
  const resolved = resolveDay(state);
  assert.equal(resolved.activeCutsceneId, "room_body_discovery");
  assert.equal(resolved.flags.room_body_discovery_resolved, true);
  assert.equal(resolved.flags.room_207_investigated, true);
  assert.equal(resolved.flags.monster_room_entry_clue, undefined);
  assert.deepEqual(resolved.investigationCases.map((entry)=>({id:entry.caseId,status:entry.status})),[{id:"ROOM_207",status:"OPEN"}]);
  assert.equal(resolved.flags.monster_threat, 15);
  assert.equal(resolved.rooms.find((room) => room.roomNumber === 207)?.status, "DAMAGED");
  assert.equal(resolved.rooms.find((room) => room.roomNumber === 207)?.roomCondition, 35);
  assert.notEqual(selectNightEvent(resolved).id, "room_body_discovery");
});

test("207호 봉쇄 선택은 자원을 소비하고 위협을 낮추며 사건 재발을 막는다", () => {
  const state = withGuest();
  state.day = 12;
  state.flags.monster_threat = 12;
  state.hotelStats.security = 55;
  const before = { fuel: state.resources.fuel, parts: state.resources.parts };
  const sealed = applyNightChoice(state, "room_body_discovery", "seal_room").state;
  assert.equal(sealed.resources.fuel, before.fuel - 2);
  assert.equal(sealed.resources.parts, before.parts - 1);
  assert.equal(sealed.flags.room_207_sealed, true);
  assert.equal(sealed.flags.monster_threat, 8);
  assert.equal(sealed.rooms.find((room) => room.roomNumber === 207)?.status, "LOCKED");
  assert.equal(sealed.rooms.find((room) => room.roomNumber === 207)?.roomCondition, 55);
  assert.notEqual(selectNightEvent(sealed).id, "room_body_discovery");
  assert.equal(queueNightEventCutscene(sealed, "room_body_discovery", "seal_room", 10).activeCutsceneId, "room_body_discovery");
});

test("207호 사건으로 사용할 수 없어진 객실 상태는 저장 복원 후에도 유지된다", () => {
  const state = withGuest();
  state.day = 12;
  state.flags.monster_threat = 12;
  state.hotelStats.security = 55;
  const sealed = applyNightChoice(state, "room_body_discovery", "seal_room").state;
  const restored = restoreGameState(serializeGameState(sealed));
  const room = restored.rooms.find((candidate) => candidate.roomNumber === 207)!;
  assert.equal(room.status, "LOCKED");
  assert.equal(room.roomCondition, 55);
});

test("207호 컷신은 사건 자체의 DAY 조건을 따르고 완료 날짜 경계에서 누락되지 않는다", () => {
  assert.equal(queueNightEventCutscene(createInitialGameState(), "room_body_discovery", "investigate_body", 9).activeCutsceneId, "room_body_discovery");
});

test("아버지 기록실 단서를 얻은 플레이만 DAY 20부터 91.3MHz 신호를 수신한다", () => {
  const state = withGuest();
  state.day = 19;
  state.flags.father_secret_discovered = true;
  assert.notEqual(selectNightEvent(state).id, "father_radio_signal");
  state.day = 20;
  assert.equal(selectNightEvent(state).id, "father_radio_signal");
  state.flags.father_secret_discovered = false;
  assert.notEqual(selectNightEvent(state).id, "father_radio_signal");
});

test("Lily의 공개 방송은 DAY 16부터 한 번만 생존자 응답 사건을 연다", () => {
  const state = createInitialGameState();
  state.flags.lily_documents_decoded = true;
  state.flags.lily_truth_broadcast = true;
  state.day = 15;
  assert.notEqual(selectNightEvent(state).id, "truth_responses");
  state.day = 16;
  assert.equal(selectNightEvent(state).id, "truth_responses");
  state.flags.lily_truth_archived = true;
  assert.notEqual(selectNightEvent(state).id, "truth_responses");
  state.flags.lily_truth_archived = false;
  state.flags.truth_responses_resolved = true;
  assert.notEqual(selectNightEvent(state).id, "truth_responses");
});

test("아버지의 91.3MHz 신호가 겹치면 공개 방송 응답보다 먼저 처리된다", () => {
  const state = createInitialGameState();
  state.day = 20;
  state.flags.lily_documents_decoded = true;
  state.flags.lily_truth_broadcast = true;
  state.flags.father_secret_discovered = true;
  assert.equal(selectNightEvent(state).id, "father_radio_signal");
  state.flags.father_radio_signal_resolved = true;
  assert.equal(selectNightEvent(state).id, "truth_responses");
});

test("되돌아온 증언을 검증하면 연료를 쓰고 보강 단서·위협·진행도를 함께 남긴다", () => {
  const state = createInitialGameState();
  state.day = 16;
  state.flags.lily_documents_decoded = true;
  state.flags.lily_truth_broadcast = true;
  state.fatherStoryProgress = 35;
  state.resources.fuel = 1;
  const event = selectNightEvent(state);
  const choice = event.choices.find((item) => item.id === "receive_testimonies")!;
  assert.equal(canChooseNightChoice(state, choice), true);
  const result = applyNightChoice(state, "truth_responses", "receive_testimonies");
  assert.equal(result.state.resources.fuel, 0);
  assert.equal(result.state.resources.parts, state.resources.parts + 1);
  assert.equal(result.state.flags.truth_responses_resolved, true);
  assert.equal(result.state.flags.survivor_testimonies_verified, true);
  assert.equal(result.state.flags.monster_origin_clue_2, true);
  assert.equal(result.state.flags.monster_threat, 5);
  assert.equal(result.state.fatherStoryProgress, 45);
  assert.match(result.entry.message, /증언이 돌아오는 주파수/);
  const restored = restoreGameState(serializeGameState(result.state));
  assert.equal(restored.flags.survivor_testimonies_verified, true);
  assert.equal(restored.flags.monster_origin_clue_2, true);
  assert.equal(restored.fatherStoryProgress, 45);
  assert.notEqual(selectNightEvent(restored).id, "truth_responses");
});

test("연료가 없으면 증언 검증은 막히지만 주파수 폐쇄는 위협을 낮추고 저장된다", () => {
  const state = createInitialGameState();
  state.day = 16;
  state.flags.lily_documents_decoded = true;
  state.flags.lily_truth_broadcast = true;
  state.flags.monster_threat = 9;
  state.resources.fuel = 0;
  const event = selectNightEvent(state);
  const receive = event.choices.find((item) => item.id === "receive_testimonies")!;
  assert.equal(canChooseNightChoice(state, receive), false);
  assert.throws(() => applyNightChoice(state, "truth_responses", "receive_testimonies"), /자원이 부족/);
  const closed = applyNightChoice(state, "truth_responses", "close_frequency").state;
  assert.equal(closed.flags.truth_frequency_closed, true);
  assert.equal(closed.flags.truth_responses_resolved, true);
  assert.equal(closed.flags.monster_threat, 4);
  assert.equal(closed.hotelStats.security, state.hotelStats.security + 3);
  const restored = restoreGameState(serializeGameState(closed));
  assert.equal(restored.flags.truth_frequency_closed, true);
  assert.notEqual(selectNightEvent(restored).id, "truth_responses");
});

test("아버지 신호 역추적은 자원과 위험을 감수해 THE TRUTH 대체 단서를 만든다", () => {
  const state = withGuest();
  state.day = 20;
  state.phase = "night";
  Object.assign(state.flags, { father_secret_discovered: true, monster_origin_clue_1: true, vale_research_complete: true, lily_documents_decoded: true });
  const before = { fuel: state.resources.fuel, parts: state.resources.parts, progress: state.fatherStoryProgress };
  state.selectedNightEventId = "father_radio_signal";
  state.selectedNightChoiceId = "trace_signal";
  const resolved = resolveDay(state);
  assert.equal(resolved.activeCutsceneId, "father_radio_signal");
  assert.equal(resolved.flags.father_signal_traced, true);
  assert.equal(resolved.flags.monster_origin_clue_2, true);
  assert.equal(resolved.resources.fuel, before.fuel - 3);
  assert.equal(resolved.resources.parts, before.parts - 1);
  assert.equal(resolved.fatherStoryProgress, before.progress + 15);
  assert.ok(evaluateEndings(resolved).available.includes("THE_TRUTH"));
});

test("아버지 신호에 응답하면 귀환 경로와 더 큰 위협이 열리고 사건은 반복되지 않는다", () => {
  const state = withGuest();
  state.day = 20;
  state.flags.father_secret_discovered = true;
  const beforeThreat = Number(state.flags.monster_threat ?? 0);
  const beforeProgress = state.fatherStoryProgress;
  const beforeSecurity = state.hotelStats.security;
  const answered = applyNightChoice(state, "father_radio_signal", "answer_signal").state;
  assert.equal(answered.flags.father_signal_answered, true);
  assert.equal(answered.flags.father_return_route, true);
  assert.equal(answered.flags.monster_threat, beforeThreat + 12);
  assert.equal(answered.fatherStoryProgress, beforeProgress + 20);
  assert.equal(answered.hotelStats.security, beforeSecurity - 3);
  assert.equal(answered.guests[0].stress, state.guests[0].stress + 8);
  assert.notEqual(selectNightEvent(answered).id, "father_radio_signal");
});

test("아버지 신호 응답의 스토리 진행도는 상한 100을 넘지 않는다", () => {
  const state = withGuest();
  state.day = 20;
  state.fatherStoryProgress = 95;
  state.flags.father_secret_discovered = true;
  const answered = applyNightChoice(state, "father_radio_signal", "answer_signal").state;
  assert.equal(answered.fatherStoryProgress, 100);
});

test("아버지 신호 조건이 충족되면 일반 발전기 위기보다 먼저 제시된다", () => {
  const state = withGuest();
  state.day = 20;
  state.resources.fuel = 10;
  state.flags.father_secret_discovered = true;
  assert.equal(selectNightEvent(state).id, "father_radio_signal");
});

test("철문 귀환 사건은 무전에 응답한 플레이만 DAY 24부터 만난다", () => {
  const state = withGuest();
  state.day = 23;
  state.flags.father_return_route = true;
  assert.notEqual(selectNightEvent(state).id, "father_at_gate");
  state.day = 24;
  assert.equal(selectNightEvent(state).id, "father_at_gate");
  state.flags.father_return_route = false;
  state.flags.father_signal_traced = true;
  assert.notEqual(selectNightEvent(state).id, "father_at_gate");
});

test("철문 밖 격리 검증은 물자를 소모하고 생체 증거와 전용 컷신을 남긴다", () => {
  const state = withGuest();
  state.day = 24;
  state.phase = "night";
  Object.assign(state.flags, { father_return_route: true, father_secret_discovered: true, monster_origin_clue_1: true, vale_research_complete: true, lily_documents_decoded: true });
  const before = { medicine: state.resources.medicine, securitySupply: state.resources.security, hotelSecurity: state.hotelStats.security, threat: Number(state.flags.monster_threat ?? 0), progress: state.fatherStoryProgress };
  state.selectedNightEventId = "father_at_gate";
  state.selectedNightChoiceId = "quarantine_verify";
  const resolved = resolveDay(state);
  assert.equal(resolved.activeCutsceneId, "father_at_gate_quarantine");
  assert.equal(resolved.flags.father_return_quarantined, true);
  assert.equal(resolved.flags.father_memory_test_passed, true);
  assert.equal(resolved.flags.father_sample_anomalous, true);
  assert.equal(resolved.flags.monster_origin_clue_2, true);
  assert.equal(resolved.resources.medicine, before.medicine - 1);
  assert.equal(resolved.resources.security, before.securitySupply - 2);
  assert.equal(resolved.hotelStats.security, before.hotelSecurity + 2);
  assert.equal(resolved.flags.monster_threat, Math.max(0, before.threat - 2));
  assert.equal(resolved.fatherStoryProgress, before.progress + 15);
  assert.ok(evaluateEndings(resolved).available.includes("THE_TRUTH"));
});

test("철문 밖 검증은 의약품 1·보안 물자 2의 정확한 경계에서만 가능하다", () => {
  const state = withGuest();
  state.day = 24;
  state.flags.father_return_route = true;
  state.resources.medicine = 1;
  state.resources.security = 2;
  const choice = selectNightEvent(state).choices.find((candidate) => candidate.id === "quarantine_verify")!;
  assert.equal(canChooseNightChoice(state, choice), true);
  state.resources.medicine = 0;
  assert.equal(canChooseNightChoice(state, choice), false);
  assert.throws(() => applyNightChoice(state, "father_at_gate", "quarantine_verify"), /필요한 자원이 부족/);
  state.resources.medicine = 1;
  state.resources.security = 1;
  assert.equal(canChooseNightChoice(state, choice), false);
});

test("철문을 즉시 열면 재회 가능성과 큰 호텔 위험이 함께 기록된다", () => {
  const state = withGuest();
  state.day = 24;
  state.flags.father_return_route = true;
  const before = { fuel: state.resources.fuel, parts: state.resources.parts, threat: Number(state.flags.monster_threat ?? 0), security: state.hotelStats.security, stress: state.guests[0].stress, progress: state.fatherStoryProgress };
  const opened = applyNightChoice(state, "father_at_gate", "open_gate").state;
  assert.equal(opened.flags.father_return_admitted, true);
  assert.equal(opened.flags.father_reunion_possible, true);
  assert.notEqual(opened.flags.monster_origin_clue_2, true);
  assert.equal(opened.resources.fuel, before.fuel + 4);
  assert.equal(opened.resources.parts, before.parts + 3);
  assert.equal(opened.flags.monster_threat, before.threat + 15);
  assert.equal(opened.hotelStats.security, before.security - 5);
  assert.equal(opened.guests[0].stress, before.stress + 10);
  assert.equal(opened.fatherStoryProgress, before.progress + 25);
  assert.notEqual(selectNightEvent(opened).id, "father_at_gate");
});

test("철문 귀환 결과와 컷신은 저장 복원 후에도 유지된다", () => {
  const state = withGuest();
  state.day = 24;
  state.flags.father_return_route = true;
  const chosen = applyNightChoice(state, "father_at_gate", "quarantine_verify").state;
  const queued = queueNightEventCutscene(chosen, "father_at_gate", "quarantine_verify", 24);
  const restored = restoreGameState(serializeGameState(queued));
  assert.equal(restored.flags.father_return_encounter_resolved, true);
  assert.equal(restored.flags.father_return_quarantined, true);
  assert.equal(restored.flags.father_memory_test_passed, true);
  assert.equal(restored.flags.father_sample_anomalous, true);
  assert.equal(restored.activeCutsceneId, "father_at_gate_quarantine");
});

test("철문 귀환 컷신은 선택 결과별로 한 번만 재생된다", () => {
  const state = withGuest();
  state.day = 24;
  state.flags.father_return_route = true;
  const opened = applyNightChoice(state, "father_at_gate", "open_gate").state;
  const queued = queueNightEventCutscene(opened, "father_at_gate", "open_gate", 24);
  assert.equal(queued.activeCutsceneId, "father_at_gate_opened");
  const dismissed = dismissCutscene(queued);
  assert.equal(queueNightEventCutscene(dismissed, "father_at_gate", "open_gate", 24).activeCutsceneId, null);
});

test("실제 철문 침입 위기는 아버지 귀환 후보보다 먼저 처리된다", () => {
  const state = withGuest();
  state.day = 24;
  state.worldState = "COLLAPSE";
  state.hotelStats.security = 50;
  Object.assign(state.flags, { father_return_route: true, monster_threat: 20 });
  assert.equal(selectNightEvent(state).id, "perimeter_breach");
});

test("발전기 정전 실제 정산은 호텔 상태·치안을 낮추고 전용 컷신과 후속 플래그를 남긴다", () => {
  const state = createInitialGameState();
  state.day = 4;
  state.phase = "night";
  state.resources.fuel = 10;
  state.selectedNightEventId = "generator_failure";
  state.selectedNightChoiceId = "blackout";
  const resolved = resolveDay(state);
  assert.equal(resolved.activeCutsceneId, "generator_blackout");
  assert.equal(resolved.flags.generator_blackout, true);
  assert.equal(resolved.hotelStats.hotelCondition, state.hotelStats.hotelCondition - 3);
  assert.equal(resolved.hotelStats.security, state.hotelStats.security - 3);
});

test("피난민 선택 결과 컷신은 실제 DAY 정산의 선택과 플래그를 함께 반영한다", () => {
  const shelter = createInitialGameState();
  shelter.day = 8;
  shelter.phase = "night";
  shelter.worldState = "UNREST";
  shelter.selectedNightEventId = "refugee_wave";
  shelter.selectedNightChoiceId = "shelter";
  const sheltered = resolveDay(shelter);
  assert.equal(sheltered.activeCutsceneId, "refugees_sheltered");
  assert.equal(sheltered.flags.refugees_sheltered, true);
  assert.equal(sheltered.flags.refugees_denied, false);

  const deny = createInitialGameState();
  deny.day = 8;
  deny.phase = "night";
  deny.worldState = "UNREST";
  deny.selectedNightEventId = "refugee_wave";
  deny.selectedNightChoiceId = "deny";
  const denied = resolveDay(deny);
  assert.equal(denied.activeCutsceneId, "refugees_denied");
  assert.equal(denied.flags.refugees_denied, true);
  assert.equal(denied.flags.refugees_sheltered, false);
});

test("본 피난민 결과 컷신은 저장 복원 뒤 같은 선택에서 다시 예약되지 않는다", () => {
  const queued = queueNightEventCutscene(createInitialGameState(), "refugee_wave", "shelter", 8);
  const restored = restoreGameState(serializeGameState(dismissCutscene(queued)));
  assert.deepEqual(restored.seenCutsceneIds, ["refugees_sheltered"]);
  assert.equal(queueNightEventCutscene(restored, "refugee_wave", "shelter", 12), restored);
});

test("DAY 2 이후에는 첫날 밤 컷신을 뒤늦게 재생하지 않는다", () => {
  const state = createInitialGameState();
  state.day = 5;
  state.phase = "night";
  state.selectedNightEventId = "quiet_watch";
  state.selectedNightChoiceId = "rest";
  assert.equal(resolveDay(state).activeCutsceneId, null);
});

test("피난민을 받아들이면 자원을 소비하고 평판·위협·플래그가 변한다", () => {
  const state = createInitialGameState();
  state.day = 8;
  state.worldState = "UNREST";
  const result = applyNightChoice(state, "refugee_wave", "shelter");
  assert.equal(result.event.id, "refugee_wave");
  assert.equal(result.state.resources.food, state.resources.food - 4);
  assert.equal(result.state.reputations.refugee, 8);
  assert.equal(result.state.flags.refugees_sheltered, true);
  assert.equal(result.state.flags.refugees_denied, false);
  assert.equal(result.state.flags.monster_threat, 4);
});

test("Victor의 공개 벙커망은 피난민 수용 UI와 정산의 비용·위협을 함께 낮춘다", () => {
  const state = createInitialGameState();
  state.day = 8;
  state.worldState = "UNREST";
  state.flags.bunker_network_open = true;
  state.flags.victor_public_trust = true;
  state.resources.food = PUBLIC_BUNKER_FOOD_COST;
  state.resources.water = PUBLIC_BUNKER_WATER_COST;
  const baseChoice = selectNightEvent(state).choices.find((choice) => choice.id === "shelter")!;
  const shownChoice = getEffectiveNightChoice(state, baseChoice);
  assert.deepEqual(shownChoice.requiredResources, { food: 2, water: 2 });
  assert.match(shownChoice.description, /식량 2·물 2/);
  assert.match(shownChoice.description, /위협 증가를 1/);
  assert.equal(canChooseNightChoice(state, baseChoice), true);
  const result = applyNightChoice(state, "refugee_wave", "shelter");
  assert.deepEqual(result.choice, shownChoice);
  assert.equal(result.state.resources.food, 0);
  assert.equal(result.state.resources.water, 0);
  assert.equal(result.state.flags.monster_threat, PUBLIC_BUNKER_THREAT_GAIN);
  assert.equal(result.state.flags.refugees_sheltered, true);
  assert.equal(result.state.flags.bunker_refugees_sheltered, true);
});

test("공개 벙커 수용은 실제 완화 비용이 부족하면 막히고 독점 경로에는 적용되지 않는다", () => {
  const publicState = createInitialGameState();
  publicState.day = 8;
  publicState.worldState = "UNREST";
  publicState.flags.bunker_network_open = true;
  publicState.flags.victor_public_trust = true;
  publicState.resources.food = 1;
  publicState.resources.water = 2;
  const publicChoice = selectNightEvent(publicState).choices.find((choice) => choice.id === "shelter")!;
  assert.equal(canChooseNightChoice(publicState, publicChoice), false);
  assert.throws(() => applyNightChoice(publicState, "refugee_wave", "shelter"), /자원이 부족/);

  const monopolyState = createInitialGameState();
  monopolyState.day = 8;
  monopolyState.worldState = "UNREST";
  monopolyState.flags.victor_monopoly_alliance = true;
  monopolyState.resources.food = 2;
  monopolyState.resources.water = 2;
  const monopolyChoice = selectNightEvent(monopolyState).choices.find((choice) => choice.id === "shelter")!;
  assert.deepEqual(getEffectiveNightChoice(monopolyState, monopolyChoice).requiredResources, { food: 4, water: 3 });
  assert.equal(canChooseNightChoice(monopolyState, monopolyChoice), false);

  monopolyState.flags.bunker_network_open = true;
  monopolyState.flags.victor_public_trust = true;
  assert.deepEqual(getEffectiveNightChoice(monopolyState, monopolyChoice).requiredResources, { food: 4, water: 3 });
});

test("저장 복원 뒤에도 공개 벙커 피난민 완화 계약이 유지된다", () => {
  const state = createInitialGameState();
  state.day = 8;
  state.worldState = "UNREST";
  state.flags.bunker_network_open = true;
  state.flags.victor_public_trust = true;
  const restored = restoreGameState(serializeGameState(state));
  const choice = selectNightEvent(restored).choices.find((item) => item.id === "shelter")!;
  assert.deepEqual(getEffectiveNightChoice(restored, choice).requiredResources, { food: 2, water: 2 });
});

test("피난민 거절과 발전기 정전은 후속 방문 장면 플래그를 남긴다", () => {
  const refugeeState = createInitialGameState();
  refugeeState.day = 8;
  refugeeState.worldState = "UNREST";
  const denied = applyNightChoice(refugeeState, "refugee_wave", "deny").state;
  assert.equal(denied.flags.refugees_denied, true);
  assert.equal(denied.flags.refugees_sheltered, false);
  const generatorState = createInitialGameState();
  generatorState.resources.fuel = 10;
  assert.equal(applyNightChoice(generatorState, "generator_failure", "blackout").state.flags.generator_blackout, true);
});

test("야간 선택은 정산 로그와 마지막 사건으로 저장되고 임시 선택은 초기화된다", () => {
  const state = createInitialGameState();
  state.phase = "night";
  state.selectedNightEventId = "quiet_watch";
  state.selectedNightChoiceId = "rest";
  const resolved = resolveDay(state);
  assert.equal(resolved.lastNightEventId, "quiet_watch");
  assert.equal(resolved.selectedNightEventId, null);
  assert.equal(resolved.selectedNightChoiceId, null);
  assert.ok(resolved.eventHistory.some((entry) => entry.message.includes("긴 복도, 짧은 밤")));
});

test("Save v13은 야간 선택과 진행 중인 컷신을 복원한다", () => {
  const state = createInitialGameState();
  state.selectedNightEventId = "quiet_watch";
  state.selectedNightChoiceId = "patrol";
  state.activeCutsceneId = "first_monster_sighting";
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.version, 13);
  assert.equal(restored.selectedNightEventId, "quiet_watch");
  assert.equal(restored.selectedNightChoiceId, "patrol");
  assert.equal(restored.activeCutsceneId, "first_monster_sighting");
});

test("손상 저장의 알 수 없는 컷신과 비배열 시청 기록은 안전하게 제거된다", () => {
  const raw = JSON.parse(serializeGameState(createInitialGameState()));
  raw.activeCutsceneId = "unknown_scene";
  raw.seenCutsceneIds = "first_monster_sighting";
  const restored = restoreGameState(JSON.stringify(raw));
  assert.equal(restored.activeCutsceneId, null);
  assert.deepEqual(restored.seenCutsceneIds, []);
});

test("Lily와 Vale는 같은 층 이상으로 가까울 때만 관계 사건을 만든다", () => {
  const close = withRelationshipPair("lily", "vale", 301, 310);
  const far = withRelationshipPair("lily", "vale", 301, 110);
  assert.equal(selectNightEvent(close).id, "lily_vale_breakthrough");
  assert.equal(selectNightEvent(far).id, "quiet_watch");
});

test("Owen과 Hayes의 강한 적대 관계는 선택 결과로 양쪽 관계와 상태를 바꾼다", () => {
  const state = withRelationshipPair("owen", "hayes");
  assert.equal(selectNightEvent(state).id, "owen_hayes_standoff");
  const result = applyNightChoice(state, "owen_hayes_standoff", "separate");
  const owen = result.state.guests.find((guest) => guest.id === "owen")!;
  const hayes = result.state.guests.find((guest) => guest.id === "hayes")!;
  assert.equal(owen.relationships.find((relation) => relation.targetId === "hayes")?.value, -65);
  assert.equal(hayes.relationships.find((relation) => relation.targetId === "owen")?.value, -65);
  assert.equal(owen.stress, 40);
  assert.equal(hayes.trust, 20);
  assert.equal(result.entry.relationshipChanges?.length, 2);
  assert.equal(result.state.flags.owen_hayes_standoff_resolved, true);
  assert.notEqual(selectNightEvent(result.state).id, "owen_hayes_standoff");
});

test("의료진 공동 진료는 배치 관계와 의약품을 실제 NPC 회복으로 연결한다", () => {
  const state = withRelationshipPair("eleanor", "ruth");
  const result = applyNightChoice(state, "medical_shift", "joint_triage");
  const eleanor = result.state.guests.find((guest) => guest.id === "eleanor")!;
  const ruth = result.state.guests.find((guest) => guest.id === "ruth")!;
  assert.equal(result.state.resources.medicine, state.resources.medicine - 1);
  assert.equal(eleanor.health, 88);
  assert.equal(ruth.health, 88);
  assert.equal(eleanor.relationships.find((relation) => relation.targetId === "ruth")?.value, 50);
  assert.equal(ruth.relationships.find((relation) => relation.targetId === "eleanor")?.value, 50);
  assert.equal(result.state.flags.medical_joint_triage, true);
});

test("야간 사건은 오래된 사건 ID와 감당할 수 없는 선택을 대체 적용하지 않는다", () => {
  const state = createInitialGameState();
  state.resources.fuel = 1;
  assert.throws(() => applyNightChoice(state, "quiet_watch", "rest"), /일치하지 않습니다/);
  assert.throws(() => applyNightChoice(state, "generator_failure", "reserve"), /자원이 부족합니다/);
});

test("양방향 관계 데이터가 불완전하면 아무 효과도 적용하지 않는다", () => {
  const state = withRelationshipPair("owen", "hayes");
  state.guests = state.guests.map((guest) => guest.id === "hayes" ? { ...guest, relationships: [] } : guest);
  const before = structuredClone(state);
  assert.throws(() => applyNightChoice(state, "owen_hayes_standoff", "separate"), /관계 변경 대상/);
  assert.deepEqual(state, before);
});

test("관계 장부에는 한계값을 반영한 실제 변화량만 기록한다", () => {
  const state = withRelationshipPair("owen", "hayes");
  state.guests = state.guests.map((guest) => ["owen", "hayes"].includes(guest.id) ? { ...guest, relationships: guest.relationships.map((relation) => ["owen", "hayes"].includes(relation.targetId) ? { ...relation, value: -95 } : relation) } : guest);
  const result = applyNightChoice(state, "owen_hayes_standoff", "arm_owen");
  assert.equal(result.state.guests.find((guest) => guest.id === "owen")?.relationships.find((relation) => relation.targetId === "hayes")?.value, -100);
  assert.deepEqual(result.entry.relationshipChanges?.map((change) => change.delta), [-5, -5]);
});
