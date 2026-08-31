import test from "node:test";
import assert from "node:assert/strict";
import { ENDING_CONDITIONS } from "../game/ending-data.ts";
import { ENDING_NARRATIVES } from "../game/ending-narrative-data.ts";
import { advanceEnding, evaluateEndings, leaveEnding, startEnding } from "../game/ending-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { determineWorldState } from "../game/world-state-manager.ts";

test("7개 엔딩 경로가 고유 ID를 가진 데이터로 등록된다", () => {
  assert.equal(ENDING_CONDITIONS.length, 7);
  assert.equal(new Set(ENDING_CONDITIONS.map((ending) => ending.endingId)).size, 7);
});

test("7개 엔딩은 각각 고유한 3막 최종 사건과 에필로그를 가진다", () => {
  assert.equal(ENDING_NARRATIVES.length, 7);
  assert.deepEqual(new Set(ENDING_NARRATIVES.map((ending) => ending.endingId)), new Set(ENDING_CONDITIONS.map((ending) => ending.endingId)));
  for (const narrative of ENDING_NARRATIVES) {
    assert.equal(narrative.scenes.length, 3);
    assert.equal(new Set(narrative.scenes.map((scene) => scene.id)).size, 3);
    assert.ok(narrative.scenes.every((scene) => scene.title && scene.body && scene.quote));
  }
});

test("THE TRUTH 엔딩은 지하 기록실 전용 원화와 대체 텍스트를 데이터에서 제공한다", () => {
  const truth = ENDING_NARRATIVES.find((narrative) => narrative.endingId === "THE_TRUTH")!;
  assert.equal(truth.image, "/juminjung/assets/cutscenes/ending-the-truth-v1.png");
  assert.match(truth.imageAlt ?? "", /Lily.*Vale.*지하 기록실/);
});

