import test from "node:test";
import assert from "node:assert/strict";
import { recalculateRoomEffects } from "../game/aura-effect-manager.ts";
import { resolveDay } from "../game/day-manager.ts";
import { getHotelLogEntries } from "../game/hotel-log-manager.ts";
import { ELEANOR_ID } from "../game/guest-data.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { assignGuest } from "../game/room-manager.ts";
import { createNormalVisitor } from "../game/normal-visitor-data.ts";

const NORMAL_ID = "normal-test";

function checkedInState() {
  const state = createInitialGameState();
  state.day = 1;
  state.phase = "night";
  state.decision = "checkin";
  state.guests = state.guests.map((guest) => guest.id === ELEANOR_ID ? { ...guest, status: "STAYING", currentRoomNumber: 301, checkedInDay: 1 } : guest);
  state.rooms = recalculateRoomEffects(assignGuest(state.rooms, 301, ELEANOR_ID), state.guests);
  return state;
}

function temporaryGuestState() {
  const state = createInitialGameState();
  const generated = { ...createNormalVisitor(77,1,0), id:NORMAL_ID, stayDuration:2, remainingNights:2, status:"STAYING" as const, currentRoomNumber:301, checkedInDay:1, aura:state.guests[0].aura };
  state.day=1; state.phase="night"; state.decision="checkin"; state.guests=[...state.guests,generated];
  state.rooms=recalculateRoomEffects(assignGuest(state.rooms,301,NORMAL_ID),state.guests);
  return state;
}

test("DAY 종료 시 점유 인원만큼 식량과 물, 기본 연료가 소비된다", () => {
  const result = resolveDay(checkedInState());
  assert.deepEqual(result.lastDaySummary?.consumed, { food: 1, water: 1, fuel: 1 });
  assert.equal(result.resources.food, 47);
  assert.equal(result.resources.water, 53);
  assert.equal(result.resources.fuel, 61);
});

test("Thomas의 독립 마이크로그리드는 기본 발전기 연료를 절감하고 로그에 남긴다", () => {
  const state = checkedInState();
  state.flags.generator_network_stable = true;
  const result = resolveDay(state);
  assert.deepEqual(result.lastDaySummary?.consumed, { food: 1, water: 1, fuel: 0 });
  assert.equal(result.resources.fuel, 62);
  assert.ok(result.eventHistory.some((entry) => entry.message === "독립 마이크로그리드 · 기본 발전기 연료 1 절감"));
});

test("메인 NPC는 스토리 시계가 진행돼도 자동 퇴실하지 않고 객실 Aura를 유지한다", () => {
  const result = resolveDay(checkedInState());
  assert.equal(result.day, 2);
  assert.equal(result.guests[0].remainingNights, 1);
  assert.equal(result.guests[0].currentRoomNumber, 301);
  assert.ok(result.rooms.find((room) => room.roomNumber === 202)?.temporaryEffects.length);
  const later=resolveDay({...result,phase:"night"});
  assert.equal(later.guests[0].remainingNights,0);
  assert.equal(later.guests[0].status,"STAYING");
  assert.equal(later.guests[0].currentRoomNumber,301);
});

test("일반 NPC는 두 번째 밤이 끝나면 자동 체크아웃하고 Aura를 제거한다", () => {
  const day2 = resolveDay(temporaryGuestState());
  const day3 = resolveDay({ ...day2, phase: "night" });
  const guest=day3.guests.find((candidate)=>candidate.id===NORMAL_ID)!;
  assert.equal(guest.status, "CHECKED_OUT");
  assert.equal(guest.currentRoomNumber, null);
  assert.equal(guest.storyFlags.last_checked_out_day, 2);
  assert.equal(guest.storyFlags.next_revisit_day, 8);
  assert.equal(day3.rooms.find((room) => room.roomNumber === 301)?.occupied, false);
  assert.equal(day3.rooms.some((room) => room.temporaryEffects.length > 0), false);
});

test("DAY 정산은 호텔 로그에 자원 소비와 자동 체크아웃을 남긴다", () => {
  const day3 = resolveDay({ ...resolveDay(temporaryGuestState()), phase: "night" });
  assert.ok(day3.eventHistory.some((entry) => entry.type === "RESOURCE"));
  assert.ok(day3.eventHistory.some((entry) => entry.type === "CHECK_OUT"));
});

test("DAY 2 저장 복원 후 남은 숙박과 자원, 로그가 유지된다", () => {
  const day2 = resolveDay(checkedInState());
  const restored = restoreGameState(serializeGameState(day2));
  assert.equal(restored.version, 11);
  assert.equal(restored.day, 2);
  assert.equal(restored.guests[0].remainingNights, 1);
  assert.equal(restored.resources.food, 47);
  assert.ok(restored.eventHistory.some((entry) => entry.type === "RESOURCE"));
  assert.ok(restored.eventHistory.some((entry) => entry.type === "EVENT"));
});

test("DAY 30 이후에도 정산과 운영을 계속할 수 있다", () => {
  const state = checkedInState();
  state.day = 30;
  const result = resolveDay(state);
  assert.equal(result.day, 31);
  assert.equal(result.phase, "report");
  result.phase = "night";
  assert.equal(resolveDay(result).day, 32);
});

test("HOTEL JOURNAL은 전체 기록을 최신순으로 제공하고 유형별로 필터링한다", () => {
  const state = createInitialGameState();
  state.eventHistory = [
    { day: 1, type: "CHECK_IN", message: "Eleanor 체크인" },
    { day: 1, type: "RESOURCE", message: "식량 소비" },
    { day: 2, type: "EVENT", message: "발전기 정전" },
  ];
  assert.deepEqual(getHotelLogEntries(state.eventHistory).map(({ entry }) => entry.message), ["발전기 정전", "식량 소비", "Eleanor 체크인"]);
  assert.deepEqual(getHotelLogEntries(state.eventHistory, "RESOURCE").map(({ entry }) => entry.message), ["식량 소비"]);
});
