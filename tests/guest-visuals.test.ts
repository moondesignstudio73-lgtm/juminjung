import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createGuests } from "../game/guest-data.ts";
import { getGuestVisualState, getNightEventPortraits, getStoryEventExpression } from "../game/guest-visual-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { STORY_CHOICE_EVENTS } from "../game/story-choice-data.ts";

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
  const breakthrough = getNightEventPortraits("lily_vale_breakthrough");
  assert.deepEqual(breakthrough, [{ guestId: "lily", expression: "happy" }, { guestId: "vale", expression: "suspicious" }]);
  assert.equal(getNightEventPortraits("quiet_watch"), null);
  assert.equal(getGuestVisualState(guest("owen"), standoff?.[0].expression).asset, "/juminjung/assets/portraits/owen/angry-v1.png");
  assert.equal(getGuestVisualState(guest("hayes"), standoff?.[1].expression).asset, "/juminjung/assets/portraits/hayes/angry-v1.png");
  assert.equal(getGuestVisualState(guest("lily"), breakthrough?.[0].expression).asset, "/juminjung/assets/portraits/lily/happy-v1.png");
  assert.equal(getGuestVisualState(guest("vale"), breakthrough?.[1].expression).asset, "/juminjung/assets/portraits/vale/suspicious-v1.png");
});

test("Claire의 갈등과 결말 스토리는 사건 문맥에 맞는 전용 표정을 제공한다", () => {
  const pursuer = STORY_CHOICE_EVENTS.find((event) => event.id === "claire-pursuer");
  const future = STORY_CHOICE_EVENTS.find((event) => event.id === "claire-future");
  const afraid = getStoryEventExpression("claire-pursuer");
  const happy = getStoryEventExpression("claire-future");
  assert.deepEqual([pursuer?.guestId, pursuer?.stage], ["claire", "CONFLICT"]);
  assert.deepEqual([future?.guestId, future?.stage], ["claire", "RESOLUTION"]);
  assert.equal(afraid, "afraid");
  assert.equal(happy, "happy");
  assert.equal(getGuestVisualState(guest("claire"), afraid).asset, "/juminjung/assets/portraits/claire/afraid-v1.png");
  assert.equal(getGuestVisualState(guest("claire"), happy).asset, "/juminjung/assets/portraits/claire/happy-v1.png");
});

test("Walter의 아버지 비밀 갈등과 결말은 사건 문맥에 맞는 전용 표정을 제공한다", () => {
  const conflict = STORY_CHOICE_EVENTS.find((event) => event.id === "walter-father-lie");
  const resolution = STORY_CHOICE_EVENTS.find((event) => event.id === "walter-key");
  const suspicious = getStoryEventExpression("walter-father-lie");
  const happy = getStoryEventExpression("walter-key");
  assert.deepEqual([conflict?.guestId, conflict?.stage], ["walter", "CONFLICT"]);
  assert.deepEqual([resolution?.guestId, resolution?.stage], ["walter", "RESOLUTION"]);
  assert.equal(suspicious, "suspicious");
  assert.equal(happy, "happy");
  assert.equal(getGuestVisualState(guest("walter"), suspicious).asset, "/juminjung/assets/portraits/walter/suspicious-v1.png");
  assert.equal(getGuestVisualState(guest("walter"), happy).asset, "/juminjung/assets/portraits/walter/happy-v1.png");
});

test("Mia의 가족 갈등과 결말은 사건 문맥에 맞는 전용 표정을 제공한다", () => {
  const conflict = STORY_CHOICE_EVENTS.find((event) => event.id === "mia-daniel");
  const resolution = STORY_CHOICE_EVENTS.find((event) => event.id === "mia-family");
  const afraid = getStoryEventExpression("mia-daniel");
  const happy = getStoryEventExpression("mia-family");
  assert.deepEqual([conflict?.guestId, conflict?.stage], ["mia", "CONFLICT"]);
  assert.deepEqual([resolution?.guestId, resolution?.stage], ["mia", "RESOLUTION"]);
  assert.equal(afraid, "afraid");
  assert.equal(happy, "happy");
  assert.equal(getGuestVisualState(guest("mia"), afraid).asset, "/juminjung/assets/portraits/mia/afraid-v1.png");
  assert.equal(getGuestVisualState(guest("mia"), happy).asset, "/juminjung/assets/portraits/mia/happy-v1.png");
});

