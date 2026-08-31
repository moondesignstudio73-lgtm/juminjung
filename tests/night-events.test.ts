import test from "node:test";
import assert from "node:assert/strict";
import { resolveDay } from "../game/day-manager.ts";
import { applyNightChoice, canChooseNightChoice, selectNightEvent } from "../game/night-event-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { dismissCutscene, queueNightEventCutscene } from "../game/cutscene-manager.ts";

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

test("낮은 연료는 발전기 고장 사건을 발생시킨다", () => {
  const state = createInitialGameState();
  state.resources.fuel = 10;
  assert.equal(selectNightEvent(state).id, "generator_failure");
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

test("Save v9은 야간 선택과 진행 중인 컷신을 복원한다", () => {
  const state = createInitialGameState();
  state.selectedNightEventId = "quiet_watch";
  state.selectedNightChoiceId = "patrol";
  state.activeCutsceneId = "first_monster_sighting";
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.version, 9);
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
