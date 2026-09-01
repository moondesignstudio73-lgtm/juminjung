import assert from "node:assert/strict";
import test from "node:test";
import { createGuests } from "../game/guest-data.ts";
import { concludeInvestigationCase, investigateCasePoint, openInvestigationCase } from "../game/investigation-manager.ts";
import { MONSTER_CERTAINTY_WEIGHTS, MONSTER_CODEX, MONSTER_KNOWLEDGE_SOURCES, VISITOR_STATEMENTS } from "../game/monster-codex-data.ts";
import {
  applyMonsterKnowledgeSource,
  getMonsterEvidenceScore,
  getMonsterCodexState,
  getMonsterKnowledgeSourceDefinition,
  getMonsterSourceWeight,
  hasMonsterCountermeasure,
  recordVisitorStatement,
} from "../game/monster-codex-manager.ts";
import { NIGHT_EVENTS } from "../game/night-event-data.ts";
import { applyNightChoice, getEffectiveNightChoice } from "../game/night-event-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";

test("진술·지식 원천·Codex 정의는 실제 NPC 질문과 물품에 연결된다", () => {
  const guests = createGuests();
  for (const statement of VISITOR_STATEMENTS) {
    const guest = guests.find((entry) => entry.id === statement.guestId);
    assert.ok(guest, statement.guestId);
    assert.ok(guest.questions.some((question) => question.id === statement.questionId), statement.questionId);
    if (statement.requiredInspectedItemId) assert.ok(guest.offeredItems.some((item) => item.id === statement.requiredInspectedItemId), statement.requiredInspectedItemId);
  }
  for (const source of MONSTER_KNOWLEDGE_SOURCES) {
    const entry = MONSTER_CODEX.find((candidate) => candidate.id === source.entryId);
    assert.ok(entry, source.entryId);
    assert.ok(entry.insights.some((insight) => insight.id === source.insightId), source.insightId);
    assert.ok(getMonsterSourceWeight(source.id) > 0, source.id);
  }
  assert.deepEqual(MONSTER_CERTAINTY_WEIGHTS, { RUMOR: 0.5, CORROBORATED: 1, VERIFIED: 1.5 });
  assert.ok(MONSTER_CODEX.every((entry) => entry.minimumSources >= 2));
  const preparationOptions = MONSTER_CODEX.flatMap((entry) => entry.preparationCountermeasure ? [entry.preparationCountermeasure.optionId] : []);
  assert.equal(new Set(preparationOptions).size, preparationOptions.length);
});

test("Ruth의 상처 진술은 붕대 조사 전에는 Codex 기록을 만들지 않는다", () => {
  const state = createInitialGameState();
  const result = recordVisitorStatement(state, "ruth", "ruth-scratch", []);
  assert.equal(result.record, null);
  assert.equal(result.state, state);
  assert.deepEqual(result.state.monsterCodex, []);
});

test("Ruth의 상처 진술과 붕대 흔적의 모순이 세 갈래 공격 지식을 연다", () => {
  const state = { ...createInitialGameState(), day: 5 };
  const result = recordVisitorStatement(state, "ruth", "ruth-scratch", ["bandage"]);
  assert.equal(result.record?.assessment, "CONTRADICTED");
  assert.match(result.message ?? "", /모순/);
  assert.deepEqual(getMonsterCodexState(result.state, "MIMIC_STALKER")?.insightIds, ["TRIPLE_CLAW_PATTERN"]);
  assert.ok(result.state.eventHistory.some((entry) => entry.message.includes("진술 모순")));
});

test("같은 진술을 다시 질문해도 기록과 지식 원천은 중복되지 않는다", () => {
  const once = recordVisitorStatement({ ...createInitialGameState(), day: 5 }, "ruth", "ruth-scratch", ["bandage"]).state;
  const twice = recordVisitorStatement(once, "ruth", "ruth-scratch", ["bandage"]).state;
  assert.equal(twice.visitorStatements.length, 1);
  assert.equal(twice.monsterCodex[0].sourceIds.length, 1);
  assert.equal(twice.eventHistory.length, once.eventHistory.length);
});

