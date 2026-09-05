import test from "node:test";
import assert from "node:assert/strict";
import {
  applySurvivalGuestEffects,
  configureFoodRation,
  configurePowerCircuit,
  getActivePowerCircuits,
  getDailyObjectives,
  getPowerCapacity,
  getRationPlan,
  getResidentRationEffects,
  RATION_POLICIES,
} from "../game/daily-survival-manager.ts";
import { isVulnerableResident } from "../game/resident-vulnerability.ts";
import { resolveDay } from "../game/day-manager.ts";
import { performHotelAction } from "../game/hotel-action-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { getNpcUpkeep } from "../game/npc-upkeep.ts";

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

test("취약 주민 판정은 돌봄·가족 구역·우선 배급이 공유하는 한 기준을 사용한다", () => {
  const state = createInitialGameState();
  const mia = state.guests.find((guest) => guest.id === "mia")!;
  const walter = state.guests.find((guest) => guest.id === "walter")!;
  assert.equal(isVulnerableResident(mia), true);
  assert.equal(isVulnerableResident({ ...walter, age: 70, health: 100, infectionState: "HEALTHY", baseTraits: [] }), true);
  assert.equal(isVulnerableResident({ ...walter, age: 45, health: 79, infectionState: "HEALTHY", baseTraits: [] }), true);
  assert.equal(isVulnerableResident({ ...walter, age: 45, health: 100, infectionState: "SICK", baseTraits: [] }), true);
  assert.equal(isVulnerableResident({ ...walter, age: 45, health: 100, infectionState: "HEALTHY", baseTraits: ["Pregnant"] }), true);
  assert.equal(isVulnerableResident({ ...walter, age: 45, health: 100, infectionState: "HEALTHY", baseTraits: [] }), false);
});

test("보호 원칙은 취약 주민의 제한·극단 배급 피해만 줄이고 정상 배급과 일반 주민은 바꾸지 않는다", () => {
  const state = createInitialGameState();
  const mia = { ...state.guests.find((guest) => guest.id === "mia")!, health: 80, stress: 30, infectionState: "HEALTHY" as const };
  const walter = { ...state.guests.find((guest) => guest.id === "walter")!, age: 45, health: 80, stress: 30, infectionState: "HEALTHY" as const, baseTraits: [] };
  assert.deepEqual(getResidentRationEffects(mia, getRationPlan(2, "LIMITED"), true), { stressDelta: 2, healthDelta: 0, protected: true });
  assert.deepEqual(getResidentRationEffects(mia, getRationPlan(2, "SEVERE"), true), { stressDelta: 8, healthDelta: 0, protected: true });
  assert.deepEqual(getResidentRationEffects(mia, getRationPlan(2, "NORMAL"), true), { stressDelta: -5, healthDelta: 0, protected: false });
  assert.deepEqual(getResidentRationEffects(walter, getRationPlan(2, "SEVERE"), true), { stressDelta: 15, healthDelta: -3, protected: false });
  assert.deepEqual({ stress: applySurvivalGuestEffects(mia, getRationPlan(2, "SEVERE"), true, true).stress, health: applySurvivalGuestEffects(mia, getRationPlan(2, "SEVERE"), true, true).health }, { stress: 38, health: 80 });
  assert.match(RATION_POLICIES.find((policy) => policy.id === "SEVERE")!.description, /취약 주민 \+8 · Health 보호/);
});

test("수치 하한·상한 때문에 실제 차이가 없으면 취약 주민 보호 수혜를 기록하지 않는다", () => {
  const state = createInitialGameState();
  state.day = 2;
  state.phase = "night";
  state.foodRationPolicy = "SEVERE";
  state.flags.vulnerable_survivors_protected = true;
  state.rooms = state.rooms.map((room) => room.roomNumber === 101 ? { ...room, permanentEffects: [...room.permanentEffects, { id: "test-recovery", sourceGuestId: "hotel", name: "Recovery", metric: "injuryRecovery" as const, diseaseType: "INJURY" as const, operation: "ADD" as const, value: 10 }] } : room);
  state.guests = state.guests.map((guest) => guest.id === "mia" ? { ...guest, status: "STAYING" as const, currentRoomNumber: 101, checkedInDay: 1, remainingNights: 2, health: 99, stress: 100, infectionState: "HEALTHY" as const, aura: null } : guest);
  const resolved = resolveDay(state);
  assert.deepEqual(resolved.lastDaySummary?.priorityRationGuestIds, []);
  assert.equal(resolved.eventHistory.some((entry) => entry.message.startsWith("취약 주민 우선 배급")), false);
});

