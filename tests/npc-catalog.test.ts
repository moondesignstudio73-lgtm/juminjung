import test from "node:test";
import assert from "node:assert/strict";
import { createGuests } from "../game/guest-data.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { discoverTrait, getEligibleVisitor, markVisitorRefused } from "../game/visitor-manager.ts";

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
