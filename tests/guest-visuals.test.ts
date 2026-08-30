import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createGuests } from "../game/guest-data.ts";
import { getGuestVisualState } from "../game/guest-visual-manager.ts";

const guest = (id: string) => createGuests().find((item) => item.id === id)!;

test("Eleanor는 실제 게임용 반신 일러스트 자산을 사용한다", () => {
  assert.equal(getGuestVisualState(guest("eleanor")).asset, "/juminjung/assets/portraits/eleanor/neutral-v1.png");
  const png = readFileSync("public/assets/portraits/eleanor/neutral-v1.png");
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1536);
});

test("도착 대기 중인 방문자는 젖은 옷 상태로 표시된다", () => {
  const visual = getGuestVisualState(guest("eleanor"));
  assert.ok(visual.modifiers.includes("WET"));
  assert.match(visual.label, /젖은 옷/);
});

test("Health와 감염 상태는 부상 표정·붕대·출혈 상태를 만든다", () => {
  const eleanor = { ...guest("eleanor"), health: 35, infectionState: "INJURED" as const, status: "STAYING" as const };
  const visual = getGuestVisualState(eleanor);
  assert.equal(visual.expression, "injured");
  assert.ok(visual.modifiers.includes("BANDAGED"));
  assert.ok(visual.modifiers.includes("BLOODIED"));
});

test("낮은 Health만으로는 중상 표정은 나지만 출혈을 단정하지 않는다", () => {
  const visual = getGuestVisualState({ ...guest("eleanor"), health: 40, status: "STAYING" });
  assert.equal(visual.expression, "injured");
  assert.equal(visual.modifiers.includes("BLOODIED"), false);
});

test("높은 Stress와 감염 의심은 감정 및 오염 상태를 우선 반영한다", () => {
  const afraid = getGuestVisualState({ ...guest("eleanor"), status: "STAYING", stress: 85 });
  assert.equal(afraid.expression, "afraid");
  const infected = getGuestVisualState({ ...guest("eleanor"), status: "STAYING", infectionState: "INFECTED_SUSPECTED" });
  assert.equal(infected.expression, "injured");
  assert.ok(infected.modifiers.includes("INFECTED"));
});

test("아직 전용 자산이 없는 NPC도 상태 계산은 동일하게 작동한다", () => {
  const ruth = getGuestVisualState({ ...guest("ruth"), stress: 75 });
  assert.equal(ruth.asset, null);
  assert.ok(ruth.modifiers.includes("EXHAUSTED"));
});
