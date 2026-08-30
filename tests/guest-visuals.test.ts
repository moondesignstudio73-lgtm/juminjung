import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createGuests } from "../game/guest-data.ts";
import { getGuestVisualState, getNightEventPortraits } from "../game/guest-visual-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";

const guest = (id: string) => createGuests().find((item) => item.id === id)!;

test("등록된 모든 반신 일러스트는 실제 1024×1536 PNG 자산을 사용한다", () => {
  const illustrated = createGuests().filter((item) => item.portrait);
  assert.deepEqual(illustrated.map((item) => item.id), ["eleanor", "walter", "mia", "daniel", "samuel", "ruth", "jack", "grace", "owen", "hayes", "lily", "noah", "victor", "rosa", "eli", "vale", "hazel", "thomas", "claire", "white"]);
  for (const item of illustrated) {
    const assets = [item.portrait, ...Object.values(item.portraitVariants)].filter((asset): asset is string => Boolean(asset));
    assert.ok(assets.includes(getGuestVisualState(item).asset ?? ""));
    for (const asset of assets) {
      const relativePath = asset.replace("/juminjung/", "public/");
      const png = readFileSync(relativePath);
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(png.readUInt32BE(16), 1024);
      assert.equal(png.readUInt32BE(20), 1536);
    }
  }
});

test("관계 야간 사건은 두 NPC와 사건 전용 표정을 제공한다", () => {
  const standoff = getNightEventPortraits("owen_hayes_standoff");
  assert.deepEqual(standoff, [{ guestId: "owen", expression: "angry" }, { guestId: "hayes", expression: "angry" }]);
  assert.deepEqual(getNightEventPortraits("medical_shift"), [{ guestId: "eleanor" }, { guestId: "ruth" }]);
  assert.deepEqual(getNightEventPortraits("lily_vale_breakthrough"), [{ guestId: "lily" }, { guestId: "vale" }]);
  assert.equal(getNightEventPortraits("quiet_watch"), null);
  assert.equal(getGuestVisualState(guest("owen"), standoff?.[0].expression).asset, "/juminjung/assets/portraits/owen/angry-v1.png");
  assert.equal(getGuestVisualState(guest("hayes"), standoff?.[1].expression).asset, "/juminjung/assets/portraits/hayes/angry-v1.png");
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

test("Ruth의 공포와 부상 상태는 각각 전용 초상으로 전환된다", () => {
  const afraid = getGuestVisualState({ ...guest("ruth"), status: "STAYING", stress: 85 });
  assert.equal(afraid.expression, "afraid");
  assert.equal(afraid.asset, "/juminjung/assets/portraits/ruth/afraid-v1.png");
  const injured = getGuestVisualState({ ...guest("ruth"), status: "STAYING", infectionState: "INJURED" });
  assert.equal(injured.expression, "injured");
  assert.equal(injured.asset, "/juminjung/assets/portraits/ruth/injured-v1.png");
});

test("Mr. White는 첫 등장부터 위험도에 맞는 의심 초상을 사용한다", () => {
  const suspicious = getGuestVisualState(guest("white"));
  assert.equal(suspicious.expression, "suspicious");
  assert.equal(suspicious.asset, "/juminjung/assets/portraits/white/suspicious-v1.png");
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
