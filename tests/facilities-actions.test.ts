import test from "node:test";
import assert from "node:assert/strict";
import { resolveDay } from "../game/day-manager.ts";
import { buildFacility, canPerformHotelAction, getHotelActionDefinition, performHotelAction } from "../game/hotel-action-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";

test("시설 건설은 자원과 행동 포인트를 소비하고 효과와 로그를 남긴다", () => {
  const initial = createInitialGameState();
  const result = buildFacility(initial, "water_purifier");
  assert.equal(result.ok, true);
  assert.equal(result.state.facilities.water_purifier, 1);
  assert.equal(result.state.resources.parts, 2);
  assert.equal(result.state.hotelStats.waterSustainability, 1);
  assert.equal(result.state.actionPoints, 2);
  assert.ok(result.state.eventHistory.at(-1)?.message.includes("정수 시설"));
});

test("시설은 단계별 비용과 효과를 적용해 LV.3까지 업그레이드된다", () => {
  let state = createInitialGameState();
  state.resources = { ...state.resources, parts: 40, fuel: 40 };
  for (const level of [1, 2, 3]) {
    state.actionPoints = 1;
    const result = buildFacility(state, "water_purifier");
    assert.equal(result.ok, true);
    assert.equal(result.state.facilities.water_purifier, level);
    state = result.state;
  }
  state.actionPoints = 1;
  const maxed = buildFacility(state, "water_purifier");
  assert.equal(maxed.ok, false);
  assert.equal(maxed.message, "이미 최고 단계인 시설입니다.");
});

test("공동체 회의는 수용한 생존자의 Trust와 공동체 평판을 높인다", () => {
  const state = createInitialGameState();
  state.guests[0] = { ...state.guests[0], checkedInDay: 1, status: "STAYING" };
  const result = performHotelAction(state, "community_outreach");
  assert.equal(result.state.guests[0].trust, state.guests[0].trust + 5);
  assert.equal(result.state.reputations.community, 8);
  assert.equal(result.state.reputations.humanitarian, 5);
});

test("호텔 보수는 가장 심하게 손상되거나 봉쇄된 객실 하나를 실제 복구한다", () => {
  const state = createInitialGameState();
  state.rooms = state.rooms.map((room) => room.roomNumber === 207 ? { ...room, status: "LOCKED" as const, roomCondition: 55 } : room.roomNumber === 305 ? { ...room, status: "DAMAGED" as const, roomCondition: 30 } : room);
  const first = performHotelAction(state, "repair_hotel");
  assert.equal(first.ok, true);
  assert.equal(first.state.rooms.find((room) => room.roomNumber === 305)?.status, "EMPTY");
  assert.equal(first.state.rooms.find((room) => room.roomNumber === 305)?.roomCondition, 100);
  assert.equal(first.state.rooms.find((room) => room.roomNumber === 207)?.status, "LOCKED");
  assert.ok(first.state.eventHistory.at(-1)?.message.includes("305호 복구"));
  first.state.actionPoints = 1;
  const second = performHotelAction(first.state, "repair_hotel");
  assert.equal(second.state.rooms.find((room) => room.roomNumber === 207)?.status, "EMPTY");
});

test("호텔 보수는 지하 후퇴 뒤 남은 공성 피해 상태를 실제 복구한다", () => {
  const state = createInitialGameState();
  state.flags.hotel_siege_resolved = true;
  state.flags.hotel_siege_breached = true;
  const repaired = performHotelAction(state, "repair_hotel");
  assert.equal(repaired.ok, true);
  assert.equal(repaired.state.flags.hotel_siege_breached, false);
  assert.equal(repaired.state.flags.hotel_siege_damage_repaired, true);
  assert.match(repaired.message, /공성 피해 복구/);
  assert.match(repaired.state.eventHistory.at(-1)?.message ?? "", /공성 피해 복구/);
});

test("교역 원정은 연료를 자원과 부품으로 교환해 추가 시설 건설을 가능하게 한다", () => {
  const state = createInitialGameState();
  state.reputations.humanitarian = 5;
  const result = performHotelAction(state, "trade_run");
  assert.equal(result.state.resources.fuel, state.resources.fuel - 2);
  assert.equal(result.state.resources.parts, state.resources.parts + 1);
  assert.equal(result.state.reputations.merchant, 6);
  assert.equal(result.state.reputations.humanitarian, 3);
});

