import assert from "node:assert/strict";
import test from "node:test";
import { getOnboardingGuide, getPrimaryObjective } from "../game/onboarding-manager.ts";

test("DAY 1은 방문자와 객실 외 시스템을 숨긴다", () => {
  const guide = getOnboardingGuide(1);
  assert.equal(guide.stage, "ARRIVAL");
  assert.equal(guide.showResources, false);
  assert.equal(guide.showFood, false);
  assert.equal(guide.showPower, false);
  assert.equal(guide.showStaff, false);
  assert.equal(guide.showAdvanced, false);
});

test("DAY 2와 DAY 3은 식량, 전력, 정비 순서로 개방한다", () => {
  const day2 = getOnboardingGuide(2);
  const day3 = getOnboardingGuide(3);
  assert.equal(day2.showFood, true);
  assert.equal(day2.showPower, false);
  assert.equal(day3.showPower, true);
  assert.equal(day3.showStaff, true);
  assert.equal(day3.showAdvanced, false);
});

test("DAY 4부터 전체 운영 시스템을 개방한다", () => {
  assert.equal(getOnboardingGuide(4).showAdvanced, true);
});

test("DAY 1 방문자가 남아 있으면 행동 목표를 구체적으로 제시한다", () => {
  assert.equal(getPrimaryObjective({ day: 1, dailyVisitorQueue: ["a"], dailyVisitorIndex: 0 }), "방문자를 결정하고 객실 배정");
});
