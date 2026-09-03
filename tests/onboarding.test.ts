import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getOnboardingGuide,
  getPrimaryObjective,
} from '../game/onboarding-manager.ts';

test('DAY 1은 방문자와 객실 외 시스템을 숨긴다', () => {
  const guide = getOnboardingGuide(1);
  assert.equal(guide.stage, 'ARRIVAL');
  assert.equal(guide.showResources, false);
  assert.equal(guide.showFood, false);
  assert.equal(guide.showPower, false);
  assert.equal(guide.showStaff, false);
  assert.equal(guide.showAdvanced, false);
  assert.equal(guide.showAura, false);
});

test('DAY 2와 DAY 3은 객실 위치와 직업 능력만 차례로 소개한다', () => {
  const day2 = getOnboardingGuide(2);
  const day3 = getOnboardingGuide(3);
  assert.equal(day2.stage, 'ROOM_EFFECT');
  assert.equal(day2.showAura, true);
  assert.equal(day2.showFood, false);
  assert.equal(day3.stage, 'PROFESSION');
  assert.equal(day2.showPower, false);
  assert.equal(day3.showPower, false);
  assert.equal(day3.showStaff, false);
  assert.equal(day3.showAdvanced, false);
});

test('DAY 4부터 DAY 10까지 하루에 한 시스템씩 개방한다', () => {
  assert.equal(getOnboardingGuide(4).stage, 'SUPPLIES');
  assert.equal(getOnboardingGuide(4).showFood, true);
  assert.equal(getOnboardingGuide(5).stage, 'STAFFING');
  assert.equal(getOnboardingGuide(5).showStaff, true);
  assert.equal(getOnboardingGuide(6).stage, 'POWER');
  assert.equal(getOnboardingGuide(6).showPower, true);
  assert.equal(getOnboardingGuide(7).stage, 'FIRST_CRISIS');
  assert.equal(getOnboardingGuide(7).showAdvanced, true);
  assert.equal(getOnboardingGuide(8).showScavenge, true);
  assert.equal(getOnboardingGuide(9).showInvestigation, true);
  assert.equal(getOnboardingGuide(10).showCodex, true);
});

test('DAY 1 방문자가 남아 있으면 행동 목표를 구체적으로 제시한다', () => {
  assert.equal(
    getPrimaryObjective({
      day: 1,
      dailyVisitorQueue: ['a'],
      dailyVisitorIndex: 0,
    }),
    '방문자를 결정하고 객실 배정',
  );
});
