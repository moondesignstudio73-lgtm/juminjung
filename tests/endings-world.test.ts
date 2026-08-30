import test from "node:test";
import assert from "node:assert/strict";
import { ENDING_CONDITIONS } from "../game/ending-data.ts";
import { evaluateEndings } from "../game/ending-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { determineWorldState } from "../game/world-state-manager.ts";

test("7개 엔딩 경로가 고유 ID를 가진 데이터로 등록된다", () => {
  assert.equal(ENDING_CONDITIONS.length, 7);
  assert.equal(new Set(ENDING_CONDITIONS.map((ending) => ending.endingId)).size, 7);
});

test("조건이 충족된 여러 엔딩은 자동 종료 없이 동시에 AVAILABLE이 된다", () => {
  const state = createInitialGameState();
  Object.assign(state.flags, { military_resistance_failed: true });
  state.guests = state.guests.map((guest) => ["ruth", "rosa", "mia"].includes(guest.id) ? { ...guest, eventChain: guest.eventChain.map((event) => ({ ...event, completed: true })) } : guest);
  Object.assign(state.hotelStats, { crime: 5 });
  Object.assign(state.reputations, { military: 95 });
  const result = evaluateEndings(state);
  assert.ok(result.available.includes("HOME"));
  assert.ok(result.available.includes("MILITARY_OCCUPATION"));
  assert.equal(state.phase, "title");
});

test("숨겨진 THE DOOR는 미충족 상태에서 UNKNOWN으로만 표시된다", () => {
  assert.equal(evaluateEndings(createInitialGameState()).progress.THE_DOOR, "UNKNOWN");
});

test("HOME은 Ruth, Rosa, Mia의 생존 스토리를 완료하면 실제 플레이에서 해금된다", () => {
  const state = createInitialGameState();
  state.guests = state.guests.map((guest) => ["ruth", "rosa", "mia"].includes(guest.id) ? { ...guest, eventChain: guest.eventChain.map((event) => ({ ...event, completed: true })) } : guest);
  assert.ok(evaluateEndings(state).available.includes("HOME"));
});

test("THE DOOR는 숨김 상태여도 조건 충족 후 availableEndings에 포함된다", () => {
  const state = createInitialGameState();
  state.worldState = "END_STAGE";
  Object.assign(state.flags, { mr_white_door: true, father_secret_discovered: true, monster_origin_clue_2: true });
  assert.ok(evaluateEndings(state).available.includes("THE_DOOR"));
});

test("World State는 날짜뿐 아니라 자원과 호텔 안정화 수치의 영향을 받는다", () => {
  const safe = createInitialGameState();
  safe.day = 40;
  safe.hotelStats.security = 100;
  safe.hotelStats.hotelCondition = 100;
  const scarce = { ...safe, resources: { ...safe.resources, food: 0, water: 0, fuel: 0 }, hotelStats: { ...safe.hotelStats, security: 0, hotelCondition: 0 } };
  assert.equal(determineWorldState(safe), "STABLE");
  assert.notEqual(determineWorldState(scarce), determineWorldState(safe));
});

test("구버전 DAY 30 ending 저장은 v6 report로 복원되어 즉시 종료되지 않는다", () => {
  const old = JSON.parse(serializeGameState(createInitialGameState()));
  old.version = 4;
  old.day = 30;
  old.phase = "ending";
  delete old.activeEndingId;
  const restored = restoreGameState(JSON.stringify(old));
  assert.equal(restored.version, 6);
  assert.equal(restored.phase, "report");
  assert.equal(restored.day, 30);
});