test("Jack의 공정 거래소는 표시·감당 가능 여부·정산을 같은 연료 1 계약으로 바꾼다", () => {
  const state = createInitialGameState();
  state.flags.jack_fair_market = true;
  state.resources.fuel = 1;
  state.reputations.humanitarian = 11;
  const action = getHotelActionDefinition(state, "trade_run");
  assert.equal(action.name, "공정 교역 원정");
  assert.deepEqual(action.cost, { fuel: 1 });
  assert.equal(action.reputation?.humanitarian, 0);
  assert.equal(canPerformHotelAction(state, "trade_run"), true);
  const result = performHotelAction(state, "trade_run");
  assert.equal(result.ok, true);
  assert.equal(result.state.resources.fuel, 0);
  assert.equal(result.state.resources.food, state.resources.food + 4);
  assert.equal(result.state.reputations.merchant, 6);
  assert.equal(result.state.reputations.humanitarian, 11);
  assert.match(result.state.eventHistory.at(-1)?.message ?? "", /공정 교역 원정/);
});

test("일반 교역은 연료 1에서 실행되지 않고 공정 거래소 효과를 추측 적용하지 않는다", () => {
  const state = createInitialGameState();
  state.resources.fuel = 1;
  assert.equal(getHotelActionDefinition(state, "trade_run").name, "교역 원정");
  assert.equal(canPerformHotelAction(state, "trade_run"), false);
  const result = performHotelAction(state, "trade_run");
  assert.equal(result.ok, false);
  assert.equal(result.state, state);
});

