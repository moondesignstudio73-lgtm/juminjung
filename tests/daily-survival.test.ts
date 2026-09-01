import test from "node:test";
import assert from "node:assert/strict";
import {
  configureFoodRation,
  configurePowerCircuit,
  getActivePowerCircuits,
  getDailyObjectives,
  getPowerCapacity,
  getRationPlan,
} from "../game/daily-survival-manager.ts";
import { resolveDay } from "../game/day-manager.ts";
import { performHotelAction } from "../game/hotel-action-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";

test("새 게임은 하루 3 AP와 세 개의 기본 전력 회로로 시작한다", () => {
  const state = createInitialGameState();
  assert.deepEqual({ actionPoints: state.actionPoints, maxActionPoints: state.maxActionPoints }, { actionPoints: 3, maxActionPoints: 3 });
  assert.deepEqual(state.powerAllocation, ["SECURITY", "CLINIC", "KITCHEN"]);
  assert.equal(state.foodRationPolicy, "NORMAL");
});

test("낮 행동 세 번이 각각 1 AP를 소비하고 네 번째 행동은 막힌다", () => {
  let state = createInitialGameState();
  for (let index = 0; index < 3; index += 1) state = performHotelAction(state, "community_outreach").state;
  assert.equal(state.actionPoints, 0);
  const blocked = performHotelAction(state, "community_outreach");
  assert.equal(blocked.ok, false);
  assert.equal(blocked.state, state);
});

test("연료량은 3·2·1·0 회로 용량으로 변하고 마이크로그리드는 전체 용량을 복구한다", () => {
  assert.deepEqual([getPowerCapacity(20), getPowerCapacity(8), getPowerCapacity(1), getPowerCapacity(0), getPowerCapacity(0, true)], [3, 2, 1, 0, 3]);
});

test("전력 배분은 AP를 쓰지 않으며 현재 용량을 넘는 재가동을 거부한다", () => {
  const state = createInitialGameState();
  state.resources.fuel = 8;
  const clinicOff = configurePowerCircuit(state, "CLINIC", false);
  assert.equal(clinicOff.ok, true);
  assert.equal(clinicOff.state.actionPoints, 3);
  assert.deepEqual(getActivePowerCircuits(clinicOff.state), ["SECURITY", "KITCHEN"]);
  const rejected = configurePowerCircuit(clinicOff.state, "CLINIC", true);
  assert.equal(rejected.ok, false);
  assert.deepEqual(rejected.state.powerAllocation, ["SECURITY", "KITCHEN"]);
});

test("제한·극단 배급은 식량 절약과 Stress·Health 대가를 같은 규칙에서 계산한다", () => {
  assert.deepEqual(getRationPlan(10, "NORMAL"), { foodDemand: 10, stressDelta: -5, healthDelta: 0 });
  assert.deepEqual(getRationPlan(10, "LIMITED"), { foodDemand: 7, stressDelta: 5, healthDelta: 0 });
  assert.deepEqual(getRationPlan(10, "SEVERE"), { foodDemand: 4, stressDelta: 15, healthDelta: -3 });
});

test("정상 배급은 실제 야간 투숙객의 Stress를 낮추고 장부에 정책을 남긴다", () => {
  const state = createInitialGameState();
  state.day = 1;
  state.phase = "night";
  state.guests[0] = { ...state.guests[0], status: "STAYING", currentRoomNumber: 101, remainingNights: 2, stress: 30 };
  const resolved = resolveDay(state);
  assert.equal(resolved.guests[0].stress, 20);
  assert.equal(resolved.lastDaySummary?.foodRationPolicy, "NORMAL");
  assert.equal(resolved.lastDaySummary?.baseFoodDemand, 1);
});

