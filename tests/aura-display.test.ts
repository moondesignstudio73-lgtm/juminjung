import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowAuraOverlay, toggleAuraGuestId } from "../game/aura-display.ts";

test("객실 배치·이동 미리보기는 Aura 범위를 항상 표시한다", () => {
  assert.equal(shouldShowAuraOverlay("assignment", false), true);
  assert.equal(shouldShowAuraOverlay("assignment", true), true);
});

test("일반 운영 화면은 Aura 범위를 기본적으로 숨긴다", () => {
  assert.equal(shouldShowAuraOverlay("management"), false);
});

test("일반 운영 화면은 사용자가 요청한 동안만 Aura 범위를 표시한다", () => {
  assert.equal(shouldShowAuraOverlay("management", true), true);
  assert.equal(shouldShowAuraOverlay("management", false), false);
});

test("Aura 표시 요청은 선택한 투숙객 ID에만 귀속되고 같은 버튼으로 해제된다", () => {
  const walter = toggleAuraGuestId(null, "walter");
  assert.equal(walter, "walter");
  assert.notEqual(walter, "samuel" as string | null);
  assert.equal(toggleAuraGuestId(walter, "walter"), null);
  assert.equal(toggleAuraGuestId(walter, "samuel"), "samuel");
});