test("저장 복원 뒤에도 Jack의 공정 교역 계약이 유지된다", () => {
  const state = createInitialGameState();
  state.flags.jack_fair_market = true;
  state.resources.fuel = 1;
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(getHotelActionDefinition(restored, "trade_run").cost.fuel, 1);
  assert.equal(canPerformHotelAction(restored, "trade_run"), true);
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

test("Save v11은 시설·평판·행동 포인트를 복원한다", () => {
  const built = buildFacility(createInitialGameState(), "water_purifier").state;
  const restored = restoreGameState(serializeGameState(built));
  assert.equal(restored.version, 11);
  assert.equal(restored.facilities.water_purifier, 1);
  assert.equal(restored.reputations.community, 10);
  assert.equal(restored.actionPoints, 2);
});

test("LV.2 정수 시설은 매일 유지비를 지불하고 단계 생산량을 제공한다", () => {
  let state = createInitialGameState();
  state.resources.parts = 20;
  state = buildFacility(state, "water_purifier").state;
  state.actionPoints = 1;
  state = buildFacility(state, "water_purifier").state;
  state.phase = "night";
  const resolved = resolveDay(state);
  assert.equal(resolved.resources.water, 58);
  assert.equal(resolved.resources.fuel, 53);
  assert.deepEqual(resolved.lastDaySummary?.facilityProduction, { water: 4 });
  assert.deepEqual(resolved.lastDaySummary?.facilityUpkeep, { fuel: 1 });
});

test("마이크로그리드는 시설 자체의 연료 유지비까지 면제하지 않는다", () => {
  const state = createInitialGameState();
  state.flags.generator_network_stable = true;
  state.facilities.water_purifier = 2;
  state.resources.fuel = 10;
  state.phase = "night";
  const resolved = resolveDay(state);
  assert.equal(resolved.resources.fuel, 9);
  assert.deepEqual(resolved.lastDaySummary?.consumed, { food: 0, water: 0, fuel: 0 });
  assert.deepEqual(resolved.lastDaySummary?.facilityUpkeep, { fuel: 1 });
  assert.deepEqual(resolved.lastDaySummary?.facilityProduction, { water: 4 });
});

test("연료 0의 마이크로그리드는 기본망만 절감하고 연료 시설은 안전하게 중단한다", () => {
  const state = createInitialGameState();
  state.flags.generator_network_stable = true;
  state.facilities.water_purifier = 2;
  state.resources.fuel = 0;
  state.phase = "night";
  const resolved = resolveDay(state);
  assert.equal(resolved.resources.fuel, 0);
  assert.deepEqual(resolved.lastDaySummary?.consumed, { food: 0, water: 0, fuel: 0 });
  assert.deepEqual(resolved.lastDaySummary?.facilityProduction, {});
  assert.deepEqual(resolved.lastDaySummary?.inactiveFacilities, ["water_purifier"]);
  assert.ok(resolved.eventHistory.some((entry) => entry.message === "독립 마이크로그리드 · 기본 발전기 연료 1 절감"));
  assert.ok(resolved.eventHistory.some((entry) => entry.message.includes("유지비 부족")));
});

test("LV.2 교역망은 식량과 물을 부품·연료로 바꿔 장기 회복 경로를 만든다", () => {
  const state = createInitialGameState();
  state.facilities.trade_network = 2;
  state.resources = { food: 10, water: 10, medicine: 0, fuel: 0, parts: 0, security: 0 };
  state.phase = "night";
  const resolved = resolveDay(state);
  assert.equal(resolved.resources.food, 9);
  assert.equal(resolved.resources.water, 9);
  assert.equal(resolved.resources.fuel, 1);
  assert.equal(resolved.resources.parts, 2);
});

test("유지비가 부족한 시설은 생산하지 않고 아침 장부에 중단 상태를 남긴다", () => {
  const state = createInitialGameState();
  state.facilities.water_purifier = 2;
  state.resources.fuel = 0;
  state.phase = "night";
  const resolved = resolveDay(state);
  assert.equal(resolved.resources.water, state.resources.water);
  assert.deepEqual(resolved.lastDaySummary?.inactiveFacilities, ["water_purifier"]);
  assert.ok(resolved.eventHistory.some((entry) => entry.message.includes("정수 시설 가동 중단")));
});

test("아침 장부의 소비량은 수요가 아니라 실제로 차감된 자원을 기록한다", () => {
  const state = createInitialGameState();
  state.guests = state.guests.map((guest, index) => index < 2 ? { ...guest, status: "STAYING" as const, currentRoomNumber: 101 + index, remainingNights: 2 } : guest);
  state.resources.food = 1;
  state.resources.water = 0;
  state.resources.fuel = 0;
  state.phase = "night";
  const resolved = resolveDay(state);
  assert.deepEqual(resolved.lastDaySummary?.consumed, { food: 1, water: 0, fuel: 0 });
});

test("시설 정산은 배열 순서와 무관하게 같은 날 생산물로 다른 시설 유지비를 내지 않는다", () => {
  const state = createInitialGameState();
  state.facilities = { water_purifier: 2, armory: 2, trade_network: 2 };
  state.resources = { food: 10, water: 10, medicine: 0, fuel: 1, parts: 0, security: 0 };
  state.phase = "night";
  const resolved = resolveDay(state);
  assert.deepEqual(resolved.lastDaySummary?.inactiveFacilities, ["water_purifier", "armory"]);
  assert.deepEqual(resolved.lastDaySummary?.facilityProduction, { parts: 2, fuel: 1 });
  assert.equal(resolved.resources.fuel, 1);
});

test("구버전 boolean 시설 저장은 LV.1 숫자로 마이그레이션된다", () => {
  const legacy = JSON.parse(serializeGameState(createInitialGameState()));
  legacy.facilities = { water_purifier: true, armory: false };
  const restored = restoreGameState(JSON.stringify(legacy));
  assert.equal(restored.facilities.water_purifier, 1);
  assert.equal(restored.facilities.armory, undefined);
});

test("손상된 시설 레벨과 알 수 없는 키는 안전한 정수 단계만 남기고 제거한다", () => {
  const corrupted = JSON.parse(serializeGameState(createInitialGameState()));
  corrupted.facilities = { water_purifier: 2.9, food_production: "Infinity", armory: {}, unknown_lab: 3 };
  const restored = restoreGameState(JSON.stringify(corrupted));
  assert.deepEqual(restored.facilities, { water_purifier: 2 });
});

test("최고 단계 기반 시설은 상시 투숙객 4명을 30일간 유지한다", () => {
  let state = createInitialGameState();
  state.day = 1;
  state.facilities = { water_purifier: 3, food_production: 3, armory: 3, trade_network: 3 };
  state.resources = { food: 20, water: 20, medicine: 10, fuel: 20, parts: 5, security: 20 };
  for (let day = 0; day < 30; day += 1) {
    state.guests = state.guests.map((guest, index) => index < 4 ? { ...guest, status: "STAYING" as const, currentRoomNumber: 101 + index, remainingNights: 2, checkedInDay: guest.checkedInDay ?? 1 } : guest);
    state.phase = "night";
    state = resolveDay(state);
    for (const value of Object.values(state.resources)) assert.ok(value >= 0);
    assert.deepEqual(state.lastDaySummary?.inactiveFacilities, []);
  }
  assert.equal(state.day, 31);
  assert.ok(state.resources.food > 20);
  assert.ok(state.resources.water >= 20);
  assert.ok(state.resources.parts > 5);
  assert.ok(state.resources.fuel > 0);
});