test("Hazel의 덫과 보행 진술은 바뀌는 보행 지식을 확인한다", () => {
  const result = recordVisitorStatement({ ...createInitialGameState(), day: 15 }, "hazel", "hazel-tracks", ["traps"]);
  assert.equal(result.record?.assessment, "CORROBORATED");
  assert.deepEqual(result.state.monsterCodex[0].insightIds, ["SHIFTING_GAIT"]);
});

test("White의 거짓 목소리 경고는 신호 잠식체의 미확인 제보로만 기록된다", () => {
  const result = recordVisitorStatement({ ...createInitialGameState(), day: 11 }, "white", "white-origin", []);
  const entry = getMonsterCodexState(result.state, "SIGNAL_PARASITE");
  assert.equal(result.record?.assessment, "RECORDED");
  assert.deepEqual(entry?.insightIds, ["BORROWED_VOICE"]);
  assert.equal(getMonsterKnowledgeSourceDefinition("WHITE_FALSE_VOICE_WARNING")?.certainty, "RUMOR");
  assert.equal(getMonsterEvidenceScore(result.state, "SIGNAL_PARASITE"), 0.5);
  assert.equal(hasMonsterCountermeasure(result.state, "SIGNAL_PARASITE"), false);
});

test("신호 잠식체는 미확인 제보만으로 대응책을 열지 않고 검증 근거와 합쳐야 한다", () => {
  let state = applyMonsterKnowledgeSource(createInitialGameState(), "WHITE_FALSE_VOICE_WARNING");
  state = applyMonsterKnowledgeSource(state, "RADIO_SURVIVOR_CHORUS");
  assert.equal(getMonsterEvidenceScore(state, "SIGNAL_PARASITE"), 1.5);
  assert.equal(hasMonsterCountermeasure(state, "SIGNAL_PARASITE"), false);
  state = applyMonsterKnowledgeSource(state, "FATHER_RELAY_TRACE");
  assert.equal(getMonsterEvidenceScore(state, "SIGNAL_PARASITE"), 3);
  assert.equal(hasMonsterCountermeasure(state, "SIGNAL_PARASITE"), true);
});

test("다른 개체의 원천 ID가 손상 상태에 섞여도 신뢰도에 더하지 않는다", () => {
  const state = { ...createInitialGameState(), monsterCodex: [{ entryId: "SIGNAL_PARASITE" as const, sourceIds: ["ROOM_207_MONSTER_CONCLUSION" as const], insightIds: [], updatedDay: 1 }] };
  assert.equal(getMonsterEvidenceScore(state, "SIGNAL_PARASITE"), 0);
  assert.equal(hasMonsterCountermeasure(state, "SIGNAL_PARASITE"), false);
});

test("Room 207의 지지된 괴물 결론은 실내 이탈 경로를 Codex에 합친다", () => {
  let state = openInvestigationCase({ ...createInitialGameState(), day: 12, actionPoints: 3 }, "ROOM_207");
  for (const pointId of ["ROOM_207_DOOR", "ROOM_207_WINDOW", "ROOM_207_FLOOR"] as const) state = investigateCasePoint(state, "ROOM_207", pointId).state;
  state = concludeInvestigationCase(state, "ROOM_207", "MONSTER_ENTRY").state;
  assert.equal(state.flags.room_207_case_correctly_solved, true);
  assert.ok(getMonsterCodexState(state, "MIMIC_STALKER")?.insightIds.includes("INTERIOR_EXIT_ROUTE"));
});

