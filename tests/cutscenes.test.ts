import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CUTSCENES } from "../game/cutscene-data.ts";
import { ENDING_NARRATIVES } from "../game/ending-narrative-data.ts";
import { normalizePrologueIndex, PROLOGUE_BEATS } from "../game/prologue-data.ts";

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