test("숨겨진 THE DOOR 엔딩은 0호실 전용 원화와 대체 텍스트를 데이터에서 제공한다", () => {
  const door = ENDING_NARRATIVES.find((narrative) => narrative.endingId === "THE_DOOR")!;
  assert.equal(door.image, "/juminjung/assets/cutscenes/ending-the-door-v2.png");
  assert.match(door.imageAlt ?? "", /0호실.*생존자.*비인간적 형체/);
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

test("구버전 DAY 30 ending 저장은 v9 report로 복원되어 즉시 종료되지 않는다", () => {
  const old = JSON.parse(serializeGameState(createInitialGameState()));
  old.version = 4;
  old.day = 30;
  old.phase = "ending";
  delete old.activeEndingId;
  const restored = restoreGameState(JSON.stringify(old));
  assert.equal(restored.version, 9);
  assert.equal(restored.phase, "report");
  assert.equal(restored.day, 30);
});

test("AVAILABLE 경로만 최종 사건을 시작할 수 있다", () => {
  const state = createInitialGameState();
  assert.throws(() => startEnding(state, "HOME"), /시작할 수 없는 엔딩/);
  state.availableEndings = ["HOME"];
  const started = startEnding(state, "HOME");
  assert.equal(started.phase, "ending");
  assert.equal(started.activeEndingId, "HOME");
  assert.equal(started.endingSceneIndex, 0);
});

test("최종 사건은 세 장면을 모두 진행한 뒤에만 완료되고 호텔 로그에 남는다", () => {
  const state = createInitialGameState();
  state.day = 24;
  state.availableEndings = ["SAFE_HAVEN"];
  const first = startEnding(state, "SAFE_HAVEN");
  const second = advanceEnding(first);
  assert.equal(second.endingSceneIndex, 1);
  assert.equal(second.completedEndingFlags.includes("SAFE_HAVEN"), false);
  const third = advanceEnding(second);
  assert.equal(third.endingSceneIndex, 2);
  const completed = advanceEnding(third);
  assert.equal(completed.phase, "report");
  assert.equal(completed.activeEndingId, null);
  assert.ok(completed.completedEndingFlags.includes("SAFE_HAVEN"));
  assert.equal(completed.endingProgress.SAFE_HAVEN, "COMPLETED");
  assert.ok(completed.eventHistory.at(-1)?.message.includes("SAFE HAVEN"));
});

test("SAFE HAVEN 엔딩은 공동체 로비 전용 원화와 대체 텍스트를 데이터에서 제공한다", () => {
  const safeHaven = ENDING_NARRATIVES.find((narrative) => narrative.endingId === "SAFE_HAVEN");
  assert.equal(safeHaven?.image, "/juminjung/assets/cutscenes/ending-safe-haven-v1.png");
  assert.match(safeHaven?.imageAlt ?? "", /JUJU HOTEL.*공동 장부.*물통.*여행자.*새벽빛/);
});

test("FORTRESS 엔딩은 공성 종료 전용 원화와 대체 텍스트를 데이터에서 제공한다", () => {
  const fortress = ENDING_NARRATIVES.find((narrative) => narrative.endingId === "FORTRESS");
  assert.equal(fortress?.image, "/juminjung/assets/cutscenes/ending-fortress-v1.png");
  assert.match(fortress?.imageAlt ?? "", /철문.*계단참.*정체 모를 형체.*명부.*빈 탄약 상자.*구조 신호.*두 황동 열쇠/);
});

test("HOME 엔딩은 돌아온 공동체의 긴 식탁 전용 원화와 대체 텍스트를 데이터에서 제공한다", () => {
  const home = ENDING_NARRATIVES.find((narrative) => narrative.endingId === "HOME");
  assert.equal(home?.image, "/juminjung/assets/cutscenes/ending-home-v1.png");
  assert.match(home?.imageAlt ?? "", /첫 비.*Ruth.*약병.*Rosa.*Mia.*조리대.*두 냄비.*돌아온 손님.*긴 식탁.*새 방문자/);
});

test("MILITARY OCCUPATION 엔딩은 호텔 인계 전용 원화와 대체 텍스트를 데이터에서 제공한다", () => {
  const occupation = ENDING_NARRATIVES.find((narrative) => narrative.endingId === "MILITARY_OCCUPATION");
  assert.equal(occupation?.image, "/juminjung/assets/cutscenes/ending-military-occupation-v1.png");
  assert.match(occupation?.imageAlt ?? "", /Hayes.*인계 명령서.*마스터키.*황동 이름표.*통행 등급표.*군용차.*입장을 거부/);
});

test("최종 사건을 중단하면 진행을 완료 처리하지 않고 운영 장부로 돌아간다", () => {
  const state = createInitialGameState();
  state.availableEndings = ["THE_TRUTH"];
  const reading = advanceEnding(startEnding(state, "THE_TRUTH"));
  const returned = leaveEnding(reading);
  assert.equal(returned.phase, "report");
  assert.equal(returned.activeEndingId, null);
  assert.equal(returned.endingSceneIndex, 0);
  assert.equal(returned.completedEndingFlags.length, 0);
});

test("저장 복원은 읽는 중인 엔딩 장면 위치를 유지한다", () => {
  const state = createInitialGameState();
  state.availableEndings = ["THE_DOOR"];
  const reading = advanceEnding(startEnding(state, "THE_DOOR"));
  const restored = restoreGameState(serializeGameState(reading));
  assert.equal(restored.phase, "ending");
  assert.equal(restored.activeEndingId, "THE_DOOR");
  assert.equal(restored.endingSceneIndex, 1);
});

test("저장 복원은 범위를 벗어난 엔딩 장면을 마지막 장면으로 정규화한다", () => {
  const state = createInitialGameState();
  state.availableEndings = ["HOME"];
  const raw = JSON.parse(serializeGameState(startEnding(state, "HOME")));
  raw.endingSceneIndex = 999;
  const restored = restoreGameState(JSON.stringify(raw));
  assert.equal(restored.phase, "ending");
  assert.equal(restored.endingSceneIndex, 2);
});

test("완료됐거나 알 수 없는 엔딩을 가리키는 손상 저장은 아침 장부로 복구된다", () => {
  const completed = JSON.parse(serializeGameState(createInitialGameState()));
  completed.phase = "ending";
  completed.activeEndingId = "HOME";
  completed.completedEndingFlags = ["HOME"];
  const restoredCompleted = restoreGameState(JSON.stringify(completed));
  assert.equal(restoredCompleted.phase, "report");
  assert.equal(restoredCompleted.activeEndingId, null);
  const unknown = { ...completed, activeEndingId: "NOT_AN_ENDING", completedEndingFlags: [] };
  const restoredUnknown = restoreGameState(JSON.stringify(unknown));
  assert.equal(restoredUnknown.phase, "report");
  assert.equal(restoredUnknown.activeEndingId, null);
});
