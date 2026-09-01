import assert from "node:assert/strict";
import test from "node:test";
import { resolveAuraNight } from "../game/aura-night-manager.ts";
import { resolveDay } from "../game/day-manager.ts";
import { applyMonsterKnowledgeSource } from "../game/monster-codex-manager.ts";
import { DEFAULT_NIGHT_PREPARATION, NIGHT_PREPARATION_OPTIONS } from "../game/night-preparation-data.ts";
import { CODEX_EXTERIOR_LIGHT_THREAT_REDUCTION, configureNightPreparation, getNightPreparationPlan, normalizeNightPreparation } from "../game/night-preparation-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import type { GameState, NightPreparationCategory } from "../game/types.ts";

const categories: NightPreparationCategory[] = ["PATROL", "ISOLATION", "EXTERIOR_LIGHT", "NOISE"];

function createOccupiedNight(): GameState {
  const state = createInitialGameState();
  state.day = 1;
  state.phase = "night";
  state.worldState = "STABLE";
  state.resources.fuel = 20;
  state.hotelStats.crime = 10;
  state.flags.monster_threat = 20;
  state.selectedNightEventId = "quiet_watch";
  state.selectedNightChoiceId = "rest";
  state.guests[0] = { ...state.guests[0], status: "STAYING", currentRoomNumber: 101, remainingNights: 2 };
  state.rooms[0] = { ...state.rooms[0], occupied: true, guestId: state.guests[0].id, status: "OCCUPIED" };
  return state;
}

function configureDefensivePlan(state: GameState): GameState {
  state = configureNightPreparation(state, "PATROL", "ROVING_PATROL").state;
  state = configureNightPreparation(state, "ISOLATION", "SEALED_WINGS").state;
  state = configureNightPreparation(state, "EXTERIOR_LIGHT", "EXTERIOR_LIGHTS").state;
  return configureNightPreparation(state, "NOISE", "SILENCE_PROTOCOL").state;
}

test("야간 준비 데이터는 네 범주마다 기본안과 강화안을 하나씩 가진다", () => {
  assert.equal(new Set(NIGHT_PREPARATION_OPTIONS.map((option) => option.id)).size, NIGHT_PREPARATION_OPTIONS.length);
  for (const category of categories) {
    const options = NIGHT_PREPARATION_OPTIONS.filter((option) => option.category === category);
    assert.equal(options.length, 2);
    assert.ok(options.some((option) => option.id === DEFAULT_NIGHT_PREPARATION[category]));
  }
});

test("정책 설정은 범주가 맞는 데이터만 허용한다", () => {
  const state = createInitialGameState();
  const accepted = configureNightPreparation(state, "PATROL", "ROVING_PATROL");
  assert.equal(accepted.ok, true);
  assert.equal(accepted.state.nightPreparation.PATROL, "ROVING_PATROL");
  const rejected = configureNightPreparation(accepted.state, "PATROL", "SEALED_WINGS");
  assert.equal(rejected.ok, false);
  assert.equal(rejected.state, accepted.state);
});

test("강화 정책 미리보기는 순찰·격리·조명·정숙의 비용과 효과를 합산한다", () => {
  const state = configureDefensivePlan(createOccupiedNight());
  const plan = getNightPreparationPlan(state);
  assert.deepEqual(plan.active.map((option) => option.id), ["ROVING_PATROL", "SEALED_WINGS", "EXTERIOR_LIGHTS", "SILENCE_PROTOCOL"]);
  assert.deepEqual({ fuel: plan.fuelCost, security: plan.securityDelta, crime: plan.crimeDelta, threat: plan.threatDelta, stress: plan.guestStressDelta, disease: plan.diseaseChanceDelta }, { fuel: 1, security: 5, crime: -2, threat: -7, stress: 10, disease: -8 });
  assert.equal(plan.codexApplied, false);
  assert.deepEqual(plan.warnings, []);
});

test("외곽 조명은 방호 회로나 발전기 여유가 없으면 효과와 연료 비용에서 제외된다", () => {
  let state = configureNightPreparation(createOccupiedNight(), "EXTERIOR_LIGHT", "EXTERIOR_LIGHTS").state;
  state.powerAllocation = ["CLINIC", "KITCHEN"];
  let plan = getNightPreparationPlan(state);
  assert.equal(plan.active.some((option) => option.id === "EXTERIOR_LIGHTS"), false);
  assert.equal(plan.fuelCost, 0);
  assert.match(plan.warnings[0], /SECURITY/);
  state.powerAllocation = ["SECURITY"];
  state.resources.fuel = 1;
  plan = getNightPreparationPlan(state);
  assert.equal(plan.active.some((option) => option.id === "EXTERIOR_LIGHTS"), false);
  assert.match(plan.warnings[0], /연료/);
});