test("정상 배급은 실제 야간 투숙객의 Stress를 낮추고 장부에 정책을 남긴다", () => {
  const state = createInitialGameState();
  state.day = 1;
  state.phase = "night";
  state.guests[0] = { ...state.guests[0], status: "STAYING", currentRoomNumber: 101, remainingNights: 2, stress: 30 };
  const expectedFood = getNpcUpkeep(state.guests[0]).food;
  const resolved = resolveDay(state);
  assert.equal(resolved.guests[0].stress, 20);
  assert.equal(resolved.lastDaySummary?.foodRationPolicy, "NORMAL");
  assert.equal(resolved.lastDaySummary?.baseFoodDemand, expectedFood);
});

test("주방·방호·진료 회로 정지는 식량, 위협, 치안, 환자 Health에 모두 반영된다", () => {
  const state = createInitialGameState();
  state.day = 2;
  state.phase = "night";
  state.powerAllocation = [];
  state.foodRationPolicy = "SEVERE";
  state.guests[0] = { ...state.guests[0], status: "STAYING", currentRoomNumber: 101, remainingNights: 2, infectionState: "INJURED", health: 70 };
  const expectedBaseFood = Math.round((getNpcUpkeep(state.guests[0]).food + 1) * 10) / 10;
  const expectedConsumedFood = Math.round(expectedBaseFood * .4 * 10) / 10;
  const beforeSecurity = state.hotelStats.security;
  const beforeThreat = Number(state.flags.monster_threat ?? 0);
  const resolved = resolveDay(state);
  assert.equal(resolved.lastDaySummary?.baseFoodDemand, expectedBaseFood);
  assert.equal(resolved.lastDaySummary?.consumed.food, expectedConsumedFood);
  assert.equal(resolved.guests[0].health, 64);
  assert.equal(resolved.hotelStats.security, beforeSecurity - 4);
  assert.equal(Number(resolved.flags.monster_threat), beforeThreat + 3);
  assert.equal(resolved.lastDaySummary?.survivalWarnings?.length, 3);
});

test("저장 복원은 v15 전력 배분·배급 정책·남은 AP를 유지한다", () => {
  let state = createInitialGameState();
  state = configurePowerCircuit(state, "CLINIC", false).state;
  state = configureFoodRation(state, "SEVERE");
  state.actionPoints = 1;
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.version, 15);
  assert.equal(restored.foodRationPolicy, "SEVERE");
  assert.deepEqual(restored.powerAllocation, ["SECURITY", "KITCHEN"]);
  assert.equal(restored.actionPoints, 1);
});

test("v9의 하루 전체 AP 저장은 v15의 3 AP로 마이그레이션된다", () => {
  const legacy = JSON.parse(serializeGameState(createInitialGameState()));
  legacy.version = 9;
  legacy.actionPoints = 2;
  legacy.maxActionPoints = 2;
  delete legacy.foodRationPolicy;
  delete legacy.powerAllocation;
  const restored = restoreGameState(JSON.stringify(legacy));
  assert.deepEqual({ version: restored.version, actionPoints: restored.actionPoints, maxActionPoints: restored.maxActionPoints }, { version: 15, actionPoints: 3, maxActionPoints: 3 });
  assert.equal(restored.foodRationPolicy, "NORMAL");
});

test("v9에서 일부 사용한 AP는 v15 마이그레이션 후에도 그대로 유지된다", () => {
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
