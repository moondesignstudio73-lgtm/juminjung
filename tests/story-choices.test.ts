import test from "node:test";
import assert from "node:assert/strict";
import { applyStoryChoice, canChooseStoryChoice, getPendingStoryChoice } from "../game/story-choice-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { advanceHotelStories } from "../game/story-event-manager.ts";
import { evaluateEndings } from "../game/ending-manager.ts";
import { STORY_CHOICE_EVENTS } from "../game/story-choice-data.ts";
import { createGuests } from "../game/guest-data.ts";
import { dismissCutscene, queueStoryChoiceCutscene } from "../game/cutscene-manager.ts";
import { getCutscene } from "../game/cutscene-data.ts";
import { getEffectiveNightChoice, selectNightEvent } from "../game/night-event-manager.ts";
import { assignGuest } from "../game/room-manager.ts";
import { recalculateRoomEffects } from "../game/aura-effect-manager.ts";
import { getNightFoodDemand } from "../game/aura-night-manager.ts";
import { getEligibleVisitor } from "../game/visitor-manager.ts";
import { getDailyVisitorCountBreakdown, prepareDailyVisitorQueue, recordVisitorDecision } from "../game/visitor-queue-manager.ts";
import { resolveDay } from "../game/day-manager.ts";

function conflictState(guestId: string) {
  const state = createInitialGameState();
  state.day = 12;
  state.guests = state.guests.map((guest) => guest.id === guestId ? { ...guest, status: "STAYING", currentRoomNumber: 301, checkedInDay: 1, remainingNights: Math.max(1, guest.stayDuration - 1) } : guest);
  return state;
}

function resolutionState(guestId: string) {
  const state = conflictState(guestId);
  state.guests = state.guests.map((guest) => guest.id === guestId ? {
    ...guest,
    remainingNights: 1,
    eventChain: guest.eventChain.map((event) => event.stage === "CONFLICT" ? { ...event, completed: true } : event),
  } : guest);
  return state;
}

test("Eleanor의 갈등 장면은 조건이 되면 pending으로 나타난다", () => {
  assert.equal(getPendingStoryChoice(conflictState("eleanor"))?.id, "eleanor-triage");
});

test("Eleanor의 두 환자 치료 선택은 약품·Trust·평판·플래그를 변경한다", () => {
  const state = conflictState("eleanor");
  const result = applyStoryChoice(state, "eleanor-triage", "treat_all");
  const eleanor = result.state.guests.find((guest) => guest.id === "eleanor")!;
  assert.equal(result.state.resources.medicine, state.resources.medicine - 2);
  assert.equal(eleanor.trust, state.guests[0].trust + 12);
  assert.equal(eleanor.eventChain.find((event) => event.stage === "CONFLICT")?.completed, true);
  assert.equal(result.state.flags.eleanor_humanitarian_choice, true);
  assert.ok(result.state.eventHistory.at(-1)?.message.includes("두 사람 중 한 사람"));
});

test("약품이 부족하면 Eleanor의 전체 치료 선택은 비활성화된다", () => {
  const state = conflictState("eleanor");
  state.resources.medicine = 1;
  const choice = getPendingStoryChoice(state)!.choices.find((item) => item.id === "treat_all")!;
  assert.equal(canChooseStoryChoice(state, choice), false);
});

test("Walter를 추궁하면 아버지 단서와 진행도가 기록된다", () => {
  const result = applyStoryChoice(conflictState("walter"), "walter-father-lie", "confront");
  assert.equal(result.state.flags.father_clue_walter, true);
  assert.equal(result.state.fatherStoryProgress, 15);
});

test("Mia 보호 선택은 Daniel 관계와 공동체 평판을 바꾼다", () => {
  const result = applyStoryChoice(conflictState("mia"), "mia-daniel", "protect");
  const mia = result.state.guests.find((guest) => guest.id === "mia")!;
  assert.equal(mia.relationships.find((relation) => relation.targetId === "daniel")?.value, -20);
  assert.equal(result.state.flags.mia_protected, true);
  assert.deepEqual(result.entry.relationshipChanges, [{ sourceId: "mia", targetId: "daniel", delta: -20 }]);
});

test("Owen 보호 선택은 군사 저항 경로를 시작한다", () => {
  const result = applyStoryChoice(conflictState("owen"), "owen-hayes", "hide");
  assert.equal(result.state.flags.military_resistance_started, true);
  assert.equal(result.state.flags.owen_protected, true);
  assert.equal(result.state.reputations.military, 0);
});

test("Mr. White에게 문을 열면 숨겨진 특성과 괴물 단서를 발견한다", () => {
  const result = applyStoryChoice(conflictState("white"), "white-door", "open");
  const white = result.state.guests.find((guest) => guest.id === "white")!;
  assert.ok(white.discoveredTraits.includes("MonsterRelated"));
  assert.equal(result.state.flags.mr_white_door, true);
  assert.equal(result.state.flags.monster_origin_clue_2, true);
  assert.equal(result.state.flags.monster_threat, 15);
});

test("Save v15는 진행 대기 중인 NPC 스토리 장면을 복원한다", () => {
  const state = conflictState("walter");
  state.phase = "story";
  state.pendingStoryEventId = "walter-father-lie";
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.version, 15);
  assert.equal(restored.phase, "story");
  assert.equal(restored.pendingStoryEventId, "walter-father-lie");
});

test("선택형 갈등은 야간 자동 진행으로 건너뛰지 않는다", () => {
  const state = conflictState("eleanor");
  state.guests.find((guest) => guest.id === "eleanor")!.remainingNights = 1;
  const advanced = advanceHotelStories(state.guests, state.day, state.rooms);
  const eleanor = advanced.guests.find((guest) => guest.id === "eleanor")!;
  assert.equal(eleanor.eventChain.find((event) => event.stage === "CONFLICT")?.completed, false);
  assert.equal(eleanor.eventChain.find((event) => event.stage === "RESOLUTION")?.completed, false);
});