test("정산이 넘긴 전력 계획은 야간 준비의 연료 예약에 그대로 사용된다", () => {
  const state = configureNightPreparation(createOccupiedNight(), "EXTERIOR_LIGHT", "EXTERIOR_LIGHTS").state;
  state.resources.fuel = 1;
  const recomputed = getNightPreparationPlan(state);
  const authoritative = getNightPreparationPlan(state, { activeCircuits: ["SECURITY"], fuelDemand: 0 });
  assert.equal(recomputed.active.some((option) => option.id === "EXTERIOR_LIGHTS"), false);
  assert.equal(authoritative.active.some((option) => option.id === "EXTERIOR_LIGHTS"), true);
  assert.equal(authoritative.fuelCost, 1);
});

test("Mimic Stalker 대응 지식은 가동 중인 외곽 조명의 위협 감소만 강화한다", () => {
  let state = configureNightPreparation(createOccupiedNight(), "EXTERIOR_LIGHT", "EXTERIOR_LIGHTS").state;
  const ordinaryThreat = getNightPreparationPlan(state).threatDelta;
  state = applyMonsterKnowledgeSource(state, "RUTH_SCRATCH_CONTRADICTION");
  state = applyMonsterKnowledgeSource(state, "ROOM_207_MONSTER_CONCLUSION");
  const informed = getNightPreparationPlan(state);
  assert.equal(informed.codexApplied, true);
  assert.equal(informed.threatDelta, ordinaryThreat - CODEX_EXTERIOR_LIGHT_THREAT_REDUCTION);
  state = configureNightPreparation(state, "EXTERIOR_LIGHT", "DARK_PERIMETER").state;
  assert.equal(getNightPreparationPlan(state).codexApplied, false);
});

test("구역 격리의 질병 확률 보정은 같은 밤 판정에서 감염을 예방한다", () => {
  const state = createOccupiedNight();
  const guest = state.guests[0];
  let targetDay = 1;
  while (!resolveAuraNight(state.rooms, state.guests, targetDay, "STABLE", 8).sickGuestIds.includes(guest.id) && targetDay < 101) targetDay += 1;
  assert.ok(targetDay < 101);
  const isolated = resolveAuraNight(state.rooms, state.guests, targetDay, "STABLE", 8, {}, -8);
  assert.equal(isolated.sickGuestIds.includes(guest.id), false);
});

test("야간 정산은 준비 정책의 연료·호텔 수치·위협·스트레스를 같은 계획에서 적용하고 기록한다", () => {
  const baseline = resolveDay(createOccupiedNight());
  const prepared = resolveDay(configureDefensivePlan(createOccupiedNight()));
  assert.equal(prepared.lastDaySummary?.consumed.fuel, (baseline.lastDaySummary?.consumed.fuel ?? 0) + 1);
  assert.equal(prepared.hotelStats.security, baseline.hotelStats.security + 5);
  assert.equal(prepared.hotelStats.crime, baseline.hotelStats.crime - 2);
  assert.equal(Number(prepared.flags.monster_threat), Number(baseline.flags.monster_threat) - 7);
  assert.equal(prepared.guests[0].stress, baseline.guests[0].stress + 10);
  assert.deepEqual(prepared.lastDaySummary?.nightPreparationOptionIds, ["ROVING_PATROL", "SEALED_WINGS", "EXTERIOR_LIGHTS", "SILENCE_PROTOCOL"]);
  assert.ok(prepared.eventHistory.some((entry) => entry.message.includes("야간 준비 · 순환 순찰 · 구역 격리 · 외곽 조명 · 완전 정숙")));
});

test("Save v15는 야간 정책을 보존하고 v14에는 안전한 기본 정책을 준다", () => {
  const configured = configureDefensivePlan(createInitialGameState());
  const restored = restoreGameState(serializeGameState(configured));
  assert.equal(restored.version, 15);
  assert.deepEqual(restored.nightPreparation, configured.nightPreparation);
  const legacy = JSON.parse(serializeGameState(configured));
  legacy.version = 14;
  delete legacy.nightPreparation;
  assert.deepEqual(restoreGameState(JSON.stringify(legacy)).nightPreparation, DEFAULT_NIGHT_PREPARATION);
});

test("저장 복원은 잘못된 범주 옵션만 기본값으로 복구한다", () => {
  const normalized = normalizeNightPreparation({ PATROL: "SEALED_WINGS", ISOLATION: "SEALED_WINGS", EXTERIOR_LIGHT: "missing", NOISE: "SILENCE_PROTOCOL" });
  assert.deepEqual(normalized, { PATROL: "STANDARD_WATCH", ISOLATION: "SEALED_WINGS", EXTERIOR_LIGHT: "DARK_PERIMETER", NOISE: "SILENCE_PROTOCOL" });
});
