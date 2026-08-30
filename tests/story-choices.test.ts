import test from "node:test";
import assert from "node:assert/strict";
import { applyStoryChoice, canChooseStoryChoice, getPendingStoryChoice } from "../game/story-choice-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { advanceHotelStories } from "../game/story-event-manager.ts";

function conflictState(guestId: string) {
  const state = createInitialGameState();
  state.day = 12;
  state.guests = state.guests.map((guest) => guest.id === guestId ? { ...guest, status: "STAYING", currentRoomNumber: 301, checkedInDay: 1, remainingNights: Math.max(1, guest.stayDuration - 1) } : guest);
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

test("Save v8은 진행 대기 중인 NPC 스토리 장면을 복원한다", () => {
  const state = conflictState("walter");
  state.phase = "story";
  state.pendingStoryEventId = "walter-father-lie";
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.version, 8);
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
