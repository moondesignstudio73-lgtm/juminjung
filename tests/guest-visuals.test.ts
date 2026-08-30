import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createGuests } from "../game/guest-data.ts";
import { getGuestVisualState, getNightEventPortraitGuestIds } from "../game/guest-visual-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";

const guest = (id: string) => createGuests().find((item) => item.id === id)!;

test("등록된 모든 반신 일러스트는 실제 1024×1536 PNG 자산을 사용한다", () => {
  const illustrated = createGuests().filter((item) => item.portrait);
  assert.deepEqual(illustrated.map((item) => item.id), ["eleanor", "walter", "mia", "daniel", "samuel", "ruth", "jack", "grace", "owen", "hayes", "lily", "noah", "victor", "rosa", "eli", "vale", "hazel", "thomas", "claire", "white"]);
  for (const item of illustrated) {
    assert.equal(getGuestVisualState(item).asset, item.portrait);
    const assets = [item.portrait, ...Object.values(item.portraitVariants)].filter((asset): asset is string => Boolean(asset));
    for (const asset of assets) {
      const relativePath = asset.replace("/juminjung/", "public/");
      const png = readFileSync(relativePath);
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(png.readUInt32BE(16), 1024);
      assert.equal(png.readUInt32BE(20), 1536);
    }
  }
});

test("관계 야간 사건은 두 NPC의 대치 초상화 ID를 제공한다", () => {
  assert.deepEqual(getNightEventPortraitGuestIds("owen_hayes_standoff"), ["owen", "hayes"]);
  assert.deepEqual(getNightEventPortraitGuestIds("medical_shift"), ["eleanor", "ruth"]);
  assert.deepEqual(getNightEventPortraitGuestIds("lily_vale_breakthrough"), ["lily", "vale"]);
  assert.equal(getNightEventPortraitGuestIds("quiet_watch"), null);
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
  assert.equal(afraid.asset, "/juminjung/assets/portraits/eleanor/afraid-v1.png");
  const infected = getGuestVisualState({ ...guest("eleanor"), status: "STAYING", infectionState: "INFECTED_SUSPECTED" });
  assert.equal(infected.expression, "injured");
  assert.equal(infected.asset, "/juminjung/assets/portraits/eleanor/injured-v1.png");
  assert.ok(infected.modifiers.includes("INFECTED"));
});

test("전용 표정 변형이 없는 NPC는 중립 초상으로 안전하게 대체된다", () => {
  const noah = getGuestVisualState({ ...guest("noah"), status: "STAYING", stress: 75 });
  assert.equal(noah.expression, "sad");
  assert.equal(noah.asset, "/juminjung/assets/portraits/noah/neutral-v1.png");
  assert.ok(noah.modifiers.includes("EXHAUSTED"));
});

test("과거 저장의 오래된 초상화 경로는 최신 카탈로그 자산으로 복원된다", () => {
  const state = createInitialGameState();
  state.guests = state.guests.map((item) => item.id === "mia" ? { ...item, portrait: "/assets/portraits/mia/neutral.png", portraitVariants: { afraid: "/assets/portraits/mia/afraid.png" }, expressions: ["neutral"] } : item);
  const restored = restoreGameState(serializeGameState(state));
  const mia = restored.guests.find((item) => item.id === "mia")!;
  assert.equal(mia.portrait, "/juminjung/assets/portraits/mia/neutral-v1.png");
  assert.deepEqual(mia.portraitVariants, {});
  assert.equal(mia.expressions.length, 7);
});
