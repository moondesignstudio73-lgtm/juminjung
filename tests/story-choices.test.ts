import test from "node:test";
import assert from "node:assert/strict";
import { applyStoryChoice, canChooseStoryChoice, getPendingStoryChoice } from "../game/story-choice-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { advanceHotelStories } from "../game/story-event-manager.ts";
import { evaluateEndings } from "../game/ending-manager.ts";
import { STORY_CHOICE_EVENTS } from "../game/story-choice-data.ts";
import { createGuests } from "../game/guest-data.ts";

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

test("Save v9은 진행 대기 중인 NPC 스토리 장면을 복원한다", () => {
  const state = conflictState("walter");
  state.phase = "story";
  state.pendingStoryEventId = "walter-father-lie";
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.version, 9);
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

test("Eleanor의 상설 진료 선택은 약품과 의료 엔딩 조건을 연결한다", () => {
  const state = resolutionState("eleanor");
  const result = applyStoryChoice(state, "eleanor-standard", "clinic");
  const eleanor = result.state.guests.find((guest) => guest.id === "eleanor")!;
  assert.equal(result.state.resources.medicine, state.resources.medicine - 3);
  assert.equal(result.state.flags.eleanor_clinic_established, true);
  assert.equal(eleanor.storyFlags.choice_resolution, "clinic");
  assert.equal(eleanor.eventChain.find((event) => event.stage === "RESOLUTION")?.completed, true);
});

test("Walter의 열쇠 사용은 아버지 비밀과 괴물 기원 단서를 연다", () => {
  const result = applyStoryChoice(resolutionState("walter"), "walter-key", "use_key");
  assert.equal(result.state.flags.father_secret_discovered, true);
  assert.equal(result.state.flags.monster_origin_clue_1, true);
  assert.equal(result.state.fatherStoryProgress, 30);
});

test("Mia의 재회는 가족 경로와 Daniel 관계를 완성한다", () => {
  const result = applyStoryChoice(resolutionState("mia"), "mia-family", "reunite");
  const mia = result.state.guests.find((guest) => guest.id === "mia")!;
  assert.equal(result.state.flags.family_routes_complete, true);
  assert.equal(mia.relationships.find((relation) => relation.targetId === "daniel")?.value, 25);
});

test("Owen의 방어대는 군사 저항 성공 조건을 기록한다", () => {
  const result = applyStoryChoice(resolutionState("owen"), "owen-future", "resistance");
  assert.equal(result.state.flags.military_resistance_succeeded, true);
  assert.equal(result.state.flags.hotel_defense_force, true);
});

test("Mr. White를 받아들이면 THE DOOR 응답과 비인간 단서가 남는다", () => {
  const result = applyStoryChoice(resolutionState("white"), "white-answer", "yes");
  const white = result.state.guests.find((guest) => guest.id === "white")!;
  assert.equal(result.state.flags.the_door_answer_yes, true);
  assert.ok(white.discoveredTraits.includes("NonHumanPossible"));
  assert.equal(result.state.flags.monster_threat, 20);
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

test("Lily의 결말 선택은 문서 해독과 숨겨진 특성을 기록한다", () => {
  const result = applyStoryChoice(resolutionState("lily"), "lily-truth", "archive");
  const lily = result.state.guests.find((guest) => guest.id === "lily")!;
  assert.equal(result.state.flags.lily_documents_decoded, true);
  assert.equal(result.state.flags.lily_truth_archived, true);
  assert.ok(lily.discoveredTraits.includes("OriginDocuments"));
});

test("Vale의 연구 완성은 Lily 관계와 THE TRUTH 핵심 플래그를 기록한다", () => {
  const state = resolutionState("vale");
  state.flags.vale_sample_stabilized = true;
  const result = applyStoryChoice(state, "vale-research", "complete");
  const vale = result.state.guests.find((guest) => guest.id === "vale")!;
  assert.equal(result.state.flags.vale_research_complete, true);
  assert.equal(vale.relationships.find((relation) => relation.targetId === "lily")?.value, 45);
  assert.ok(vale.discoveredTraits.includes("PreOutbreakResearch"));
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
  let state = applyStoryChoice(resolutionState("jack"), "jack-market", "fair_market").state;
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
  assert.equal(state.flags.ruin_market_controlled, undefined);
  assert.equal(evaluateEndings(state).available.includes("KING_OF_THE_RUINS"), false);
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
