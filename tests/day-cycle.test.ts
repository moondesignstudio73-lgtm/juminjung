import test from "node:test";
import assert from "node:assert/strict";
import { recalculateRoomEffects } from "../game/aura-effect-manager.ts";
import { resolveDay } from "../game/day-manager.ts";
import { ELEANOR_ID } from "../game/guest-data.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { assignGuest } from "../game/room-manager.ts";

function checkedInState() {
  const state = createInitialGameState();
  state.day = 1;
  state.phase = "night";
  state.decision = "checkin";
  state.guests = state.guests.map((guest) => guest.id === ELEANOR_ID ? { ...guest, status: "STAYING", currentRoomNumber: 301, checkedInDay: 1 } : guest);
  state.rooms = recalculateRoomEffects(assignGuest(state.rooms, 301, ELEANOR_ID), state.guests);
  return state;
}

test("DAY 종료 시 점유 인원만큼 식량과 물, 기본 연료가 소비된다", () => {
  const result = resolveDay(checkedInState());
  assert.deepEqual(result.lastDaySummary?.consumed, { food: 1, water: 1, fuel: 1 });
  assert.equal(result.resources.food, 47);
  assert.equal(result.resources.water, 53);
  assert.equal(result.resources.fuel, 61);
});

test("첫날 종료 후 숙박기간이 1박 남고 객실과 Aura는 유지된다", () => {
  const result = resolveDay(checkedInState());
  assert.equal(result.day, 2);
  assert.equal(result.guests[0].remainingNights, 1);
  assert.equal(result.guests[0].currentRoomNumber, 301);
  assert.ok(result.rooms.find((room) => room.roomNumber === 202)?.temporaryEffects.length);
});

test("두 번째 밤이 끝나면 자동 체크아웃하고 Aura를 제거한다", () => {
  const day2 = resolveDay(checkedInState());
  const day3 = resolveDay({ ...day2, phase: "night" });
  assert.equal(day3.guests[0].status, "CHECKED_OUT");
  assert.equal(day3.guests[0].currentRoomNumber, null);
  assert.equal(day3.rooms.find((room) => room.roomNumber === 301)?.occupied, false);
  assert.equal(day3.rooms.some((room) => room.temporaryEffects.length > 0), false);
});

test("DAY 정산은 호텔 로그에 자원 소비와 자동 체크아웃을 남긴다", () => {
  const day3 = resolveDay({ ...resolveDay(checkedInState()), phase: "night" });
  assert.ok(day3.eventHistory.some((entry) => entry.type === "RESOURCE"));
  assert.ok(day3.eventHistory.some((entry) => entry.type === "CHECK_OUT"));
});

test("DAY 2 저장 복원 후 남은 숙박과 자원, 로그가 유지된다", () => {
  const day2 = resolveDay(checkedInState());
  const restored = restoreGameState(serializeGameState(day2));
  assert.equal(restored.version, 4);
  assert.equal(restored.day, 2);
  assert.equal(restored.guests[0].remainingNights, 1);
  assert.equal(restored.resources.food, 47);
  assert.equal(restored.eventHistory.length, 1);
});

test("DAY 30 정산은 반복 가능한 보고서가 아니라 종료 상태로 진입한다", () => {
  const state = checkedInState();
  state.day = 30;
  const result = resolveDay(state);
  assert.equal(result.phase, "ending");
  assert.throws(() => resolveDay(result));
});