test("행동 관찰 두 개가 모이면 문턱 추적자 대응책이 준비된다", () => {
  const one = applyMonsterKnowledgeSource(createInitialGameState(), "RUTH_SCRATCH_CONTRADICTION");
  const two = applyMonsterKnowledgeSource(one, "HAZEL_TRACKS_TESTIMONY");
  assert.equal(hasMonsterCountermeasure(one, "MIMIC_STALKER"), false);
  assert.equal(hasMonsterCountermeasure(two, "MIMIC_STALKER"), true);
});

test("Codex가 없으면 동쪽 철문 보강 선택은 원래 비용과 피해를 유지한다", () => {
  const choice = NIGHT_EVENTS.find((event) => event.id === "perimeter_breach")!.choices.find((entry) => entry.id === "barricade")!;
  const effective = getEffectiveNightChoice(createInitialGameState(), choice);
  assert.deepEqual(effective, choice);
});

test("Codex 대응책은 철문 보강의 부품 비용·건물 피해·위협 감소를 같은 데이터로 바꾼다", () => {
  let state = applyMonsterKnowledgeSource(createInitialGameState(), "RUTH_SCRATCH_CONTRADICTION");
  state = applyMonsterKnowledgeSource(state, "HAZEL_TRACKS_TESTIMONY");
  const choice = NIGHT_EVENTS.find((event) => event.id === "perimeter_breach")!.choices.find((entry) => entry.id === "barricade")!;
  const effective = getEffectiveNightChoice(state, choice);
  assert.equal(effective.requiredResources?.parts, 1);
  assert.equal(effective.effect.resources?.parts, -1);
  assert.equal(effective.effect.hotelStats?.hotelCondition, 0);
  assert.equal(effective.effect.threat, -8);
  assert.match(effective.label, /CODEX/);
});

test("동쪽 철문 사건 정산도 UI와 동일한 Codex 대응 비용과 효과를 소비한다", () => {
  let state = applyMonsterKnowledgeSource(createInitialGameState(), "RUTH_SCRATCH_CONTRADICTION");
  state = applyMonsterKnowledgeSource(state, "HAZEL_TRACKS_TESTIMONY");
  state = { ...state, day: 12, worldState: "COLLAPSE", resources: { ...state.resources, parts: 5 }, hotelStats: { ...state.hotelStats, security: 50, hotelCondition: 60 }, flags: { ...state.flags, monster_threat: 25 }, guests: state.guests.map((guest, index) => index === 0 ? { ...guest, status: "STAYING", currentRoomNumber: 101 } : guest) };
  const resolved = applyNightChoice(state, "perimeter_breach", "barricade").state;
  assert.equal(resolved.resources.parts, 4);
  assert.equal(resolved.hotelStats.hotelCondition, 60);
  assert.equal(resolved.hotelStats.security, 54);
  assert.equal(resolved.flags.monster_threat, 17);
  assert.equal(resolved.flags.mimic_countermeasure_used, true);
});

test("부분 상태에 source나 statement만 남아도 같은 호출이 빠진 insight를 복구한다", () => {
  const base = createInitialGameState();
  const partial = { ...base, monsterCodex: [{ entryId: "MIMIC_STALKER" as const, sourceIds: ["RUTH_SCRATCH_CONTRADICTION" as const], insightIds: [], updatedDay: 5 }] };
  const repairedSource = applyMonsterKnowledgeSource(partial, "RUTH_SCRATCH_CONTRADICTION");
  assert.deepEqual(repairedSource.monsterCodex[0].insightIds, ["TRIPLE_CLAW_PATTERN"]);
  const statementOnly = { ...base, visitorStatements: [{ statementId: "RUTH_SCRATCH_CLAIM" as const, guestId: "ruth", questionId: "ruth-scratch", recordedDay: 5, assessment: "CONTRADICTED" as const }] };
  const repairedStatement = recordVisitorStatement(statementOnly, "ruth", "ruth-scratch", ["bandage"]).state;
  assert.deepEqual(repairedStatement.monsterCodex[0].insightIds, ["TRIPLE_CLAW_PATTERN"]);
  assert.equal(repairedStatement.visitorStatements.length, 1);
});

