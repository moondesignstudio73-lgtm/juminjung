import test from "node:test";
import assert from "node:assert/strict";
import { createGuests } from "../game/guest-data.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { applyVisitorCheckInBenefits, applyVisitorReaction, collectVisitorOffer, discoverTrait, getEligibleVisitor, getVisitorReaction, getVisitorReactionById, markVisitorRefused } from "../game/visitor-manager.ts";

test("20명의 메인 NPC가 고유 ID와 완전한 기본 상태로 등록된다", () => {
  const guests = createGuests();
  assert.equal(guests.length, 20);
  assert.equal(new Set(guests.map((guest) => guest.id)).size, 20);
  for (const guest of guests) {
    assert.equal(guest.eventChain.length, 4);
    assert.equal(guest.expressions.length, 7);
    assert.ok(guest.arrivalDayRange[0] <= guest.arrivalDayRange[1]);
    assert.ok(guest.stayDuration > 0);
  }
});

test("방문 일정은 DAY 범위와 WAITING 상태로 다음 손님을 선택한다", () => {
  const guests = createGuests();
  assert.equal(getEligibleVisitor(guests, 1)?.id, "eleanor");
  const refused = markVisitorRefused(guests, "eleanor");
  assert.equal(getEligibleVisitor(refused, 2)?.id, "walter");
});

test("Daniel과 Hayes는 선행 NPC가 실제로 등장한 뒤에만 방문 가능하다", () => {
  const guests = createGuests().map((guest) => guest.id !== "daniel" && guest.id !== "mia" ? { ...guest, status: "REFUSED" as const } : guest);
  assert.notEqual(getEligibleVisitor(guests, 20)?.id, "daniel");
  const miaAppeared = markVisitorRefused(guests, "mia");
  assert.equal(getEligibleVisitor(miaAppeared, 20)?.id, "daniel");
});

test("숨겨진 특성은 발견 전 비공개이며 발견 상태만 별도로 저장된다", () => {
  const guests = createGuests();
  assert.equal(guests[0].discoveredTraits.length, 0);
  const discovered = discoverTrait(guests, "eleanor", "TriageGuilt");
  assert.deepEqual(discovered[0].discoveredTraits, ["TriageGuilt"]);
});

test("구버전처럼 Eleanor만 있는 저장도 복원 시 20명 카탈로그를 병합한다", () => {
  const state = createInitialGameState();
  state.guests = [state.guests[0]];
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.guests.length, 20);
  assert.equal(restored.guests.find((guest) => guest.id === "white")?.status, "WAITING");
});

test("저장 복원은 새 이벤트 단계 기본값과 기존 진행 상태를 ID 기준으로 병합한다", () => {
  const state = createInitialGameState();
  state.guests[0].eventChain = [{ ...state.guests[0].eventChain[0], completed: true }];
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.guests[0].eventChain.length, 4);
  assert.equal(restored.guests[0].eventChain[0].completed, true);
});

test("FLAG 방문 조건은 실제 월드 플래그가 충족될 때만 열린다", () => {
  const guests = createGuests().map((guest) => guest.id === "eleanor" ? { ...guest, arrivalConditions: [{ type: "FLAG" as const, key: "clinic_open" }] } : { ...guest, status: "REFUSED" as const });
  assert.equal(getEligibleVisitor(guests, 20), null);
  assert.equal(getEligibleVisitor(guests, 20, { clinic_open: true })?.id, "eleanor");
});

test("피난민을 보호한 기록은 Rosa의 전용 대사·신뢰·추가 제안을 만든다", () => {
  const state = createInitialGameState();
  state.flags.refugees_sheltered = true;
  const rosa = state.guests.find((guest) => guest.id === "rosa")!;
  const reaction = getVisitorReaction(state, rosa)!;
  assert.equal(reaction.id, "rosa-refugees-sheltered");
  assert.ok(reaction.dialogue.includes("아이들을 로비로"));
  const reacted = applyVisitorReaction(state.guests, "rosa", reaction).find((guest) => guest.id === "rosa")!;
  assert.equal(reacted.trust, rosa.trust + 12);
  assert.equal(reacted.riskLevel, rosa.riskLevel - 5);
  assert.equal(reacted.storyFlags.visitor_reaction, reaction.id);
  const reward = collectVisitorOffer(state.resources, rosa, false, reaction);
  assert.equal(reward.food, state.resources.food + Number(rosa.offer.food) + 2);
  assert.equal(reward.water, state.resources.water + Number(rosa.offer.water) + 2);
});