test("Eleanor의 상설 진료 선택은 약품과 전 호텔 질병 예방을 연결한다", () => {
  const state = resolutionState("eleanor");
  state.flags.eleanor_mobile_medic = true;
  const choice = STORY_CHOICE_EVENTS.find((event) => event.id === "eleanor-standard")!.choices.find((candidate) => candidate.id === "clinic")!;
  for (const term of ["의약품 3", "Trust +10", "community 평판 +8", "humanitarian 평판 +8", "떠난 뒤에도", "NORMAL_DISEASE", "누적되지 않는 -5%p", "Health +5", "refugee 평판 +5", "포기"]) assert.ok(choice.description.includes(term), term);
  const result = applyStoryChoice(state, "eleanor-standard", "clinic");
  const eleanor = result.state.guests.find((guest) => guest.id === "eleanor")!;
  assert.equal(result.state.resources.medicine, state.resources.medicine - 3);
  assert.equal(result.state.flags.eleanor_clinic_established, true);
  assert.equal(result.state.flags.medical_network_active, true);
  assert.equal(result.state.flags.eleanor_mobile_medic, false);
  assert.equal(result.state.activeCutsceneId, "eleanor_clinic_opened");
  assert.equal(getCutscene(result.state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/eleanor-hotel-clinic-v1.png");
  assert.equal(eleanor.storyFlags.choice_resolution, "clinic");
  assert.equal(eleanor.eventChain.find((event) => event.stage === "RESOLUTION")?.completed, true);
  const restored = restoreGameState(serializeGameState(result.state));
  assert.equal(restored.flags.eleanor_clinic_established, true);
  assert.equal(restored.flags.eleanor_mobile_medic, false);
  assert.equal(restored.activeCutsceneId, "eleanor_clinic_opened");
});

test("Eleanor의 순회 진료는 비축분을 보존하고 단일 부상자 회복과 전용 컷씬을 연다", () => {
  const state = resolutionState("eleanor");
  Object.assign(state.flags, { eleanor_clinic_established: true, medical_network_active: true });
  const choice = STORY_CHOICE_EVENTS.find((event) => event.id === "eleanor-standard")!.choices.find((candidate) => candidate.id === "mobile")!;
  for (const term of ["의약품 비축", "Trust +5", "refugee 평판 +5", "투숙 중", "Eleanor 자신을 제외", "Health가 가장 낮은 한 명", "+5 회복", "NORMAL_DISEASE", "-5%p", "영구적으로 포기"]) assert.ok(choice.description.includes(term), term);
  const result = applyStoryChoice(state, "eleanor-standard", "mobile");
  assert.equal(result.state.resources.medicine, state.resources.medicine);
  assert.equal(result.state.flags.eleanor_mobile_medic, true);
  assert.equal(result.state.flags.eleanor_clinic_established, false);
  assert.equal(result.state.flags.medical_network_active, false);
  assert.equal(result.state.activeCutsceneId, "eleanor_mobile_rounds");
  assert.equal(getCutscene(result.state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/eleanor-mobile-rounds-v1.png");
  const restored = restoreGameState(serializeGameState(result.state));
  assert.equal(restored.flags.eleanor_mobile_medic, true);
  assert.equal(restored.flags.eleanor_clinic_established, false);
  assert.equal(restored.activeCutsceneId, "eleanor_mobile_rounds");
});

test("Eleanor의 두 진료 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다", () => {
  for (const [choiceId, cutsceneId] of [["clinic", "eleanor_clinic_opened"], ["mobile", "eleanor_mobile_rounds"]] as const) {
    const state = resolutionState("eleanor");
    state.activeCutsceneId = "first_night";
    const resolved = applyStoryChoice(state, "eleanor-standard", choiceId).state;
    assert.equal(resolved.activeCutsceneId, "first_night");
    assert.deepEqual(resolved.queuedCutsceneIds, [cutsceneId]);
    const restored = restoreGameState(serializeGameState(resolved));
    const advanced = dismissCutscene(restored);
    assert.equal(advanced.activeCutsceneId, cutsceneId);
    assert.deepEqual(advanced.queuedCutsceneIds, []);
  }
});

test("Walter의 열쇠 사용은 아버지 비밀과 괴물 기원 단서를 연다", () => {
  const choice = STORY_CHOICE_EVENTS.find((event) => event.id === "walter-key")!.choices.find((candidate) => candidate.id === "use_key")!;
  assert.ok(choice.description.includes("Monster Threat") && choice.description.includes("Security 4") && choice.description.includes("91.3MHz"));
  const result = applyStoryChoice(resolutionState("walter"), "walter-key", "use_key");
  assert.equal(result.state.flags.father_secret_discovered, true);
  assert.equal(result.state.flags.monster_origin_clue_1, true);
  assert.equal(result.state.fatherStoryProgress, 30);
  assert.equal(result.state.flags.monster_threat, 8);
  assert.equal(result.state.flags.basement_key_used, true);
  assert.equal(result.state.flags.basement_key_hidden, false);
  assert.equal(result.state.activeCutsceneId, "walter_archive_opened");
  assert.equal(getCutscene(result.state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/walter-basement-archive-v1.png");
  assert.ok(getCutscene(result.state.activeCutsceneId)?.body.includes("기억 반응을 모사한 조직 샘플"));
  assert.ok(getCutscene(result.state.activeCutsceneId)?.body.includes("봉인을 지시한 서명"));
});

test("Walter가 열쇠를 숨기면 안전을 얻고 아버지 기록 경로를 닫는 전용 컷신을 연다", () => {
  const choice = STORY_CHOICE_EVENTS.find((event) => event.id === "walter-key")!.choices.find((candidate) => candidate.id === "hide_key")!;
  assert.ok(choice.description.includes("Security") && choice.description.includes("91.3MHz") && choice.description.includes("THE TRUTH") && choice.description.includes("포기"));
  const starting = resolutionState("walter");
  Object.assign(starting.flags, { father_secret_discovered: true, monster_origin_clue_1: true, basement_key_used: true, monster_origin_clue_2: true, vale_research_complete: true, lily_documents_decoded: true });
  const beforeSecurity = starting.hotelStats.security;
  const result = applyStoryChoice(starting, "walter-key", "hide_key");
  assert.equal(result.state.activeCutsceneId, "walter_key_hidden");
  assert.equal(getCutscene(result.state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/walter-key-hidden-v1.png");
  assert.equal(result.state.flags.father_secret_discovered, false);
  assert.equal(result.state.flags.monster_origin_clue_1, false);
  assert.equal(result.state.flags.basement_key_hidden, true);
  assert.equal(result.state.flags.basement_key_used, false);
  assert.equal(result.state.flags.monster_threat, 0);
  assert.equal(result.state.hotelStats.security, beforeSecurity + 4);
  assert.notEqual(selectNightEvent({ ...result.state, day: 20 }).id, "father_radio_signal");
  assert.ok(!evaluateEndings(result.state).available.includes("THE_TRUTH"));
  const restored = restoreGameState(serializeGameState(result.state));
  assert.equal(restored.flags.basement_key_hidden, true);
  assert.equal(restored.activeCutsceneId, "walter_key_hidden");
});

test("Walter의 기록실 개방은 DAY 20의 91.3MHz 신호로 이어지고 컷신은 반복되지 않는다", () => {
  const opened = applyStoryChoice(resolutionState("walter"), "walter-key", "use_key").state;
  assert.notEqual(selectNightEvent({ ...opened, day: 19 }).id, "father_radio_signal");
  const dismissed = dismissCutscene(opened);
  const restored = restoreGameState(serializeGameState({ ...dismissed, day: 20 }));
  assert.ok(restored.seenCutsceneIds.includes("walter_archive_opened"));
  assert.equal(restored.activeCutsceneId, null);
  assert.equal(selectNightEvent(restored).id, "father_radio_signal");
});

test("Walter의 두 열쇠 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다", () => {
  for (const [choiceId, cutsceneId] of [["use_key", "walter_archive_opened"], ["hide_key", "walter_key_hidden"]] as const) {
    const state = resolutionState("walter");
    state.activeCutsceneId = "first_night";
    const resolved = applyStoryChoice(state, "walter-key", choiceId).state;
    assert.equal(resolved.activeCutsceneId, "first_night");
    assert.deepEqual(resolved.queuedCutsceneIds, [cutsceneId]);
    const restored = restoreGameState(serializeGameState(resolved));
    const advanced = dismissCutscene(restored);
    assert.equal(advanced.activeCutsceneId, cutsceneId);
    assert.deepEqual(advanced.queuedCutsceneIds, []);
  }
});

test("Mia의 재회는 가족 경로와 Daniel 관계를 완성한다", () => {
  const result = applyStoryChoice(resolutionState("mia"), "mia-family", "reunite");
  const mia = result.state.guests.find((guest) => guest.id === "mia")!;
  assert.equal(result.state.flags.family_routes_complete, true);
  assert.equal(mia.relationships.find((relation) => relation.targetId === "daniel")?.value, 25);
  assert.equal(result.state.activeCutsceneId, "mia_daniel_reunion");
  assert.equal(getCutscene(result.state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/mia-daniel-reunion-v1.png");
});

test("미아·다니엘 재회 컷신은 본 뒤 같은 선택 결과에서 다시 예약되지 않는다", () => {
  const resolved = applyStoryChoice(resolutionState("mia"), "mia-family", "reunite").state;
  const dismissed = dismissCutscene(resolved);
  assert.equal(dismissed.activeCutsceneId, null);
  assert.ok(dismissed.seenCutsceneIds.includes("mia_daniel_reunion"));
  assert.equal(queueStoryChoiceCutscene(dismissed, "mia-family", "reunite"), dismissed);
});

test("미아·다니엘 재회 컷신의 진행 및 시청 상태는 저장 복원된다", () => {
  const active = applyStoryChoice(resolutionState("mia"), "mia-family", "reunite").state;
  assert.equal(restoreGameState(serializeGameState(active)).activeCutsceneId, "mia_daniel_reunion");
  const dismissed = dismissCutscene(active);
  const restored = restoreGameState(serializeGameState(dismissed));
  assert.equal(restored.activeCutsceneId, null);
  assert.ok(restored.seenCutsceneIds.includes("mia_daniel_reunion"));
});

test("다른 컷신이 열린 상태의 미아 재회는 대기열에 보존되어 다음 장면으로 이어진다", () => {
  const state = resolutionState("mia");
  state.activeCutsceneId = "first_night";
  const resolved = applyStoryChoice(state, "mia-family", "reunite").state;
  assert.equal(resolved.activeCutsceneId, "first_night");
  assert.deepEqual(resolved.queuedCutsceneIds, ["mia_daniel_reunion"]);
  const restored = restoreGameState(serializeGameState(resolved));
  assert.deepEqual(restored.queuedCutsceneIds, ["mia_daniel_reunion"]);
  const advanced = dismissCutscene(restored);
  assert.equal(advanced.activeCutsceneId, "mia_daniel_reunion");
  assert.deepEqual(advanced.queuedCutsceneIds, []);
  assert.ok(advanced.seenCutsceneIds.includes("first_night"));
});

test("손상된 컷신 대기열은 알 수 없는 ID·중복·이미 본 장면을 제거한다", () => {
  const state = createInitialGameState();
  state.seenCutsceneIds = ["first_night"];
  const raw = JSON.parse(serializeGameState(state));
  raw.queuedCutsceneIds = ["mia_daniel_reunion", "unknown_scene", "mia_daniel_reunion", "first_night"];
  const restored = restoreGameState(JSON.stringify(raw));
  assert.deepEqual(restored.queuedCutsceneIds, ["mia_daniel_reunion"]);
});

test("Owen의 방어대는 군사 저항 성공 조건과 전용 컷씬을 기록하고 저장한다", () => {
  const state = resolutionState("owen");
  state.flags.owen_escaped = true;
  const choice = STORY_CHOICE_EVENTS.find((event) => event.id === "owen-future")!.choices.find((candidate) => candidate.id === "resistance")!;
  for (const term of ["Trust +10", "Security +8", "DAY 25", "보안 물자 6→4", "부품 3→2", "Health -20→-10", "Aura", "근무 배치", "되돌릴 수 없", "Monster Threat -5", "포기"]) assert.ok(choice.description.includes(term), term);
  const result = applyStoryChoice(state, "owen-future", "resistance");
  assert.equal(result.state.flags.military_resistance_succeeded, true);
  assert.equal(result.state.flags.hotel_defense_force, true);
  assert.equal(result.state.flags.owen_siege_plan,true);
  assert.equal(result.state.flags.owen_escaped,false);
  assert.equal(result.state.guests.find((guest) => guest.id === "owen")?.status,"STAYING");
  assert.equal(result.state.activeCutsceneId,"owen_defense_force");
  assert.equal(getCutscene(result.state.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/owen-defense-force-v1.png");
  const restored=restoreGameState(serializeGameState(result.state));
  assert.equal(restored.flags.hotel_defense_force,true);
  assert.equal(restored.flags.owen_siege_plan,true);
  assert.equal(restored.activeCutsceneId,"owen_defense_force");
});

test("Owen의 탈출은 객실·Aura·근무·재방문을 정리하고 공성 완화를 닫는 전용 컷씬을 연다", () => {
  let state = resolutionState("owen");
  state.flags.monster_threat = 20;
  Object.assign(state.flags, { military_resistance_succeeded: true, hotel_defense_force: true, owen_siege_plan: true });
  state.rooms = recalculateRoomEffects(assignGuest(state.rooms,301,"owen"),state.guests);
  state.staffAssignments.SECURITY = "owen";
  state = recordVisitorDecision(state,"owen","ACCEPTED",301);
  assert.ok(state.rooms.some((room) => room.temporaryEffects.some((effect) => effect.sourceGuestId === "owen")));
  const choice = STORY_CHOICE_EVENTS.find((event) => event.id === "owen-future")!.choices.find((candidate) => candidate.id === "escape")!;
  for (const term of ["군 추격대", "Monster Threat -5", "humanitarian 평판 +4", "military 평판 -10 손실을 피", "영구 출발", "Aura", "근무 배치", "재방문하지 않습니다", "Trust +10", "Security +8", "refugee 평판 +8", "DAY 25", "Health -20→-10", "포기", "다른 주민이 만든 방위 효과는 유지"]) assert.ok(choice.description.includes(term), term);
  const resolved = applyStoryChoice(state,"owen-future","escape");
  const result = resolved.state;
  const owen = result.guests.find((guest) => guest.id === "owen")!;
  assert.deepEqual({ status:owen.status, room:owen.currentRoomNumber, nights:owen.remainingNights, revisit:owen.revisitPolicy, ending:owen.endingState },{ status:"CHECKED_OUT", room:null, nights:0, revisit:"NEVER", ending:"ESCAPED" });
  assert.equal(owen.storyFlags.story_departed_day,state.day);
  assert.equal(result.rooms.find((room) => room.roomNumber === 301)?.status,"EMPTY");
  assert.ok(result.rooms.every((room) => room.temporaryEffects.every((effect) => effect.sourceGuestId !== "owen")));
  assert.equal(result.staffAssignments.SECURITY,undefined);
  assert.equal(result.visitorHistory.find((entry) => entry.visitorId === "owen")?.finalState,"STORY_ESCAPED");
  assert.equal(result.flags.military_resistance_succeeded,false);
  assert.equal(result.flags.owen_siege_plan,false);
  assert.equal(result.flags.hotel_defense_force,true);
  assert.equal(result.flags.owen_escaped,true);
  assert.equal(result.flags.monster_threat,15);
  assert.equal(result.activeCutsceneId,"owen_escape_route");
  assert.equal(getCutscene(result.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/owen-escape-route-v1.png");
  assert.match(resolved.entry.message,/호텔 출발$/);
  const restored = restoreGameState(serializeGameState(result));
  assert.equal(restored.guests.find((guest) => guest.id === "owen")?.revisitPolicy,"NEVER");
  assert.equal(getEligibleVisitor(restored.guests.filter((guest) => guest.id === "owen"),100,restored.flags),null);
  assert.equal(restored.activeCutsceneId,"owen_escape_route");
  const siegeState = { ...restored, day:25, worldState:"CRITICAL" as const, hotelStats:{...restored.hotelStats,security:60}, resources:{...restored.resources,security:10,parts:10}, flags:{...restored.flags,monster_threat:50}, guests:restored.guests.map((guest) => guest.id === "walter" ? { ...guest, status:"STAYING" as const, currentRoomNumber:302 } : guest) };
  const hold = selectNightEvent(siegeState).choices.find((candidate) => candidate.id === "hold_lobby")!;
  assert.deepEqual(getEffectiveNightChoice(siegeState,hold).requiredResources,{security:6,parts:3});
  assert.equal(getEffectiveNightChoice(siegeState,hold).effect.targetGuestHealth,-20);
});

test("Owen의 두 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다", () => {
  for (const [choiceId, cutsceneId] of [["resistance", "owen_defense_force"], ["escape", "owen_escape_route"]] as const) {
    const state = resolutionState("owen");
    state.activeCutsceneId = "first_night";
    const resolved = applyStoryChoice(state,"owen-future",choiceId).state;
    assert.equal(resolved.activeCutsceneId,"first_night");
    assert.deepEqual(resolved.queuedCutsceneIds,[cutsceneId]);
    const advanced = dismissCutscene(restoreGameState(serializeGameState(resolved)));
    assert.equal(advanced.activeCutsceneId,cutsceneId);
  }
});

test("Daniel이 Mia의 선택권을 존중하면 가족 경로와 전용 컷씬이 열린다", () => {
  const result = applyStoryChoice(resolutionState("daniel"), "daniel-family", "let_choose");
  const daniel = result.state.guests.find((guest) => guest.id === "daniel")!;
  assert.equal(result.state.flags.daniel_respects_mia, true);
  assert.equal(result.state.flags.family_routes_complete, true);
  assert.equal(daniel.relationships.find((relation) => relation.targetId === "mia")?.value, 25);
  assert.equal(result.state.activeCutsceneId, "daniel_mia_choice");
  assert.equal(getCutscene(result.state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/daniel-mia-choice-v1.png");
  assert.equal(restoreGameState(serializeGameState(result.state)).activeCutsceneId, "daniel_mia_choice");
});

test("Daniel과 Mia의 안전지대 출발은 식량 비용과 전용 컷씬을 함께 기록한다", () => {
  const state = resolutionState("daniel");
  const result = applyStoryChoice(state, "daniel-family", "escort");
  assert.equal(result.state.resources.food, state.resources.food - 2);
  assert.equal(result.state.flags.carter_family_departed, true);
  assert.equal(result.state.activeCutsceneId, "carter_safe_passage");
  assert.equal(getCutscene(result.state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/carter-safe-passage-v1.png");
  assert.equal(restoreGameState(serializeGameState(result.state)).activeCutsceneId, "carter_safe_passage");
});

test("식량이 부족하면 Carter 가족 출발과 컷씬을 선택할 수 없다", () => {
  const state = resolutionState("daniel");
  state.resources.food = 1;
  const choice = getPendingStoryChoice(state)!.choices.find((item) => item.id === "escort")!;
  assert.equal(canChooseStoryChoice(state, choice), false);
  assert.throws(() => applyStoryChoice(state, "daniel-family", "escort"), /자원이 부족합니다/);
  assert.equal(state.activeCutsceneId, null);
  assert.equal(state.flags.carter_family_departed, undefined);
});

test("Daniel의 두 가족 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다", () => {
  for (const [choiceId, cutsceneId] of [["let_choose", "daniel_mia_choice"], ["escort", "carter_safe_passage"]] as const) {
    const state = resolutionState("daniel");
    state.activeCutsceneId = "first_night";
    const resolved = applyStoryChoice(state, "daniel-family", choiceId).state;
    assert.equal(resolved.activeCutsceneId, "first_night");
    assert.deepEqual(resolved.queuedCutsceneIds, [cutsceneId]);
    const restored = restoreGameState(serializeGameState(resolved));
    const advanced = dismissCutscene(restored);
    assert.equal(advanced.activeCutsceneId, cutsceneId);
    assert.deepEqual(advanced.queuedCutsceneIds, []);
  }
});

test("Mr. White를 받아들이면 THE DOOR 응답과 비인간 단서가 남는다", () => {
  const result = applyStoryChoice(resolutionState("white"), "white-answer", "yes");
  const white = result.state.guests.find((guest) => guest.id === "white")!;
  assert.equal(result.state.flags.the_door_answer_yes, true);
  assert.ok(white.discoveredTraits.includes("NonHumanPossible"));
  assert.equal(result.state.flags.monster_threat, 20);
  assert.equal(result.state.activeCutsceneId, "white_door_accepted");
  assert.equal(getCutscene(result.state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/white-door-accepted-v1.png");
  assert.equal(restoreGameState(serializeGameState(result.state)).activeCutsceneId, "white_door_accepted");
});

test("Mr. White를 추방하면 다른 전용 컷씬과 안전 우선 결과가 남는다", () => {
  const result = applyStoryChoice(resolutionState("white"), "white-answer", "no");
  assert.equal(result.state.flags.the_door_answer_no, true);
  assert.equal(result.state.flags.white_banished, true);
  assert.equal(result.state.flags.monster_threat, 0);
  assert.equal(result.state.activeCutsceneId, "white_banished");
  assert.equal(getCutscene(result.state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/white-banished-v1.png");
  assert.equal(restoreGameState(serializeGameState(result.state)).activeCutsceneId, "white_banished");
});

test("Mr. White의 두 최종 선택 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다", () => {
  for (const [choiceId, cutsceneId] of [["yes", "white_door_accepted"], ["no", "white_banished"]] as const) {
    const state = resolutionState("white");
    state.activeCutsceneId = "first_night";
    const resolved = applyStoryChoice(state, "white-answer", choiceId).state;
    assert.equal(resolved.activeCutsceneId, "first_night");
    assert.deepEqual(resolved.queuedCutsceneIds, [cutsceneId]);
    const restored = restoreGameState(serializeGameState(resolved));
    const advanced = dismissCutscene(restored);
    assert.equal(advanced.activeCutsceneId, cutsceneId);
    assert.deepEqual(advanced.queuedCutsceneIds, []);
  }
});

test("선택형 결말은 야간 자동 진행으로 건너뛰지 않는다", () => {
  const state = resolutionState("walter");
  const advanced = advanceHotelStories(state.guests, state.day, state.rooms);
  const walter = advanced.guests.find((guest) => guest.id === "walter")!;
  assert.equal(walter.eventChain.find((event) => event.stage === "RESOLUTION")?.completed, false);
  assert.equal(getPendingStoryChoice({ ...state, guests: advanced.guests })?.id, "walter-key");
});

test("마지막 밤 갈등 선택 직후 같은 NPC의 결말 선택이 이어진다", () => {
  const state = conflictState("walter");
  state.guests.find((guest) => guest.id === "walter")!.remainingNights = 1;
  const conflict = applyStoryChoice(state, "walter-father-lie", "wait").state;
  assert.equal(getPendingStoryChoice(conflict)?.id, "walter-key");
  const resolution = applyStoryChoice(conflict, "walter-key", "hide_key").state;
  assert.equal(getPendingStoryChoice(resolution), null);
});

test("오래된 사건 ID나 감당할 수 없는 선택은 조용히 대체되지 않는다", () => {
  const state = conflictState("eleanor");
  assert.throws(() => applyStoryChoice(state, "walter-father-lie", "wait"), /일치하지 않습니다/);
  state.resources.medicine = 0;
  assert.throws(() => applyStoryChoice(state, "eleanor-triage", "treat_all"), /자원이 부족합니다/);
});

test("Lily와 Dr. Vale의 조사 갈등은 자동 진행 대신 선택 장면으로 열린다", () => {
  assert.equal(getPendingStoryChoice(conflictState("lily"))?.id, "lily-redactions");
  assert.equal(getPendingStoryChoice(conflictState("vale"))?.id, "vale-sample");
});

test("Lily의 암호화 보관은 진실을 보존하고 외부 응답을 닫는 전용 컷신을 연다", () => {
  const archiveChoice = STORY_CHOICE_EVENTS.find((event) => event.id === "lily-truth")!.choices.find((choice) => choice.id === "archive")!;
  assert.ok(archiveChoice.description.includes("외부 생존자") && archiveChoice.description.includes("포기"));
  const starting = resolutionState("lily");
  starting.day = 16;
  starting.flags.lily_truth_broadcast = true;
  starting.flags.father_secret_discovered = true;
  starting.flags.monster_origin_clue_1 = true;
  starting.flags.monster_origin_clue_2 = true;
  starting.flags.vale_research_complete = true;
  const beforeSecurity = starting.hotelStats.security;
  const result = applyStoryChoice(starting, "lily-truth", "archive");
  const lily = result.state.guests.find((guest) => guest.id === "lily")!;
  assert.equal(result.state.flags.lily_documents_decoded, true);
  assert.equal(result.state.flags.lily_truth_archived, true);
  assert.equal(result.state.flags.lily_truth_broadcast, false);
  assert.equal(result.state.hotelStats.security, beforeSecurity + 4);
  assert.equal(result.state.activeCutsceneId, "lily_truth_archive");
  assert.equal(getCutscene(result.state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/lily-truth-archive-v1.png");
  assert.notEqual(selectNightEvent(result.state).id, "truth_responses");
  assert.ok(evaluateEndings(result.state).available.includes("THE_TRUTH"));
  assert.ok(lily.discoveredTraits.includes("OriginDocuments"));
  const restored = restoreGameState(serializeGameState(result.state));
  assert.equal(restored.flags.lily_truth_archived, true);
  assert.equal(restored.activeCutsceneId, "lily_truth_archive");
});

test("Lily의 공개 방송은 전용 컷신과 DAY 16 후속 주파수를 열고 저장된다", () => {
  const starting = resolutionState("lily");
  starting.flags.lily_documents_decoded = true;
  starting.flags.lily_truth_archived = true;
  const state = applyStoryChoice(starting, "lily-truth", "broadcast").state;
  assert.equal(state.flags.lily_truth_broadcast, true);
  assert.equal(state.flags.lily_truth_archived, false);
  assert.equal(state.activeCutsceneId, "lily_truth_broadcast");
  assert.equal(getCutscene(state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/lily-truth-broadcast-v1.png");
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.flags.lily_truth_broadcast, true);
  assert.equal(restored.activeCutsceneId, "lily_truth_broadcast");
});

test("Lily의 두 진실 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다", () => {
  for (const [choiceId, cutsceneId] of [["broadcast", "lily_truth_broadcast"], ["archive", "lily_truth_archive"]] as const) {
    const state = resolutionState("lily");
    state.flags.lily_documents_decoded = true;
    state.activeCutsceneId = "first_night";
    const resolved = applyStoryChoice(state, "lily-truth", choiceId).state;
    assert.equal(resolved.activeCutsceneId, "first_night");
    assert.deepEqual(resolved.queuedCutsceneIds, [cutsceneId]);
    const restored = restoreGameState(serializeGameState(resolved));
    const advanced = dismissCutscene(restored);
    assert.equal(advanced.activeCutsceneId, cutsceneId);
    assert.deepEqual(advanced.queuedCutsceneIds, []);
  }
});

test("Vale의 연구 완성은 Lily 관계와 THE TRUTH 핵심 플래그를 기록한다", () => {
  const state = resolutionState("vale");
  state.flags.vale_sample_stabilized = true;
  state.flags.vale_research_destroyed = true;
  const choice = STORY_CHOICE_EVENTS.find((event) => event.id === "vale-research")!.choices.find((entry) => entry.id === "complete")!;
  assert.match(choice.description, /THE TRUTH/);
  assert.match(choice.description, /Monster Threat/);
  assert.match(choice.description, /12/);
  assert.match(choice.description, /humanitarian/);
  const result = applyStoryChoice(state, "vale-research", "complete");
  const vale = result.state.guests.find((guest) => guest.id === "vale")!;
  assert.equal(result.state.flags.vale_research_complete, true);
  assert.equal(result.state.flags.lily_vale_research_shared, true);
  assert.equal(result.state.flags.vale_research_destroyed, false);
  assert.equal(vale.relationships.find((relation) => relation.targetId === "lily")?.value, 45);
  assert.ok(vale.discoveredTraits.includes("PreOutbreakResearch"));
  assert.equal(result.state.activeCutsceneId, "vale_behavior_map");
  assert.equal(getCutscene(result.state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/vale-lily-research-v1.png");
  const restored = restoreGameState(serializeGameState(result.state));
  assert.equal(restored.flags.lily_vale_research_shared, true);
  assert.equal(restored.flags.vale_research_destroyed, false);
  assert.equal(restored.activeCutsceneId, "vale_behavior_map");
});

test("Vale가 연구를 소각하면 즉시 안전을 얻고 THE TRUTH와 행동 예측을 닫는 전용 컷씬을 연다", () => {
  const state = resolutionState("vale");
  state.flags.vale_sample_stabilized = true;
  Object.assign(state.flags, { vale_research_complete: true, lily_vale_research_shared: true, father_secret_discovered: true, monster_origin_clue_1: true, monster_origin_clue_2: true, lily_documents_decoded: true, monster_threat: 20 });
  const choice = STORY_CHOICE_EVENTS.find((event) => event.id === "vale-research")!.choices.find((entry) => entry.id === "destroy")!;
  for (const term of ["Monster Threat", "humanitarian", "에이드리언 베일 박사의 Trust 10", "THE TRUTH", "매일 Monster Threat 2", "영구히"]) assert.ok(choice.description.includes(term), term);
  const beforeVale = state.guests.find((guest) => guest.id === "vale")!;
  const beforeThreat = Number(state.flags.monster_threat);
  const beforeHumanitarian = state.reputations.humanitarian;
  const result = applyStoryChoice(state, "vale-research", "destroy").state;
  const vale = result.guests.find((guest) => guest.id === "vale")!;
  assert.equal(result.flags.vale_research_destroyed, true);
  assert.equal(result.flags.vale_research_complete, false);
  assert.equal(result.flags.lily_vale_research_shared, false);
  assert.equal(Number(result.flags.monster_threat), Math.max(0, beforeThreat - 12));
  assert.equal(vale.trust, beforeVale.trust - 10);
  assert.equal(result.reputations.humanitarian, beforeHumanitarian + 4);
  assert.equal(result.activeCutsceneId, "vale_research_destroyed");
  assert.equal(getCutscene(result.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/vale-research-destroyed-v1.png");
  assert.ok(!evaluateEndings(result).available.includes("THE_TRUTH"));
  const restored = restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.vale_research_destroyed, true);
  assert.equal(restored.flags.vale_research_complete, false);
  assert.equal(restored.flags.lily_vale_research_shared, false);
  assert.equal(restored.activeCutsceneId, "vale_research_destroyed");
});

test("Vale의 두 연구 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다", () => {
  for (const [choiceId, cutsceneId] of [["complete", "vale_behavior_map"], ["destroy", "vale_research_destroyed"]] as const) {
    const state = resolutionState("vale");
    state.flags.vale_sample_stabilized = true;
    state.activeCutsceneId = "first_night";
    const resolved = applyStoryChoice(state, "vale-research", choiceId).state;
    assert.equal(resolved.activeCutsceneId, "first_night");
    assert.deepEqual(resolved.queuedCutsceneIds, [cutsceneId]);
    const restored = restoreGameState(serializeGameState(resolved));
    const advanced = dismissCutscene(restored);
    assert.equal(advanced.activeCutsceneId, cutsceneId);
    assert.deepEqual(advanced.queuedCutsceneIds, []);
  }
});

test("Lily와 Vale의 실제 선택 결과가 THE TRUTH를 해금한다", () => {
  const lilyState = resolutionState("lily");
  lilyState.flags.lily_documents_decoded = true;
  let state = applyStoryChoice(lilyState, "lily-truth", "broadcast").state;
  state.guests = state.guests.map((guest) => guest.id === "vale" ? {
    ...guest,
    status: "STAYING",
    currentRoomNumber: 302,
    checkedInDay: 1,
    remainingNights: 1,
    eventChain: guest.eventChain.map((event) => event.stage === "CONFLICT" ? { ...event, completed: true } : event),
  } : guest);
  state.flags.vale_sample_stabilized = true;
  state = applyStoryChoice(state, "vale-research", "complete").state;
  Object.assign(state.flags, { monster_origin_clue_1: true, monster_origin_clue_2: true, father_secret_discovered: true });
  assert.ok(evaluateEndings(state).available.includes("THE_TRUTH"));
});

test("Lily의 갈등 선택이 방송 가능 여부를 결정한다", () => {
  const state = conflictState("lily");
  state.guests.find((guest) => guest.id === "lily")!.remainingNights = 1;
  const secured = applyStoryChoice(state, "lily-redactions", "copy").state;
  const event = getPendingStoryChoice(secured)!;
  assert.equal(event.id, "lily-truth");
  assert.equal(canChooseStoryChoice(secured, event.choices.find((choice) => choice.id === "broadcast")!), false);
  assert.equal(canChooseStoryChoice(secured, event.choices.find((choice) => choice.id === "archive")!), true);
});

test("Vale의 샘플 안정화 여부가 연구 완성 가능 여부를 결정한다", () => {
  const state = conflictState("vale");
  state.guests.find((guest) => guest.id === "vale")!.remainingNights = 1;
  const quarantined = applyStoryChoice(state, "vale-sample", "quarantine").state;
  const event = getPendingStoryChoice(quarantined)!;
  const complete = event.choices.find((choice) => choice.id === "complete")!;
  assert.equal(canChooseStoryChoice(quarantined, complete), false);
  assert.throws(() => applyStoryChoice(quarantined, "vale-research", "complete"), /선행 사건/);
});

test("20명 모든 NPC에게 갈등과 결말 선택이 정확히 하나씩 존재한다", () => {
  const guests = createGuests();
  assert.equal(guests.length, 20);
  assert.equal(STORY_CHOICE_EVENTS.length, 40);
  assert.equal(new Set(STORY_CHOICE_EVENTS.map((event) => event.id)).size, 40);

  for (const guest of guests) {
    const authored = STORY_CHOICE_EVENTS.filter((event) => event.guestId === guest.id);
    assert.deepEqual(authored.map((event) => event.stage).sort(), ["CONFLICT", "RESOLUTION"]);
    for (const event of authored) {
      assert.equal(event.choices.length, 2);
      assert.equal(new Set(event.choices.map((choice) => choice.id)).size, 2);
      assert.ok(guest.eventChain.some((chainEvent) => chainEvent.stage === event.stage));
    }
  }
});

test("새로 집필한 13명 NPC의 갈등과 결말은 실제 진행에서 모두 도달 가능하다", () => {
  const expandedGuestIds = ["daniel", "samuel", "ruth", "jack", "grace", "hayes", "noah", "victor", "rosa", "eli", "hazel", "thomas", "claire"];
  for (const guestId of expandedGuestIds) {
    const conflict = getPendingStoryChoice(conflictState(guestId));
    const resolution = getPendingStoryChoice(resolutionState(guestId));
    assert.equal(conflict?.guestId, guestId);
    assert.equal(conflict?.stage, "CONFLICT");
    assert.equal(resolution?.guestId, guestId);
    assert.equal(resolution?.stage, "RESOLUTION");
  }
});

test("Ruth와 Rosa의 선택 결과가 HOME 엔딩의 전체 스토리 조건을 완성한다", () => {
  let state = applyStoryChoice(resolutionState("ruth"), "ruth-home", "care_team").state;
  state.guests = state.guests.map((guest) => guest.id === "rosa" ? {
    ...guest,
    status: "STAYING",
    currentRoomNumber: 302,
    remainingNights: 1,
    eventChain: guest.eventChain.map((event) => event.stage === "CONFLICT" ? { ...event, completed: true } : event),
  } : guest);
  state = applyStoryChoice(state, "rosa-family", "household").state;
  state.guests = state.guests.map((guest) => ["ruth", "rosa", "mia"].includes(guest.id) ? {
    ...guest,
    eventChain: guest.eventChain.map((event) => ({ ...event, completed: true })),
  } : guest);
  state.reputations.community = 70;
  assert.equal(state.flags.ruth_care_team, true);
  assert.equal(state.flags.rosa_household_network, true);
  assert.ok(evaluateEndings(state).available.includes("HOME"));
});

test("Jack과 Victor의 독점 선택 결과가 폐허의 왕 엔딩 조건을 완성한다", () => {
  let state = applyStoryChoice(resolutionState("jack"), "jack-market", "monopoly").state;
  state.guests = state.guests.map((guest) => guest.id === "victor" ? {
    ...guest,
    status: "STAYING",
    currentRoomNumber: 302,
    remainingNights: 1,
    eventChain: guest.eventChain.map((event) => event.stage === "CONFLICT" ? { ...event, completed: true } : event),
  } : guest);
  state = applyStoryChoice(state, "victor-crown", "rule_market").state;
  state.reputations.merchant = 80;
  state.hotelStats.resources = 85;
  state.facilities.trade_network = 1;
  assert.equal(state.flags.ruin_market_controlled, true);
  assert.ok(evaluateEndings(state).available.includes("KING_OF_THE_RUINS"));
});

test("공정 거래 경로만으로는 폐허의 왕 엔딩이 열리지 않는다", () => {
  const starting = resolutionState("jack");
  starting.flags.jack_monopoly = true;
  starting.flags.ruin_market_controlled = true;
  let state = applyStoryChoice(starting, "jack-market", "fair_market").state;
  assert.equal(state.flags.jack_monopoly, false);
  assert.equal(state.flags.ruin_market_controlled, false);
  assert.equal(state.activeCutsceneId, "jack_fair_exchange");
  assert.equal(getCutscene(state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/jack-fair-exchange-v1.png");
  assert.equal(restoreGameState(serializeGameState(state)).activeCutsceneId, "jack_fair_exchange");
  state = dismissCutscene(state);
  state.guests = state.guests.map((guest) => guest.id === "victor" ? {
    ...guest,
    status: "STAYING",
    currentRoomNumber: 302,
    remainingNights: 1,
    eventChain: guest.eventChain.map((event) => event.stage === "CONFLICT" ? { ...event, completed: true } : event),
  } : guest);
  state = applyStoryChoice(state, "victor-crown", "public_trust").state;
  state.reputations.merchant = 80;
  state.hotelStats.resources = 85;
  state.facilities.trade_network = 1;
  assert.equal(state.flags.ruin_market_controlled, false);
  assert.equal(state.flags.victor_monopoly_alliance, false);
  assert.equal(state.flags.bunker_network_open, true);
  assert.equal(state.activeCutsceneId, "victor_public_trust");
  assert.equal(getCutscene(state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/victor-public-trust-v1.png");
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.flags.bunker_network_open, true);
  assert.equal(restored.activeCutsceneId, "victor_public_trust");
  assert.equal(evaluateEndings(state).available.includes("KING_OF_THE_RUINS"), false);
});

test("Victor의 시장 독점 경로는 공개 벙커망을 닫고 전용 독점 연합 컷신을 연다", () => {
  const starting = resolutionState("victor");
  starting.flags.victor_public_trust = true;
  starting.flags.bunker_network_open = true;
  const beforeResources = { ...starting.resources };
  const state = applyStoryChoice(starting, "victor-crown", "rule_market").state;
  assert.equal(state.flags.victor_monopoly_alliance, true);
  assert.equal(state.flags.ruin_market_controlled, true);
  assert.equal(state.flags.victor_public_trust, false);
  assert.equal(state.flags.bunker_network_open, false);
  assert.equal(state.resources.food, beforeResources.food + 3);
  assert.equal(state.resources.medicine, beforeResources.medicine + 2);
  assert.equal(state.resources.fuel, beforeResources.fuel + 2);
  assert.equal(state.activeCutsceneId, "victor_monopoly_alliance");
  assert.equal(getCutscene(state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/victor-monopoly-alliance-v1.png");
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.flags.victor_monopoly_alliance, true);
  assert.equal(restored.activeCutsceneId, "victor_monopoly_alliance");
});

test("Victor의 두 시장 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다", () => {
  for (const [choiceId, cutsceneId] of [["public_trust", "victor_public_trust"], ["rule_market", "victor_monopoly_alliance"]] as const) {
    const state = resolutionState("victor");
    state.activeCutsceneId = "first_night";
    const resolved = applyStoryChoice(state, "victor-crown", choiceId).state;
    assert.equal(resolved.activeCutsceneId, "first_night");
    assert.deepEqual(resolved.queuedCutsceneIds, [cutsceneId]);
    const restored = restoreGameState(serializeGameState(resolved));
    const advanced = dismissCutscene(restored);
    assert.equal(advanced.activeCutsceneId, cutsceneId);
    assert.deepEqual(advanced.queuedCutsceneIds, []);
  }
});

test("Jack의 독점 거래는 공정 계약을 닫고 전용 독점 시장 컷신을 연다", () => {
  const starting = resolutionState("jack");
  starting.flags.jack_fair_market = true;
  starting.flags.trade_network_active = true;
  const beforeResources = { ...starting.resources };
  const beforeVictorRelationship = starting.guests.find((guest) => guest.id === "jack")!.relationships.find((relation) => relation.targetId === "victor")!.value;
  const state = applyStoryChoice(starting, "jack-market", "monopoly").state;
  assert.equal(state.flags.jack_monopoly, true);
  assert.equal(state.flags.ruin_market_controlled, true);
  assert.equal(state.flags.jack_fair_market, false);
  assert.equal(state.flags.trade_network_active, false);
  assert.equal(state.resources.food, beforeResources.food + 4);
  assert.equal(state.resources.fuel, beforeResources.fuel + 2);
  assert.equal(state.guests.find((guest) => guest.id === "jack")!.relationships.find((relation) => relation.targetId === "victor")!.value, beforeVictorRelationship + 25);
  assert.equal(state.activeCutsceneId, "jack_monopoly_market");
  assert.equal(getCutscene(state.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/jack-monopoly-market-v1.png");
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.flags.jack_monopoly, true);
  assert.equal(restored.activeCutsceneId, "jack_monopoly_market");
});

test("Jack의 두 시장 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다", () => {
  for (const [choiceId, cutsceneId] of [["fair_market", "jack_fair_exchange"], ["monopoly", "jack_monopoly_market"]] as const) {
    const state = resolutionState("jack");
    state.activeCutsceneId = "first_night";
    const resolved = applyStoryChoice(state, "jack-market", choiceId).state;
    assert.equal(resolved.activeCutsceneId, "first_night");
    assert.deepEqual(resolved.queuedCutsceneIds, [cutsceneId]);
    const restored = restoreGameState(serializeGameState(resolved));
    const advanced = dismissCutscene(restored);
    assert.equal(advanced.activeCutsceneId, cutsceneId);
    assert.deepEqual(advanced.queuedCutsceneIds, []);
  }
});

test("남은 NPC 선택도 관계·위협·시설·후속 플래그에 연결된다", () => {
  const samuel = applyStoryChoice(resolutionState("samuel"), "samuel-duty", "watch").state;
  assert.equal(samuel.flags.hotel_defense_force, true);
  assert.equal(samuel.guests.find((guest) => guest.id === "samuel")!.relationships[0].value, -10);

  const hazel = applyStoryChoice(conflictState("hazel"), "hazel-hunt", "track").state;
  assert.equal(hazel.flags.monster_routes_mapped, true);
  assert.equal(hazel.flags.monster_threat, 0);

  const thomas = applyStoryChoice(resolutionState("thomas"), "thomas-grid", "signal").state;
  assert.equal(thomas.flags.safe_routes_mapped, true);
  assert.equal(thomas.reputations.community, 7);
});

test("Samuel의 민간 경비대는 지속 순찰과 전용 컷신을 열고 저장된다", () => {
  const result=applyStoryChoice(resolutionState("samuel"),"samuel-duty","watch").state;
  assert.equal(result.flags.samuel_civil_guard,true);
  assert.equal(result.activeCutsceneId,"samuel_civil_guard");
  assert.equal(getCutscene(result.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/samuel-civil-guard-v1.png");
  const restored=restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.samuel_civil_guard,true);
  assert.equal(restored.activeCutsceneId,"samuel_civil_guard");
});

test("Samuel의 구조대 경로는 다음 DAY 구조 방문과 전용 컷신을 예약한다", () => {
  const state=resolutionState("samuel");
  state.flags.samuel_civil_guard=true;
  const result=applyStoryChoice(state,"samuel-duty","search").state;
  assert.equal(result.flags.samuel_rescue_patrol,true);
  assert.equal(result.flags.samuel_civil_guard,false);
  assert.equal(result.flags.samuel_rescue_survivor_due_day,state.day+1);
  assert.equal(result.flags.samuel_rescue_survivor_arrived,false);
  assert.equal(result.activeCutsceneId,"samuel_rescue_patrol");
  assert.equal(getCutscene(result.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/samuel-rescue-patrol-v1.png");
  const restored=restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.samuel_rescue_survivor_due_day,state.day+1);
  assert.equal(restored.activeCutsceneId,"samuel_rescue_patrol");
});

test("Samuel의 두 임무 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다",()=>{
  for(const [choiceId,cutsceneId] of [["watch","samuel_civil_guard"],["search","samuel_rescue_patrol"]] as const){
    const state=resolutionState("samuel");
    state.activeCutsceneId="first_night";
    const resolved=applyStoryChoice(state,"samuel-duty",choiceId).state;
    assert.deepEqual(resolved.queuedCutsceneIds,[cutsceneId]);
    assert.equal(dismissCutscene(restoreGameState(serializeGameState(resolved))).activeCutsceneId,cutsceneId);
  }
});

test("Ruth의 공동 돌봄팀은 지속 돌봄과 전용 컷신을 열고 저장된다", () => {
  const state=resolutionState("ruth");
  state.flags.ruth_field_nurse=true;
  const result=applyStoryChoice(state,"ruth-home","care_team").state;
  assert.equal(result.flags.ruth_care_team,true);
  assert.equal(result.flags.ruth_field_nurse,false);
  assert.equal(result.activeCutsceneId,"ruth_care_team");
  assert.equal(getCutscene(result.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/ruth-community-care-v1.png");
  const restored=restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.ruth_care_team,true);
  assert.equal(restored.flags.ruth_field_nurse,false);
  assert.equal(restored.activeCutsceneId,"ruth_care_team");
});

test("Ruth의 순회 간호대는 신규 방문자 사전 처치와 전용 컷씬을 열고 저장된다", () => {
  const state=resolutionState("ruth");
  state.flags.ruth_care_team=true;
  const result=applyStoryChoice(state,"ruth-home","field_nurse").state;
  assert.equal(result.flags.ruth_field_nurse,true);
  assert.equal(result.flags.ruth_care_team,false);
  assert.equal(result.activeCutsceneId,"ruth_field_nurse");
  assert.equal(getCutscene(result.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/ruth-field-nurse-v1.png");
  const restored=restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.ruth_field_nurse,true);
  assert.equal(restored.flags.ruth_care_team,false);
  assert.equal(restored.activeCutsceneId,"ruth_field_nurse");
});

test("Ruth의 두 돌봄 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다",()=>{
  for(const [choiceId,cutsceneId] of [["care_team","ruth_care_team"],["field_nurse","ruth_field_nurse"]] as const){
    const state=resolutionState("ruth");
    state.activeCutsceneId="first_night";
    const resolved=applyStoryChoice(state,"ruth-home",choiceId).state;
    assert.deepEqual(resolved.queuedCutsceneIds,[cutsceneId]);
    assert.equal(dismissCutscene(restoreGameState(serializeGameState(resolved))).activeCutsceneId,cutsceneId);
  }
});

test("Rosa의 공동 생활조는 지속 배급과 전용 컷신을 열고 저장된다", () => {
  const result=applyStoryChoice(resolutionState("rosa"),"rosa-family","household").state;
  assert.equal(result.flags.rosa_household_network,true);
  assert.equal(result.activeCutsceneId,"rosa_household_network");
  assert.equal(getCutscene(result.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/rosa-household-network-v1.png");
  const restored=restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.rosa_household_network,true);
  assert.equal(restored.activeCutsceneId,"rosa_household_network");
});

test("Rosa의 가족 안전 구역은 공동 생활조 물 절감과 전용 컷신을 열지 않는다", () => {
  const result=applyStoryChoice(resolutionState("rosa"),"rosa-family","family_room").state;
  assert.equal(result.flags.rosa_family_zone,true);
  assert.equal(result.flags.rosa_household_network,undefined);
  assert.equal(result.activeCutsceneId,null);
});

test("Eli의 길잡이 경로는 안전 통로와 지속 정찰·전용 컷신을 열고 저장된다", () => {
  const state=resolutionState("eli");
  state.flags.eli_quartermaster=true;
  const choice=STORY_CHOICE_EVENTS.find((event)=>event.id==="eli-keyring")!.choices.find((candidate)=>candidate.id==="pathfinder")!;
  for(const term of ["Trust +10","Monster Threat -5","refugee 평판 +7","안전 통로","매일 실제 Monster Threat를 최대 1","추가 Trust +5","식량 +2","Security +3","community 평판 +5","시설 유지비 최대 1","영구히 포기","다른 주민이 만든 안전 통로는 유지"]) assert.ok(choice.description.includes(term),term);
  const result=applyStoryChoice(state,"eli-keyring","pathfinder").state;
  assert.equal(result.flags.eli_pathfinder,true);
  assert.equal(result.flags.eli_quartermaster,false);
  assert.equal(result.flags.safe_routes_mapped,true);
  assert.equal(result.activeCutsceneId,"eli_safe_passage");
  assert.equal(getCutscene(result.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/eli-safe-passage-v1.png");
  const restored=restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.eli_pathfinder,true);
  assert.equal(restored.activeCutsceneId,"eli_safe_passage");
});

test("Eli의 창고 책임 경로는 시설 유지비를 실제 절감하고 전용 컷신·저장에 연결된다", () => {
  const state=resolutionState("eli");
  Object.assign(state.flags,{eli_pathfinder:true,safe_routes_mapped:true,generator_network_stable:true});
  state.facilities.water_purifier=2;
  state.resources.fuel=0;
  const choice=STORY_CHOICE_EVENTS.find((event)=>event.id==="eli-keyring")!.choices.find((candidate)=>candidate.id==="quartermaster")!;
  for(const term of ["Trust +15","식량 +2","Security +3","community 평판 +5","매일 가동 시설","유지비를 최대 1","연료, 물, 식량 순","정확히 1 부족","Monster Threat -5","refugee 평판 +7","안전 통로","매일 Monster Threat -1","영구히 포기","다른 주민이 이미 만든 안전 통로는 유지"]) assert.ok(choice.description.includes(term),term);
  const result=applyStoryChoice(state,"eli-keyring","quartermaster").state;
  assert.equal(result.flags.eli_quartermaster,true);
  assert.equal(result.flags.eli_pathfinder,false);
  assert.equal(result.flags.safe_routes_mapped,true);
  assert.equal(result.activeCutsceneId,"eli_quartermaster");
  assert.equal(getCutscene(result.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/eli-quartermaster-v1.png");
  const restored=restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.eli_quartermaster,true);
  assert.equal(restored.activeCutsceneId,"eli_quartermaster");
  const waterBefore=restored.resources.water;
  restored.phase="night";
  const settled=resolveDay(restored);
  assert.deepEqual(settled.lastDaySummary?.facilityUpkeep,{});
  assert.deepEqual(settled.lastDaySummary?.facilityUpkeepSaving,{fuel:1});
  assert.deepEqual(settled.lastDaySummary?.inactiveFacilities,[]);
  assert.equal(settled.resources.water,waterBefore-1+4);
  assert.ok(settled.eventHistory.some((entry)=>entry.message==="엘리 창고 검수 · 시설 유지비 fuel 1 절감"));
});

test("Eli의 두 열쇠고리 결말 컷신은 다른 장면 뒤에도 큐로 저장되어 유실되지 않는다", () => {
  for(const [choiceId,cutsceneId] of [["quartermaster","eli_quartermaster"],["pathfinder","eli_safe_passage"]] as const){
    const state=resolutionState("eli");
    state.activeCutsceneId="first_night";
    const resolved=applyStoryChoice(state,"eli-keyring",choiceId).state;
    assert.deepEqual(resolved.queuedCutsceneIds,[cutsceneId]);
    assert.equal(dismissCutscene(restoreGameState(serializeGameState(resolved))).activeCutsceneId,cutsceneId);
  }
});

test("Claire의 안전 육아실은 지속 안정·객실 Aura·근무와 전용 컷씬을 유지한다", () => {
  const state=resolutionState("claire");
  state.flags.claire_safe_passage=true;
  state.rooms=recalculateRoomEffects(assignGuest(state.rooms,301,"claire"),state.guests);
  state.staffAssignments.MEDICAL="claire";
  const choice=STORY_CHOICE_EVENTS.find((event)=>event.id==="claire-future")!.choices.find((candidate)=>candidate.id==="nursery")!;
  for(const term of ["Trust +15","Hotel Condition +10","community 평판 +9","humanitarian 평판 +7","객실 Aura","근무 배치","객실이 배정된","Stress를 매일 3","의약품 2","영구 이동","그 선택의 refugee 평판 +7","다른 주민이 만든 안전 통로는 유지","포기"]) assert.ok(choice.description.includes(term),term);
  const result=applyStoryChoice(state,"claire-future","nursery").state;
  const claire=result.guests.find((guest)=>guest.id==="claire")!;
  assert.equal(result.flags.claire_nursery,true);
  assert.equal(result.flags.claire_safe_passage,false);
  assert.equal(claire.status,"STAYING");
  assert.equal(claire.currentRoomNumber,301);
  assert.equal(result.staffAssignments.MEDICAL,"claire");
  assert.ok(result.rooms.some((room)=>room.temporaryEffects.some((effect)=>effect.sourceGuestId==="claire")));
  assert.equal(result.activeCutsceneId,"claire_nursery");
  assert.equal(getCutscene(result.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/claire-safe-nursery-v1.png");
  const restored=restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.claire_nursery,true);
  assert.equal(restored.flags.claire_safe_passage,false);
  assert.equal(restored.activeCutsceneId,"claire_nursery");
});

test("Claire의 의료 거점 이동은 의약품을 쓰고 객실·Aura·근무·재방문을 정리하는 영구 출발이다", () => {
  let state=resolutionState("claire");
  state.resources.medicine=2;
  Object.assign(state.flags,{claire_nursery:true,vulnerable_survivors_protected:true});
  state.rooms=recalculateRoomEffects(assignGuest(state.rooms,301,"claire"),state.guests);
  state.staffAssignments.MEDICAL="claire";
  state=recordVisitorDecision(state,"claire","ACCEPTED",301);
  assert.ok(state.rooms.some((room)=>room.temporaryEffects.some((effect)=>effect.sourceGuestId==="claire")));
  const choice=STORY_CHOICE_EVENTS.find((event)=>event.id==="claire-future")!.choices.find((candidate)=>candidate.id==="safe_passage")!;
  for(const term of ["의약품 2","Trust +10","refugee 평판 +7","humanitarian 평판 +5","안전 통로","영구 출발","객실 Aura","근무 배치","재방문하지 않습니다","Hotel Condition +10","community 평판 +9","humanitarian 평판 추가 2","객실이 배정된","Stress를 매일 3 낮추는 효과","포기","다른 주민이 만든 취약 생존자 보호는 유지"]) assert.ok(choice.description.includes(term),term);
  const resolved=applyStoryChoice(state,"claire-future","safe_passage");
  const result=resolved.state;
  const claire=result.guests.find((guest)=>guest.id==="claire")!;
  assert.equal(result.resources.medicine,0);
  assert.deepEqual({status:claire.status,room:claire.currentRoomNumber,nights:claire.remainingNights,revisit:claire.revisitPolicy,ending:claire.endingState},{status:"CHECKED_OUT",room:null,nights:0,revisit:"NEVER",ending:"SAFE_PASSAGE"});
  assert.equal(claire.storyFlags.story_departed_day,state.day);
  assert.equal(result.rooms.find((room)=>room.roomNumber===301)?.status,"EMPTY");
  assert.ok(result.rooms.every((room)=>room.temporaryEffects.every((effect)=>effect.sourceGuestId!=="claire")));
  assert.equal(result.staffAssignments.MEDICAL,undefined);
  assert.equal(result.visitorHistory.find((entry)=>entry.visitorId==="claire")?.finalState,"STORY_MEDICAL_TRANSFER");
  assert.equal(result.flags.claire_safe_passage,true);
  assert.equal(result.flags.claire_nursery,false);
  assert.equal(result.flags.safe_routes_mapped,true);
  assert.equal(result.flags.vulnerable_survivors_protected,true);
  assert.equal(result.activeCutsceneId,"claire_medical_passage");
  assert.equal(getCutscene(result.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/claire-medical-passage-v1.png");
  assert.match(resolved.entry.message,/호텔 출발$/);
  const restored=restoreGameState(serializeGameState(result));
  assert.equal(restored.guests.find((guest)=>guest.id==="claire")?.revisitPolicy,"NEVER");
  assert.equal(getEligibleVisitor(restored.guests.filter((guest)=>guest.id==="claire"),100,restored.flags),null);
  assert.equal(restored.activeCutsceneId,"claire_medical_passage");
});

test("Claire의 의료 거점 이동은 의약품이 2 미만이면 상태를 바꾸지 않는다", () => {
  const state=resolutionState("claire");
  state.resources.medicine=1;
  const choice=STORY_CHOICE_EVENTS.find((event)=>event.id==="claire-future")!.choices.find((candidate)=>candidate.id==="safe_passage")!;
  const before=serializeGameState(state);
  assert.equal(canChooseStoryChoice(state,choice),false);
  assert.throws(()=>applyStoryChoice(state,"claire-future","safe_passage"),/자원이 부족합니다/);
  assert.equal(serializeGameState(state),before);
});

test("Claire의 두 미래 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다", () => {
  for(const [choiceId,cutsceneId] of [["nursery","claire_nursery"],["safe_passage","claire_medical_passage"]] as const){
    const state=resolutionState("claire");
    state.activeCutsceneId="first_night";
    const resolved=applyStoryChoice(state,"claire-future",choiceId).state;
    assert.deepEqual(resolved.queuedCutsceneIds,[cutsceneId]);
    assert.equal(dismissCutscene(restoreGameState(serializeGameState(resolved))).activeCutsceneId,cutsceneId);
  }
});

test("Grace의 공동 구호조는 지속 보수·객실 Aura·근무와 전용 컷씬을 유지한다", () => {
  const state=resolutionState("grace");
  Object.assign(state.flags,{grace_pilgrimage:true,safe_routes_mapped:true});
  state.rooms=recalculateRoomEffects(assignGuest(state.rooms,301,"grace"),state.guests);
  state.staffAssignments.MAINTENANCE="grace";
  const choice=STORY_CHOICE_EVENTS.find((event)=>event.id==="grace-faith")!.choices.find((candidate)=>candidate.id==="mutual_aid")!;
  for(const term of ["Trust +10","Hotel Condition +8","community 평판 +8","humanitarian 평판 +4","객실 Faith Aura","배정된 근무가 있다면 그대로","매일 Hotel Condition을 1 회복","식량 2는 보존","Monster Threat -3","refugee 평판 +5","순례로 떠나지 않습니다","다른 주민이 만든 안전 통로는 유지","되돌릴 수 없습니다","포기"]) assert.ok(choice.description.includes(term),term);
  const result=applyStoryChoice(state,"grace-faith","mutual_aid").state;
  const grace=result.guests.find((guest)=>guest.id==="grace")!;
  assert.equal(result.flags.grace_mutual_aid,true);
  assert.equal(result.flags.grace_pilgrimage,false);
  assert.equal(result.flags.safe_routes_mapped,true);
  assert.equal(grace.status,"STAYING");
  assert.equal(grace.currentRoomNumber,301);
  assert.equal(result.staffAssignments.MAINTENANCE,"grace");
  assert.ok(result.rooms.some((room)=>room.temporaryEffects.some((effect)=>effect.sourceGuestId==="grace")));
  assert.equal(result.activeCutsceneId,"grace_mutual_aid");
  assert.equal(getCutscene(result.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/grace-mutual-aid-v1.png");
  const restored=restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.grace_mutual_aid,true);
  assert.equal(restored.flags.grace_pilgrimage,false);
  assert.equal(restored.activeCutsceneId,"grace_mutual_aid");
});

test("Grace의 순례는 식량을 쓰고 객실·Aura·근무·재방문을 정리하는 영구 출발이다", () => {
  let state=resolutionState("grace");
  state.resources.food=2;
  Object.assign(state.flags,{grace_mutual_aid:true,monster_threat:10});
  state.rooms=recalculateRoomEffects(assignGuest(state.rooms,301,"grace"),state.guests);
  state.staffAssignments.MAINTENANCE="grace";
  state=recordVisitorDecision(state,"grace","ACCEPTED",301);
  assert.ok(state.rooms.some((room)=>room.temporaryEffects.some((effect)=>effect.sourceGuestId==="grace")));
  const choice=STORY_CHOICE_EVENTS.find((event)=>event.id==="grace-faith")!.choices.find((candidate)=>candidate.id==="pilgrimage")!;
  for(const term of ["식량 2","Trust +6","Monster Threat -3","refugee 평판 +5","안전 통로를 확보","이미 안전 통로가 있다면 그대로 유지","자발적으로 합류한","영구 출발","객실 Faith Aura","배정된 근무","재방문하지 않습니다","Hotel Condition +8","community 평판 +8","humanitarian 평판 +4","매일 Hotel Condition 1 회복","되돌릴 수 없습니다","포기"]) assert.ok(choice.description.includes(term),term);
  const resolved=applyStoryChoice(state,"grace-faith","pilgrimage");
  const result=resolved.state;
  const grace=result.guests.find((guest)=>guest.id==="grace")!;
  assert.equal(result.resources.food,0);
  assert.equal(result.flags.monster_threat,7);
  assert.deepEqual({status:grace.status,room:grace.currentRoomNumber,nights:grace.remainingNights,revisit:grace.revisitPolicy,ending:grace.endingState},{status:"CHECKED_OUT",room:null,nights:0,revisit:"NEVER",ending:"PILGRIMAGE"});
  assert.equal(grace.storyFlags.story_departed_day,state.day);
  assert.equal(result.rooms.find((room)=>room.roomNumber===301)?.status,"EMPTY");
  assert.ok(result.rooms.every((room)=>room.temporaryEffects.every((effect)=>effect.sourceGuestId!=="grace")));
  assert.equal(result.staffAssignments.MAINTENANCE,undefined);
  assert.equal(result.visitorHistory.find((entry)=>entry.visitorId==="grace")?.finalState,"STORY_PILGRIMAGE");
  assert.equal(result.flags.grace_pilgrimage,true);
  assert.equal(result.flags.grace_mutual_aid,false);
  assert.equal(result.flags.safe_routes_mapped,true);
  assert.equal(result.activeCutsceneId,"grace_pilgrimage");
  assert.equal(getCutscene(result.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/grace-pilgrimage-v1.png");
  assert.match(resolved.entry.message,/호텔 출발$/);
  const restored=restoreGameState(serializeGameState(result));
  assert.equal(restored.guests.find((guest)=>guest.id==="grace")?.revisitPolicy,"NEVER");
  assert.equal(getEligibleVisitor(restored.guests.filter((guest)=>guest.id==="grace"),100,restored.flags),null);
  assert.equal(restored.activeCutsceneId,"grace_pilgrimage");
});

test("Grace의 순례는 식량이 2 미만이면 상태를 바꾸지 않는다", () => {
  const state=resolutionState("grace");
  state.resources.food=1;
  const choice=STORY_CHOICE_EVENTS.find((event)=>event.id==="grace-faith")!.choices.find((candidate)=>candidate.id==="pilgrimage")!;
  const before=serializeGameState(state);
  assert.equal(canChooseStoryChoice(state,choice),false);
  assert.throws(()=>applyStoryChoice(state,"grace-faith","pilgrimage"),/자원이 부족합니다/);
  assert.equal(serializeGameState(state),before);
});

test("Grace의 두 믿음 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다", () => {
  for(const [choiceId,cutsceneId] of [["mutual_aid","grace_mutual_aid"],["pilgrimage","grace_pilgrimage"]] as const){
    const state=resolutionState("grace");
    state.activeCutsceneId="first_night";
    const resolved=applyStoryChoice(state,"grace-faith",choiceId).state;
    assert.deepEqual(resolved.queuedCutsceneIds,[cutsceneId]);
    assert.equal(dismissCutscene(restoreGameState(serializeGameState(resolved))).activeCutsceneId,cutsceneId);
  }
});

test("Hazel의 외곽 경계대는 지속 경보망·객실 Aura·근무와 전용 컷신을 유지한다", () => {
  const state = resolutionState("hazel");
  state.flags.hazel_vengeance_complete = true;
  state.rooms = recalculateRoomEffects(assignGuest(state.rooms, 301, "hazel"), state.guests);
  state.staffAssignments.SCAVENGE = "hazel";
  const choice = STORY_CHOICE_EVENTS.find((event) => event.id === "hazel-watch")!.choices.find((candidate) => candidate.id === "ranger")!;
  for (const term of ["Trust +12", "Monster Threat -8", "Security +10", "베일과의 관계 +10", "Perimeter Watch Aura", "배정된 근무", "매일 실제 Monster Threat를 최대 3", "치안 물자 2", "영구히 포기", "되돌릴 수 없습니다"]) assert.ok(choice.description.includes(term), term);
  const result = applyStoryChoice(state, "hazel-watch", "ranger").state;
  const hazel = result.guests.find((guest) => guest.id === "hazel")!;
  assert.equal(result.flags.hazel_ranger_watch, true);
  assert.equal(result.flags.perimeter_alarm, true);
  assert.equal(result.flags.hazel_vengeance_complete, false);
  assert.deepEqual({ status: hazel.status, room: hazel.currentRoomNumber, revisit: hazel.revisitPolicy }, { status: "STAYING", room: 301, revisit: "CONDITIONAL" });
  assert.equal(result.staffAssignments.SCAVENGE, "hazel");
  assert.ok(result.rooms.some((room) => room.temporaryEffects.some((effect) => effect.sourceGuestId === "hazel")));
  assert.equal(result.activeCutsceneId, "hazel_perimeter_watch");
  assert.equal(getCutscene(result.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/hazel-perimeter-watch-v1.png");
  const restored = restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.perimeter_alarm, true);
  assert.equal(restored.activeCutsceneId, "hazel_perimeter_watch");
});

test("Hazel의 복수 원정은 물자와 지속 경계를 교환하고 Aura·근무·재방문을 정리하는 영구 출발이다", () => {
  let state = resolutionState("hazel");
  state.resources.security = 2;
  Object.assign(state.flags, { monster_threat: 20, hazel_ranger_watch: true, perimeter_alarm: true });
  state.rooms = recalculateRoomEffects(assignGuest(state.rooms, 301, "hazel"), state.guests);
  state.staffAssignments.SCAVENGE = "hazel";
  state = recordVisitorDecision(state, "hazel", "ACCEPTED", 301);
  const choice = STORY_CHOICE_EVENTS.find((event) => event.id === "hazel-watch")!.choices.find((candidate) => candidate.id === "vengeance")!;
  for (const term of ["치안 물자 2", "Trust +8", "Monster Threat -12", "미스터 화이트와의 관계가 15 악화", "스스로 선택한", "영구 출발", "Perimeter Watch Aura", "배정된 근무", "재방문하지 않습니다", "Security +10", "매일 Monster Threat 최대 3", "영구히 포기", "되돌릴 수 없습니다"]) assert.ok(choice.description.includes(term), term);
  const resolved = applyStoryChoice(state, "hazel-watch", "vengeance");
  const result = resolved.state;
  const hazel = result.guests.find((guest) => guest.id === "hazel")!;
  const whiteRelation = hazel.relationships.find((relation) => relation.targetId === "white")!;
  assert.equal(result.resources.security, 0);
  assert.equal(result.flags.monster_threat, 8);
  assert.equal(whiteRelation.value, -75);
  assert.equal(result.flags.hazel_vengeance_complete, true);
  assert.equal(result.flags.hazel_ranger_watch, false);
  assert.equal(result.flags.perimeter_alarm, false);
  assert.deepEqual({ status: hazel.status, room: hazel.currentRoomNumber, nights: hazel.remainingNights, revisit: hazel.revisitPolicy, ending: hazel.endingState }, { status: "CHECKED_OUT", room: null, nights: 0, revisit: "NEVER", ending: "VENGEANCE_EXPEDITION" });
  assert.equal(hazel.storyFlags.story_departed_day, state.day);
  assert.equal(result.rooms.find((room) => room.roomNumber === 301)?.status, "EMPTY");
  assert.ok(result.rooms.every((room) => room.temporaryEffects.every((effect) => effect.sourceGuestId !== "hazel")));
  assert.equal(result.staffAssignments.SCAVENGE, undefined);
  assert.equal(result.visitorHistory.find((entry) => entry.visitorId === "hazel")?.finalState, "STORY_VENGEANCE_EXPEDITION");
  assert.equal(result.activeCutsceneId, "hazel_vengeance_expedition");
  assert.equal(getCutscene(result.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/hazel-vengeance-expedition-v1.png");
  assert.match(resolved.entry.message, /호텔 출발$/);
  const restored = restoreGameState(serializeGameState(result));
  assert.equal(restored.guests.find((guest) => guest.id === "hazel")?.revisitPolicy, "NEVER");
  assert.equal(getEligibleVisitor(restored.guests.filter((guest) => guest.id === "hazel"), 100, restored.flags), null);
  assert.equal(restored.activeCutsceneId, "hazel_vengeance_expedition");
});

test("Hazel의 복수 원정은 치안 물자가 2 미만이면 상태를 바꾸지 않는다", () => {
  const state = resolutionState("hazel");
  state.resources.security = 1;
  const choice = STORY_CHOICE_EVENTS.find((event) => event.id === "hazel-watch")!.choices.find((candidate) => candidate.id === "vengeance")!;
  const before = serializeGameState(state);
  assert.equal(canChooseStoryChoice(state, choice), false);
  assert.throws(() => applyStoryChoice(state, "hazel-watch", "vengeance"), /자원이 부족합니다/);
  assert.equal(serializeGameState(state), before);
});

test("Hazel의 두 결말 컷신은 다른 장면 뒤에도 큐로 저장되어 유실되지 않는다", () => {
  for (const [choiceId, cutsceneId] of [["ranger", "hazel_perimeter_watch"], ["vengeance", "hazel_vengeance_expedition"]] as const) {
    const state = resolutionState("hazel");
    state.activeCutsceneId = "first_night";
    const resolved = applyStoryChoice(state, "hazel-watch", choiceId).state;
    assert.deepEqual(resolved.queuedCutsceneIds, [cutsceneId]);
    assert.equal(dismissCutscene(restoreGameState(serializeGameState(resolved))).activeCutsceneId, cutsceneId);
  }
});

test("토머스의 마이크로그리드는 안정 전력망을 열고 자신의 라디오 노출만 닫는다", () => {
  const state=resolutionState("thomas");
  state.flags.thomas_radio_grid=true;
  state.flags.safe_routes_mapped=true;
  const choice=STORY_CHOICE_EVENTS.find((event)=>event.id==="thomas-grid")!.choices.find((candidate)=>candidate.id==="microgrid")!;
  for (const term of ["연료 3","Trust +12","Security +8","Hotel Condition +8","연료 소모 1","저연료 고장","토머스가 만든 라디오 출처","community 평판 +7","refugee 평판 +5","다른 라디오 출처가 활성이라면 공통 +1은 유지","다른 주민이 만든 안전 통로도 유지"]) assert.ok(choice.description.includes(term),term);
  const poor=resolutionState("thomas");
  poor.resources.fuel=2;
  assert.equal(canChooseStoryChoice(poor,choice),false);
  const result = applyStoryChoice(state, "thomas-grid", "microgrid").state;
  assert.equal(result.flags.thomas_microgrid, true);
  assert.equal(result.flags.generator_network_stable, true);
  assert.equal(result.flags.thomas_radio_grid, false);
  assert.equal(result.flags.safe_routes_mapped, true);
  assert.equal(getDailyVisitorCountBreakdown(result).radioBonus,0);
  assert.equal(result.activeCutsceneId, "thomas_microgrid_online");
  assert.equal(getCutscene(result.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/thomas-microgrid-online-v1.png");
  const otherRadio=resolutionState("thomas");
  otherRadio.flags.thomas_radio_grid=true;
  otherRadio.flags.lily_truth_broadcast=true;
  const withLily=applyStoryChoice(otherRadio,"thomas-grid","microgrid").state;
  assert.deepEqual(getDailyVisitorCountBreakdown(withLily).radioSources.map((source)=>source.id),["lily_truth_broadcast"]);
  assert.equal(getDailyVisitorCountBreakdown(withLily).radioBonus,1);
  const restored = restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.generator_network_stable, true);
  assert.equal(restored.activeCutsceneId, "thomas_microgrid_online");
});

test("토머스의 라디오 중계망은 다음 DAY 방문을 늘리고 마이크로그리드를 닫는 전용 컷씬을 연다", () => {
  let state=resolutionState("thomas");
  state.flags.thomas_microgrid=true;
  state.flags.generator_network_stable=true;
  state=prepareDailyVisitorQueue(state);
  const currentDayQueue=[...state.dailyVisitorQueue];
  const choice=STORY_CHOICE_EVENTS.find((event)=>event.id==="thomas-grid")!.choices.find((candidate)=>candidate.id==="signal")!;
  for (const term of ["Trust +10","community 평판 +7","refugee 평판 +5","안전 통로","다음 DAY","공통 라디오 유입 보너스 +1","상한","중첩되지 않음","Monster Threat","5 증가","연료 3","Security +8","Hotel Condition +8","연료 소모 1","저연료 고장","영구히 포기"]) assert.ok(choice.description.includes(term),term);
  const result = applyStoryChoice(state, "thomas-grid", "signal").state;
  assert.equal(result.flags.thomas_radio_grid, true);
  assert.equal(result.flags.safe_routes_mapped, true);
  assert.equal(result.flags.thomas_microgrid, false);
  assert.equal(result.flags.generator_network_stable, false);
  assert.equal(result.flags.monster_threat,5);
  assert.equal(result.reputations.community,7);
  assert.equal(result.reputations.refugee,5);
  assert.deepEqual(result.dailyVisitorQueue,currentDayQueue);
  assert.deepEqual(getDailyVisitorCountBreakdown(result).radioSources.map((source)=>source.id),["thomas_radio_grid"]);
  assert.equal(result.activeCutsceneId, "thomas_radio_relay");
  assert.equal(getCutscene(result.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/thomas-radio-relay-v1.png");
  const nextDay={...result,day:result.day+1,phase:"desk" as const};
  const nextDayWithoutRelay={...nextDay,flags:{...nextDay.flags,thomas_radio_grid:false}};
  assert.equal(getDailyVisitorCountBreakdown(nextDay).total,Math.min(6,getDailyVisitorCountBreakdown(nextDayWithoutRelay).total+1));
  const prepared=prepareDailyVisitorQueue(nextDay);
  assert.equal(prepared.visitorQueueDay,nextDay.day);
  assert.equal(prepared.dailyVisitorQueue.length,getDailyVisitorCountBreakdown(nextDay).total);
  const restored = restoreGameState(serializeGameState(prepared));
  assert.equal(restored.flags.thomas_radio_grid,true);
  assert.deepEqual(restored.dailyVisitorQueue,prepared.dailyVisitorQueue);
  assert.equal(restored.activeCutsceneId, "thomas_radio_relay");
});

test("토머스의 두 전력망 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다", () => {
  for (const [choiceId,cutsceneId] of [["microgrid","thomas_microgrid_online"],["signal","thomas_radio_relay"]] as const) {
    const state=resolutionState("thomas");
    state.activeCutsceneId="first_night";
    const resolved=applyStoryChoice(state,"thomas-grid",choiceId).state;
    assert.deepEqual(resolved.queuedCutsceneIds,[cutsceneId]);
    assert.equal(dismissCutscene(restoreGameState(serializeGameState(resolved))).activeCutsceneId,cutsceneId);
  }
});

test("Noah의 회복 경로는 공동 식당과 전용 컷신을 열고 저장된다", () => {
  let state=applyStoryChoice(conflictState("noah"),"noah-cellar","rehabilitate").state;
  state.guests=state.guests.map((guest)=>guest.id==="noah"?{...guest,remainingNights:1}:guest);
  state.flags.noah_ration_system=true;
  const choice=STORY_CHOICE_EVENTS.find((event)=>event.id==="noah-table")!.choices.find((candidate)=>candidate.id==="community_kitchen")!;
  for(const term of ["Trust +15","Hotel Condition +10","community 평판 +9","humanitarian 평판 +5","투숙객 2명 이상","매일 식량 1","즉시 식량 4","Food Sustainability +3","Aura 보정 수요 3마다 1","최대 2","영구히 포기"]) assert.ok(choice.description.includes(term),term);
  const result=applyStoryChoice(state,"noah-table","community_kitchen").state;
  assert.equal(result.flags.noah_recovery_started,true);
  assert.equal(result.flags.noah_community_kitchen,true);
  assert.equal(result.flags.noah_ration_system,false);
  assert.equal(result.activeCutsceneId,"noah_community_table");
  assert.equal(getCutscene(result.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/noah-community-table-v1.png");
  const restored=restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.noah_community_kitchen,true);
  assert.equal(restored.flags.noah_ration_system,false);
  assert.equal(restored.activeCutsceneId,"noah_community_table");
});

test("부엌에서 내보낸 Noah의 보존식 연구는 실제 대규모 식량 수요와 전용 컷씬에 연결된다", () => {
  let state=applyStoryChoice(conflictState("noah"),"noah-cellar","dismiss").state;
  state.guests=state.guests.map((guest)=>guest.id==="noah"?{...guest,remainingNights:1}:guest);
  state.flags.noah_community_kitchen=true;
  const pending=getPendingStoryChoice(state)!;
  const kitchen=pending.choices.find((choice)=>choice.id==="community_kitchen")!;
  const ration=pending.choices.find((choice)=>choice.id==="ration_lab")!;
  for(const term of ["부엌 복귀 여부와 무관하게","Trust +8","식량 +4","Food Sustainability +3","객실 Aura 계산 뒤","식량 수요 3마다 1","매일 최대 2","수요가 3 미만","Trust가 7 낮고","Hotel Condition +10","community 평판 +9","humanitarian 평판 +5","영구히 포기"]) assert.ok(ration.description.includes(term),term);
  assert.equal(canChooseStoryChoice(state,kitchen),false);
  assert.equal(canChooseStoryChoice(state,ration),true);
  assert.throws(()=>applyStoryChoice(state,"noah-table","community_kitchen"),/선행 사건/);
  const foodBefore=state.resources.food;
  const result=applyStoryChoice(state,"noah-table","ration_lab").state;
  assert.equal(result.resources.food,foodBefore+4);
  assert.equal(result.flags.noah_ration_system,true);
  assert.equal(result.flags.noah_community_kitchen,false);
  assert.equal(result.activeCutsceneId,"noah_ration_lab");
  assert.equal(getCutscene(result.activeCutsceneId)?.image,"/juminjung/assets/cutscenes/noah-ration-lab-v1.png");
  const residentIds=["noah","walter","claire","mia","samuel","ruth"];
  const populated={...result,guests:result.guests.map((guest)=>{
    const index=residentIds.indexOf(guest.id);
    return index>=0?{...guest,status:"STAYING" as const,currentRoomNumber:101+index}:{...guest,status:"WAITING" as const,currentRoomNumber:null};
  })};
  assert.deepEqual(getNightFoodDemand(populated.rooms,populated.guests,populated.flags),{demand:4,saving:2});
  const restored=restoreGameState(serializeGameState(populated));
  assert.equal(restored.flags.noah_ration_system,true);
  assert.equal(restored.flags.noah_community_kitchen,false);
  assert.equal(restored.activeCutsceneId,"noah_ration_lab");
  assert.deepEqual(getNightFoodDemand(restored.rooms,restored.guests,restored.flags),{demand:4,saving:2});
});

test("Noah의 두 식량 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다", () => {
  for(const [conflictChoiceId,resolutionChoiceId,cutsceneId] of [["rehabilitate","community_kitchen","noah_community_table"],["dismiss","ration_lab","noah_ration_lab"]] as const){
    let state=applyStoryChoice(conflictState("noah"),"noah-cellar",conflictChoiceId).state;
    state.guests=state.guests.map((guest)=>guest.id==="noah"?{...guest,remainingNights:1}:guest);
    state.activeCutsceneId="first_night";
    const resolved=applyStoryChoice(state,"noah-table",resolutionChoiceId).state;
    assert.deepEqual(resolved.queuedCutsceneIds,[cutsceneId]);
    assert.equal(dismissCutscene(restoreGameState(serializeGameState(resolved))).activeCutsceneId,cutsceneId);
  }
});

test("Hayes에게 지휘권을 넘기면 군정 점령 경로와 전용 인계 장면이 열린다", () => {
  const state = resolutionState("hayes");
  state.reputations.military = 72;
  state.flags.military_resistance_succeeded = true;
  state.flags.civilian_command = true;
  const result = applyStoryChoice(state, "hayes-command", "sign_command").state;
  assert.equal(result.flags.military_rule_signed, true);
  assert.equal(result.flags.military_resistance_failed, true);
  assert.equal(result.flags.military_resistance_succeeded, false);
  assert.equal(result.flags.civilian_command, false);
  assert.equal(result.reputations.military, 90);
  assert.ok(evaluateEndings(result).available.includes("MILITARY_OCCUPATION"));
  assert.equal(result.activeCutsceneId, "hayes_command_signed");
  assert.equal(getCutscene(result.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/hayes-command-signed-v1.png");
  const restored = restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.military_resistance_failed, true);
  assert.equal(restored.activeCutsceneId, "hayes_command_signed");
});

test("Hayes를 민간 협의체 아래 두면 군정 점령을 막고 전용 민간 인계 장면이 열린다", () => {
  const state = resolutionState("hayes");
  state.flags.military_resistance_failed = true;
  state.flags.military_rule_signed = true;
  const result = applyStoryChoice(state, "hayes-command", "civilian_rule").state;
  assert.equal(result.flags.civilian_command, true);
  assert.equal(result.flags.military_resistance_succeeded, true);
  assert.equal(result.flags.military_resistance_failed, false);
  assert.equal(result.flags.military_rule_signed, false);
  assert.ok(!evaluateEndings(result).available.includes("MILITARY_OCCUPATION"));
  assert.equal(result.activeCutsceneId, "hayes_civilian_command");
  assert.equal(getCutscene(result.activeCutsceneId)?.image, "/juminjung/assets/cutscenes/hayes-civilian-command-v1.png");
  const restored = restoreGameState(serializeGameState(result));
  assert.equal(restored.flags.civilian_command, true);
  assert.equal(restored.activeCutsceneId, "hayes_civilian_command");
});

test("Hayes의 두 지휘권 결말 컷씬은 다른 장면 뒤에 큐로 저장되어 유실되지 않는다", () => {
  for (const [choiceId, cutsceneId] of [["civilian_rule", "hayes_civilian_command"], ["sign_command", "hayes_command_signed"]] as const) {
    const state = resolutionState("hayes");
    state.activeCutsceneId = "first_night";
    const resolved = applyStoryChoice(state, "hayes-command", choiceId).state;
    assert.equal(resolved.activeCutsceneId, "first_night");
    assert.deepEqual(resolved.queuedCutsceneIds, [cutsceneId]);
    const restored = restoreGameState(serializeGameState(resolved));
    const advanced = dismissCutscene(restored);
    assert.equal(advanced.activeCutsceneId, cutsceneId);
    assert.deepEqual(advanced.queuedCutsceneIds, []);
  }
});