test("손상 저장의 문자열·미래 날짜와 중복 Codex 항목은 현재 DAY 경계 안에서 합쳐진다", () => {
  const raw = JSON.parse(serializeGameState(createInitialGameState()));
  raw.version = 14;
  raw.day = 15;
  raw.visitorStatements = [{ statementId: "RUTH_SCRATCH_CLAIM", guestId: "fake", questionId: "fake", recordedDay: 9999, assessment: "RECORDED" }];
  raw.monsterCodex = [
    { entryId: "MIMIC_STALKER", sourceIds: ["RUTH_SCRATCH_CONTRADICTION"], insightIds: [], updatedDay: "9999" },
    { entryId: "MIMIC_STALKER", sourceIds: ["HAZEL_TRACKS_TESTIMONY"], insightIds: [], updatedDay: 99 },
  ];
  const restored = restoreGameState(JSON.stringify(raw));
  assert.equal(restored.visitorStatements[0].recordedDay, 15);
  assert.equal(restored.monsterCodex.length, 1);
  assert.equal(restored.monsterCodex[0].updatedDay, 15);
  assert.deepEqual(restored.monsterCodex[0].insightIds, ["TRIPLE_CLAW_PATTERN", "SHIFTING_GAIT"]);
});

test("Save v15는 진술과 Codex 원천을 보존하고 변조된 파생 insight를 다시 계산한다", () => {
  let state = recordVisitorStatement({ ...createInitialGameState(), day: 15 }, "ruth", "ruth-scratch", ["bandage"]).state;
  state = recordVisitorStatement(state, "hazel", "hazel-tracks", ["traps"]).state;
  const raw = JSON.parse(serializeGameState(state));
  raw.monsterCodex[0].insightIds = ["INTERIOR_EXIT_ROUTE", "INVALID"];
  raw.monsterCodex[0].sourceIds.push("INVALID_SOURCE");
  const restored = restoreGameState(JSON.stringify(raw));
  assert.equal(restored.version, 15);
  assert.deepEqual(restored.visitorStatements.map((record) => record.statementId), ["RUTH_SCRATCH_CLAIM", "HAZEL_TRACKS_TESTIMONY"]);
  assert.deepEqual(restored.monsterCodex[0].insightIds, ["TRIPLE_CLAW_PATTERN", "SHIFTING_GAIT"]);
  assert.equal(hasMonsterCountermeasure(restored, "MIMIC_STALKER"), true);
});

test("v13의 올바른 Room 207 결론은 v15에서 실내 이탈 경로 지식으로 이관된다", () => {
  const raw = JSON.parse(serializeGameState({ ...createInitialGameState(), day: 13, flags: { ...createInitialGameState().flags, room_207_case_correctly_solved: true } }));
  raw.version = 13;
  delete raw.visitorStatements;
  delete raw.monsterCodex;
  const restored = restoreGameState(JSON.stringify(raw));
  assert.equal(restored.version, 15);
  assert.deepEqual(restored.monsterCodex[0].sourceIds, ["ROOM_207_MONSTER_CONCLUSION"]);
  assert.deepEqual(restored.monsterCodex[0].insightIds, ["INTERIOR_EXIT_ROUTE"]);
});

test("기존 플래그 저장은 신호 잠식체의 라디오·중계기 근거로 복구된다", () => {
  const raw = JSON.parse(serializeGameState(createInitialGameState()));
  raw.monsterCodex = [];
  raw.flags.survivor_testimonies_verified = true;
  raw.flags.father_signal_traced = true;
  const restored = restoreGameState(JSON.stringify(raw));
  assert.deepEqual(getMonsterCodexState(restored, "SIGNAL_PARASITE")?.sourceIds, ["RADIO_SURVIVOR_CHORUS", "FATHER_RELAY_TRACE"]);
  assert.equal(hasMonsterCountermeasure(restored, "SIGNAL_PARASITE"), true);
});