test("Daniel의 가족 증명 갈등과 결말은 사건 문맥에 맞는 전용 표정을 제공한다", () => {
  const conflict = STORY_CHOICE_EVENTS.find((event) => event.id === "daniel-proof");
  const resolution = STORY_CHOICE_EVENTS.find((event) => event.id === "daniel-family");
  const suspicious = getStoryEventExpression("daniel-proof");
  const happy = getStoryEventExpression("daniel-family");
  assert.deepEqual([conflict?.guestId, conflict?.stage], ["daniel", "CONFLICT"]);
  assert.deepEqual([resolution?.guestId, resolution?.stage], ["daniel", "RESOLUTION"]);
  assert.equal(suspicious, "suspicious");
  assert.equal(happy, "happy");
  assert.equal(getGuestVisualState(guest("daniel"), suspicious).asset, "/juminjung/assets/portraits/daniel/suspicious-v1.png");
  assert.equal(getGuestVisualState(guest("daniel"), happy).asset, "/juminjung/assets/portraits/daniel/happy-v1.png");
});

test("Samuel의 과거 고백과 결말은 사건 문맥에 맞는 전용 표정을 제공한다", () => {
  const conflict = STORY_CHOICE_EVENTS.find((event) => event.id === "samuel-ledger");
  const resolution = STORY_CHOICE_EVENTS.find((event) => event.id === "samuel-duty");
  const sad = getStoryEventExpression("samuel-ledger");
  const happy = getStoryEventExpression("samuel-duty");
  assert.deepEqual([conflict?.guestId, conflict?.stage], ["samuel", "CONFLICT"]);
  assert.deepEqual([resolution?.guestId, resolution?.stage], ["samuel", "RESOLUTION"]);
  assert.equal(sad, "sad");
  assert.equal(happy, "happy");
  assert.equal(getGuestVisualState(guest("samuel"), sad).asset, "/juminjung/assets/portraits/samuel/sad-v1.png");
  assert.equal(getGuestVisualState(guest("samuel"), happy).asset, "/juminjung/assets/portraits/samuel/happy-v1.png");
});

test("Jack의 이중 거래 갈등과 시장 결말은 사건 문맥에 맞는 전용 표정을 제공한다", () => {
  const conflict = STORY_CHOICE_EVENTS.find((event) => event.id === "jack-double-deal");
  const resolution = STORY_CHOICE_EVENTS.find((event) => event.id === "jack-market");
  const suspicious = getStoryEventExpression("jack-double-deal");
  const happy = getStoryEventExpression("jack-market");
  assert.deepEqual([conflict?.guestId, conflict?.stage], ["jack", "CONFLICT"]);
  assert.deepEqual([resolution?.guestId, resolution?.stage], ["jack", "RESOLUTION"]);
  assert.equal(suspicious, "suspicious");
  assert.equal(happy, "happy");
  assert.equal(getGuestVisualState(guest("jack"), suspicious).asset, "/juminjung/assets/portraits/jack/suspicious-v1.png");
  assert.equal(getGuestVisualState(guest("jack"), happy).asset, "/juminjung/assets/portraits/jack/happy-v1.png");
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
  assert.deepEqual(mia.portraitVariants, { afraid: "/juminjung/assets/portraits/mia/afraid-v1.png", happy: "/juminjung/assets/portraits/mia/happy-v1.png" });
  assert.equal(mia.expressions.length, 7);
});
