import test from "node:test";
import assert from "node:assert/strict";
import { resolveDay } from "../game/day-manager.ts";
import { applyNightChoice, canChooseNightChoice, selectNightEvent } from "../game/night-event-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";

function withGuest() {
  const state = createInitialGameState();
  state.day = 12;
  state.guests[0] = { ...state.guests[0], status: "STAYING", currentRoomNumber: 301, checkedInDay: 1 };
  return state;
}

test("식량이 투숙객 수보다 적으면 배급실 사건이 선택된다", () => {
  const state = withGuest();
  state.resources.food = 0;
  assert.equal(selectNightEvent(state).id, "food_shortage");
});

test("낮은 연료는 발전기 고장 사건을 발생시킨다", () => {
  const state = createInitialGameState();
  state.resources.fuel = 10;
  assert.equal(selectNightEvent(state).id, "generator_failure");
});

test("보유 자원이 부족한 야간 선택지는 비활성화된다", () => {
  const state = createInitialGameState();
  state.resources.fuel = 1;
  const event = selectNightEvent(state);
  const reserve = event.choices.find((choice) => choice.id === "reserve")!;
  assert.equal(canChooseNightChoice(state, reserve), false);
});

test("붕괴 단계의 높은 위협과 낮은 Security는 철문 침입 사건을 우선한다", () => {
  const state = withGuest();
  state.worldState = "COLLAPSE";
  state.flags.monster_threat = 25;
  state.hotelStats.security = 50;
  assert.equal(selectNightEvent(state).id, "perimeter_breach");
});

test("피난민을 받아들이면 자원을 소비하고 평판·위협·플래그가 변한다", () => {
  const state = createInitialGameState();
  state.day = 8;
  state.worldState = "UNREST";
  const result = applyNightChoice(state, "refugee_wave", "shelter");
  assert.equal(result.event.id, "refugee_wave");
  assert.equal(result.state.resources.food, state.resources.food - 4);
  assert.equal(result.state.reputations.refugee, 8);
  assert.equal(result.state.flags.refugees_sheltered, true);
  assert.equal(result.state.flags.monster_threat, 4);
});

test("야간 선택은 정산 로그와 마지막 사건으로 저장되고 임시 선택은 초기화된다", () => {
  const state = createInitialGameState();
  state.phase = "night";
  state.selectedNightEventId = "quiet_watch";
  state.selectedNightChoiceId = "rest";
  const resolved = resolveDay(state);
  assert.equal(resolved.lastNightEventId, "quiet_watch");
  assert.equal(resolved.selectedNightEventId, null);
  assert.equal(resolved.selectedNightChoiceId, null);
  assert.ok(resolved.eventHistory.some((entry) => entry.message.includes("긴 복도, 짧은 밤")));
});

test("Save v8은 선택 중인 야간 사건과 선택지를 복원한다", () => {
  const state = createInitialGameState();
  state.selectedNightEventId = "quiet_watch";
  state.selectedNightChoiceId = "patrol";
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.version, 8);
  assert.equal(restored.selectedNightEventId, "quiet_watch");
  assert.equal(restored.selectedNightChoiceId, "patrol");
});
