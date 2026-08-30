import test from "node:test";
import assert from "node:assert/strict";
import { resolveDay } from "../game/day-manager.ts";
import { buildFacility, performHotelAction } from "../game/hotel-action-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";

test("시설 건설은 자원과 행동 포인트를 소비하고 효과와 로그를 남긴다", () => {
  const initial = createInitialGameState();
  const result = buildFacility(initial, "water_purifier");
  assert.equal(result.ok, true);
  assert.equal(result.state.facilities.water_purifier, true);
  assert.equal(result.state.resources.parts, 2);
  assert.equal(result.state.hotelStats.waterSustainability, 1);
  assert.equal(result.state.actionPoints, 1);
  assert.ok(result.state.eventHistory.at(-1)?.message.includes("정수 시설"));
});

test("이미 완공한 시설은 중복 건설할 수 없다", () => {
  const built = buildFacility(createInitialGameState(), "water_purifier").state;
  const duplicate = buildFacility(built, "water_purifier");
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.state.resources.parts, built.resources.parts);
});

test("공동체 회의는 수용한 생존자의 Trust와 공동체 평판을 높인다", () => {
  const state = createInitialGameState();
  state.guests[0] = { ...state.guests[0], checkedInDay: 1, status: "STAYING" };
  const result = performHotelAction(state, "community_outreach");
  assert.equal(result.state.guests[0].trust, state.guests[0].trust + 5);
  assert.equal(result.state.reputations.community, 8);
  assert.equal(result.state.reputations.humanitarian, 5);
});

test("교역 원정은 연료를 자원과 부품으로 교환해 추가 시설 건설을 가능하게 한다", () => {
  const state = createInitialGameState();
  const result = performHotelAction(state, "trade_run");
  assert.equal(result.state.resources.fuel, state.resources.fuel - 2);
  assert.equal(result.state.resources.parts, state.resources.parts + 1);
  assert.equal(result.state.reputations.merchant, 6);
});

test("정수·식량 시설은 야간 생산을 제공하고 다음 날 행동 포인트가 회복된다", () => {
  let state = createInitialGameState();
  state.resources.parts = 20;
  state = buildFacility(state, "water_purifier").state;
  state = buildFacility(state, "food_production").state;
  state.phase = "night";
  const resolved = resolveDay(state);
  assert.equal(resolved.resources.food, 46);
  assert.equal(resolved.resources.water, 56);
  assert.equal(resolved.actionPoints, resolved.maxActionPoints);
});

test("Save v6는 시설·평판·행동 포인트를 복원한다", () => {
  const built = buildFacility(createInitialGameState(), "water_purifier").state;
  const restored = restoreGameState(serializeGameState(built));
  assert.equal(restored.version, 6);
  assert.equal(restored.facilities.water_purifier, true);
  assert.equal(restored.reputations.community, 10);
  assert.equal(restored.actionPoints, 1);
});