test("난민 거절 후속 반응은 일반 난민 평판 반응보다 우선한다", () => {
  const state = createInitialGameState();
  state.flags.refugees_denied = true;
  state.reputations.refugee = 80;
  const rosa = state.guests.find((guest) => guest.id === "rosa")!;
  const reaction = getVisitorReaction(state, rosa)!;
  assert.equal(reaction.id, "rosa-refugees-denied");
  assert.equal(reaction.trustDelta, -12);
});

test("높은 상인 평판은 Jack의 추가 거래 제안을 연다", () => {
  const state = createInitialGameState();
  const jack = state.guests.find((guest) => guest.id === "jack")!;
  assert.equal(getVisitorReaction(state, jack), null);
  state.reputations.merchant = 30;
  const reaction = getVisitorReaction(state, jack)!;
  assert.equal(reaction.id, "jack-merchant-reputation");
  assert.deepEqual(reaction.offerBonus, { food: 2, parts: 1 });
});

test("군사 저항 기록은 높은 군 평판보다 Hayes의 적대 반응을 우선한다", () => {
  const state = createInitialGameState();
  state.reputations.military = 90;
  state.flags.military_resistance_started = true;
  const hayes = state.guests.find((guest) => guest.id === "hayes")!;
  assert.equal(getVisitorReaction(state, hayes)?.id, "hayes-resistance");
});

test("객실 선택 중에는 표시된 방문 반응 ID가 월드 상태 변화와 무관하게 유지된다", () => {
  const state = createInitialGameState();
  state.flags.refugees_sheltered = true;
  const rosa = state.guests.find((guest) => guest.id === "rosa")!;
  const displayed = getVisitorReaction(state, rosa)!;
  state.flags.refugees_sheltered = false;
  state.flags.refugees_denied = true;
  assert.equal(getVisitorReaction(state, rosa)?.id, "rosa-refugees-denied");
  assert.equal(getVisitorReactionById(rosa, displayed.id)?.id, "rosa-refugees-sheltered");
});

test("체크인 보상과 세력 반응은 같은 손님에게 한 번만 적용된다", () => {
  const state = createInitialGameState();
  state.flags.refugees_sheltered = true;
  const rosa = state.guests.find((guest) => guest.id === "rosa")!;
  const reaction = getVisitorReaction(state, rosa)!;
  const first = applyVisitorCheckInBenefits(state.resources, state.guests, rosa.id, false, reaction);
  const second = applyVisitorCheckInBenefits(first.resources, first.guests, rosa.id, false, reaction);
  assert.equal(first.applied, true);
  assert.equal(second.applied, false);
  assert.deepEqual(second.resources, first.resources);
  assert.deepEqual(second.guests, first.guests);
});

test("방문 반응의 신뢰와 위험 변화는 0에서 100 범위를 넘지 않는다", () => {
  const state = createInitialGameState();
  state.flags.refugees_sheltered = true;
  state.guests = state.guests.map((guest) => guest.id === "rosa" ? { ...guest, trust: 95, riskLevel: 2 } : guest);
  const rosa = state.guests.find((guest) => guest.id === "rosa")!;
  const reacted = applyVisitorReaction(state.guests, rosa.id, getVisitorReaction(state, rosa)).find((guest) => guest.id === rosa.id)!;
  assert.equal(reacted.trust, 100);
  assert.equal(reacted.riskLevel, 0);
});

test("Save v9은 객실 선택 중 고정된 방문 반응 ID를 복원한다", () => {
  const state = createInitialGameState();
  state.pendingVisitorReactionId = "rosa-refugees-sheltered";
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.pendingVisitorReactionId, "rosa-refugees-sheltered");
});
