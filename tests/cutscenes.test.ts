import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CUTSCENES } from "../game/cutscene-data.ts";
import { ENDING_NARRATIVES } from "../game/ending-narrative-data.ts";
import { normalizePrologueIndex, PROLOGUE_BEATS } from "../game/prologue-data.ts";
import { STORY_CHOICE_EVENTS } from "../game/story-choice-data.ts";

function assertLandscapePng(asset: string) {
  const png = readFileSync(asset.replace("/juminjung/", "public/"));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1672);
  assert.equal(png.readUInt32BE(20), 941);
}

test("프롤로그와 사건 컷신은 실제 1672×941 와이드 PNG 원화를 사용한다", () => {
  const endingAssets = ENDING_NARRATIVES.flatMap((narrative) => narrative.image ? [narrative.image] : []);
  const assets = new Set([...PROLOGUE_BEATS.map((beat) => beat.image), ...CUTSCENES.map((cutscene) => cutscene.image), ...endingAssets]);
  for (const asset of assets) assertLandscapePng(asset);
});

test("컷신 ID와 스토리 선택 트리거는 고유하며 야간·스토리 네임스페이스를 섞지 않는다", () => {
  assert.equal(new Set(CUTSCENES.map((cutscene) => cutscene.id)).size, CUTSCENES.length);
  const storyCutscenes = CUTSCENES.filter((cutscene) => cutscene.triggerStoryEventId !== undefined || cutscene.triggerStoryChoiceId !== undefined);
  assert.ok(storyCutscenes.every((cutscene) => cutscene.triggerStoryEventId && cutscene.triggerStoryChoiceId));
  assert.ok(storyCutscenes.every((cutscene) => cutscene.triggerEventId === undefined && cutscene.triggerChoiceId === undefined));
  assert.equal(new Set(storyCutscenes.map((cutscene) => `${cutscene.triggerStoryEventId}:${cutscene.triggerStoryChoiceId}`)).size, storyCutscenes.length);
  assert.ok(storyCutscenes.every((cutscene) => STORY_CHOICE_EVENTS.some((event) => event.id === cutscene.triggerStoryEventId && event.choices.some((choice) => choice.id === cutscene.triggerStoryChoiceId))));
});

test("Daniel의 가족 결말 선택은 서로 다른 전용 원화와 장면을 소유한다", () => {
  const scenes = CUTSCENES.filter((cutscene) => cutscene.triggerStoryEventId === "daniel-family");
  assert.deepEqual(scenes.map((scene) => scene.triggerStoryChoiceId).sort((a, b) => String(a).localeCompare(String(b))), ["escort", "let_choose"]);
  assert.equal(new Set(scenes.map((scene) => scene.image)).size, 2);
  assert.ok(scenes.every((scene) => scene.imageAlt.includes("Daniel Carter") && scene.imageAlt.includes("Mia Carter")));
});

test("Mr. White의 THE DOOR 최종 선택은 서로 다른 전용 원화와 장면을 소유한다", () => {
  const scenes = CUTSCENES.filter((cutscene) => cutscene.triggerStoryEventId === "white-answer");
  assert.deepEqual(scenes.map((scene) => scene.triggerStoryChoiceId).sort((a, b) => String(a).localeCompare(String(b))), ["no", "yes"]);
  assert.equal(new Set(scenes.map((scene) => scene.image)).size, 2);
  assert.ok(scenes.every((scene) => scene.imageAlt.includes("Mr. White")));
});

test("Hayes의 최종 지휘권 선택은 군정과 민간 통제의 서로 다른 전용 원화를 소유한다", () => {
  const scenes = CUTSCENES.filter((cutscene) => cutscene.triggerStoryEventId === "hayes-command");
  assert.deepEqual(scenes.map((scene) => scene.triggerStoryChoiceId).sort((a, b) => String(a).localeCompare(String(b))), ["civilian_rule", "sign_command"]);
  assert.equal(new Set(scenes.map((scene) => scene.image)).size, 2);
  assert.ok(scenes.every((scene) => scene.imageAlt.includes("대령")));
});

test("Victor의 최종 시장 선택은 공동 신탁과 독점 연합의 서로 다른 전용 원화를 소유한다", () => {
  const scenes = CUTSCENES.filter((cutscene) => cutscene.triggerStoryEventId === "victor-crown");
  assert.deepEqual(scenes.map((scene) => scene.triggerStoryChoiceId).sort((a, b) => String(a).localeCompare(String(b))), ["public_trust", "rule_market"]);
  assert.equal(new Set(scenes.map((scene) => scene.image)).size, 2);
  assert.ok(scenes.every((scene) => scene.imageAlt.includes("빅터")));
});

test("Jack의 최종 시장 선택은 공정 거래와 독점 시장의 서로 다른 전용 원화를 소유한다", () => {
  const scenes = CUTSCENES.filter((cutscene) => cutscene.triggerStoryEventId === "jack-market");
  assert.deepEqual(scenes.map((scene) => scene.triggerStoryChoiceId).sort((a, b) => String(a).localeCompare(String(b))), ["fair_market", "monopoly"]);
  assert.equal(new Set(scenes.map((scene) => scene.image)).size, 2);
  assert.ok(scenes.every((scene) => scene.imageAlt.includes("잭 먼로")));
});

test("DAY 0 프롤로그는 출발 원화에서 빈 프런트와 첫 노크로 전환된다", () => {
  assert.equal(PROLOGUE_BEATS.length, 4);
  assert.ok(PROLOGUE_BEATS.slice(0, 3).every((beat) => beat.image.endsWith("father-departure-v1.png")));
  assert.equal(new Set(PROLOGUE_BEATS.slice(0, 3).map((beat) => beat.imageAlt)).size, 1);
  assert.ok(PROLOGUE_BEATS[3].image.endsWith("juju-frontdesk-night-rain-v1.png"));
  assert.equal(PROLOGUE_BEATS[2].speaker, "아버지");
  assert.equal(PROLOGUE_BEATS[3].speaker, "라디오 91.3");
});

test("손상된 프롤로그 위치는 유효한 장면 범위로 정규화된다", () => {
  assert.equal(normalizePrologueIndex(-50), 0);
  assert.equal(normalizePrologueIndex("2"), 2);
  assert.equal(normalizePrologueIndex(999), PROLOGUE_BEATS.length - 1);
  assert.equal(normalizePrologueIndex("broken"), 0);
  assert.equal(normalizePrologueIndex(Number.POSITIVE_INFINITY), 0);
  assert.equal(normalizePrologueIndex(2.9), 2);
});