test("주방·방호·진료 회로 정지는 식량, 위협, 치안, 환자 Health에 모두 반영된다", () => {
  const state = createInitialGameState();
  state.day = 2;
  state.phase = "night";
  state.powerAllocation = [];
  state.foodRationPolicy = "SEVERE";
  state.guests[0] = { ...state.guests[0], status: "STAYING", currentRoomNumber: 101, remainingNights: 2, infectionState: "INJURED", health: 70 };
  const beforeSecurity = state.hotelStats.security;
  const beforeThreat = Number(state.flags.monster_threat ?? 0);
  const resolved = resolveDay(state);
  assert.equal(resolved.lastDaySummary?.baseFoodDemand, 2);
  assert.equal(resolved.lastDaySummary?.consumed.food, 1);
  assert.equal(resolved.guests[0].health, 64);
  assert.equal(resolved.hotelStats.security, beforeSecurity - 4);
  assert.equal(Number(resolved.flags.monster_threat), beforeThreat + 3);
  assert.equal(resolved.lastDaySummary?.survivalWarnings?.length, 3);
});

test("저장 복원은 v14 전력 배분·배급 정책·남은 AP를 유지한다", () => {
  let state = createInitialGameState();
  state = configurePowerCircuit(state, "CLINIC", false).state;
  state = configureFoodRation(state, "SEVERE");
  state.actionPoints = 1;
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.version, 14);
  assert.equal(restored.foodRationPolicy, "SEVERE");
  assert.deepEqual(restored.powerAllocation, ["SECURITY", "KITCHEN"]);
  assert.equal(restored.actionPoints, 1);
});

test("v9의 하루 전체 AP 저장은 v14의 3 AP로 마이그레이션된다", () => {
  const legacy = JSON.parse(serializeGameState(createInitialGameState()));
  legacy.version = 9;
  legacy.actionPoints = 2;
  legacy.maxActionPoints = 2;
  delete legacy.foodRationPolicy;
  delete legacy.powerAllocation;
  const restored = restoreGameState(JSON.stringify(legacy));
  assert.deepEqual({ version: restored.version, actionPoints: restored.actionPoints, maxActionPoints: restored.maxActionPoints }, { version: 14, actionPoints: 3, maxActionPoints: 3 });
  assert.equal(restored.foodRationPolicy, "NORMAL");
});

test("v9에서 일부 사용한 AP는 v14 마이그레이션 후에도 그대로 유지된다", () => {
  const legacy = JSON.parse(serializeGameState(createInitialGameState()));
  legacy.version = 9;
  legacy.actionPoints = 1;
  legacy.maxActionPoints = 2;
  const restored = restoreGameState(JSON.stringify(legacy));
  assert.deepEqual({ actionPoints: restored.actionPoints, maxActionPoints: restored.maxActionPoints }, { actionPoints: 1, maxActionPoints: 3 });
});

test("긴급 문제는 식량·전력·위협·손상 상태에서 우선순위 순으로 파생된다", () => {
  const state = createInitialGameState();
  state.resources.food = 2;
  state.resources.fuel = 1;
  state.flags.monster_threat = 50;
  state.hotelStats.hotelCondition = 30;
  state.rooms[0] = { ...state.rooms[0], status: "DAMAGED", roomCondition: 20 };
  const objectives = getDailyObjectives(state);
  assert.ok(objectives.length <= 5);
  assert.equal(objectives.every((objective) => objective.priority === "URGENT"), true);
  assert.deepEqual(objectives.map((objective) => objective.id), ["food_shortage", "power_shortage", "monster_threat", "hotel_damage"]);
});

test("DAY 1~5 반복 정산은 AP와 계획을 복구하고 자원을 음수로 만들지 않는다", () => {
  let state = createInitialGameState();
  state.day = 1;
  for (let completedDay = 1; completedDay <= 5; completedDay += 1) {
    state.phase = "night";
    state = resolveDay(state);
    assert.equal(state.day, completedDay + 1);
    assert.equal(state.actionPoints, 3);
    assert.equal(state.lastDaySummary?.completedDay, completedDay);
    assert.deepEqual(state.lastDaySummary?.poweredCircuits, ["SECURITY", "CLINIC", "KITCHEN"]);
    for (const value of Object.values(state.resources)) assert.ok(value >= 0);
  }
});
