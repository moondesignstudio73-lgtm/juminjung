import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGameState,
  restoreGameState,
  serializeGameState,
} from '../game/save-manager.ts';
import {
  advanceDayFlow,
  openOptionalOperations,
  currentDayStage,
  normalizeDayFlow,
  getOperationTasks,
  getMorningBrief,
  getLivingForecast,
  residentStatus,
} from '../game/day-flow-manager.ts';
import {
  beginNightShift,
  assignGeneratorDuty,
  moveNightLocation,
  repairGenerator,
} from '../game/night-work-manager.ts';
import { resolveDay } from '../game/day-manager.ts';
import { createNormalVisitor } from '../game/normal-visitor-data.ts';
import { assignGuest } from '../game/room-manager.ts';
import { configureFoodRation } from '../game/daily-survival-manager.ts';
import type { GameState } from '../game/types.ts';

test('optional operation review stays available before night, but never reopens a settled choice', () => {
  const residents = advanceDayFlow(doneVisitors(advanceDayFlow(fixture(3))));
  const opened = openOptionalOperations(residents);
  assert.equal(currentDayStage(opened), 'operations');
  const night = advanceDayFlow(opened);
  assert.equal(openOptionalOperations(night), night);
});

test('morning report is frozen after reading and survives later repairs and reload', () => {
  const report = {
    ...fixture(5),
    facilityState: {
      generator: { condition: 10, maxCondition: 100, lastWearDay: 5 },
    },
  };
  const brief = getMorningBrief(report);
  const visitors = advanceDayFlow(report);
  const repaired = {
    ...visitors,
    facilityState: {
      generator: { condition: 100, maxCondition: 100, lastWearDay: 5 },
    },
  };
  assert.deepEqual(getMorningBrief(repaired), brief);
  assert.deepEqual(
    getMorningBrief(restoreGameState(serializeGameState(repaired))),
    brief,
  );
});
function fixture(day: number): GameState {
  return normalizeDayFlow({
    ...createInitialGameState(),
    day,
    phase: 'report',
  });
}
function doneVisitors(s: GameState): GameState {
  return { ...s, dailyVisitorIndex: s.dailyVisitorQueue.length };
}
test('A: DAY 1 report, visitors and rooms lead directly to night, no survival/operations', () => {
  const report = fixture(1),
    visitors = advanceDayFlow(report);
  assert.equal(currentDayStage(visitors), 'visitors');
  assert.equal(advanceDayFlow(visitors), visitors);
  const night = advanceDayFlow(doneVisitors(visitors));
  assert.equal(night.phase, 'night');
  assert.equal(currentDayStage(night), 'events');
  assert.deepEqual(night.resources, visitors.resources);
});
test('B/C: DAY 2 opens residents, ration persists and forecasts never deduct stock', () => {
  const residents = advanceDayFlow(doneVisitors(advanceDayFlow(fixture(2))));
  assert.equal(currentDayStage(residents), 'residents');
  const limited = configureFoodRation(residents, 'LIMITED');
  const before = serializeGameState(limited);
  getLivingForecast(limited);
  assert.equal(serializeGameState(limited), before);
  const next = advanceDayFlow(limited);
  assert.equal(next.foodRationPolicy, 'LIMITED');
  assert.equal(next.phase, 'night');
});
test('D: empty operations skips without repeated confirmation', () => {
  const s = advanceDayFlow(doneVisitors(advanceDayFlow(fixture(3))));
  const healthy = {
    ...s,
    hotelStats: { ...s.hotelStats, hotelCondition: 100, security: 100 },
    rooms: s.rooms.map((r) => ({ ...r, status: 'EMPTY' as const })),
  };
  assert.equal(getOperationTasks(healthy).length, 0);
  assert.equal(advanceDayFlow(healthy).phase, 'night');
});
test('E/F: faults become tasks, normal delegated generator does not', () => {
  let s = fixture(5);
  const g = {
    ...createNormalVisitor(42, 5, 0),
    status: 'STAYING' as const,
    currentRoomNumber: 205,
    health: 90,
    stress: 10,
    remainingNights: 10,
  };
  s = beginNightShift({
    ...s,
    phase: 'desk',
    guests: [...s.guests, g],
    rooms: assignGuest(s.rooms, 205, g.id),
    facilityState: {
      generator: { condition: 65, maxCondition: 100, lastWearDay: 5 },
    },
  });
  assert.ok(getOperationTasks(s).some((t) => t.id === 'generator'));
  const assigned = assignGeneratorDuty(s, g.id);
  assert.equal(
    getOperationTasks(assigned).some((t) => t.id === 'generator'),
    false,
  );
  const broken = {
    ...assigned,
    facilityState: {
      generator: { ...assigned.facilityState!.generator!, condition: 10 },
    },
  };
  assert.equal(
    getOperationTasks(broken).find((t) => t.id === 'generator')?.severity,
    '긴급',
  );
});
test('G/H: events cannot advance twice; choice is recovered in next report with max five lines', () => {
  const night = advanceDayFlow(doneVisitors(advanceDayFlow(fixture(1))));
  assert.equal(advanceDayFlow(night), night);
  const result = resolveDay(night);
  assert.equal(currentDayStage(result), 'report');
  assert.equal(result.dayFlow?.day, 2);
  const brief = getMorningBrief(result);
  assert.ok(brief.length <= 5);
  assert.ok(
    brief.some((l) => l.includes(result.lastNightPresentation!.choice)),
  );
  assert.throws(() => resolveDay(result));
});
test('I: every stage and facility location restore without resetting progress or costs', () => {
  const report = fixture(5),
    visitors = advanceDayFlow(report),
    residents = advanceDayFlow(doneVisitors(visitors));
  const operations = advanceDayFlow(residents);
  const generator = moveNightLocation(operations, 'generator');
  const opened = {
    ...generator,
    dayFlow: {
      ...normalizeDayFlow(generator).dayFlow!,
      operationLocation: 'generator' as const,
    },
  };
  const repaired = repairGenerator(opened).state;
  for (const s of [
    report,
    visitors,
    residents,
    operations,
    opened,
    repaired,
    advanceDayFlow(repaired),
  ]) {
    const restored = restoreGameState(serializeGameState(s));
    assert.equal(currentDayStage(restored), currentDayStage(s));
    assert.deepEqual(restored.resources, s.resources);
    assert.equal(
      restored.nightShift?.elapsedMinutes,
      s.nightShift?.elapsedMinutes,
    );
  }
  assert.equal(
    restoreGameState(serializeGameState(opened)).dayFlow?.operationLocation,
    'generator',
  );
});
test('legacy saves enter equivalent stage, invalid future progress is rejected', () => {
  for (const [phase, stage] of [
    ['desk', 'visitors'],
    ['night_management', 'operations'],
    ['story', 'events'],
    ['night', 'events'],
    ['report', 'report'],
  ] as const) {
    const s = restoreGameState(
      serializeGameState({ ...fixture(6), phase, dayFlow: undefined }),
    );
    assert.equal(currentDayStage(s), stage);
  }
  const malformed = normalizeDayFlow({
    ...fixture(3),
    dayFlow: {
      day: 3,
      stage: 'report',
      visited: ['events', 'residents', 'report'],
    },
  });
  assert.deepEqual(malformed.dayFlow?.visited, ['report']);
});
test('report does not repeat a checkout already described by night presentation', () => {
  const s = fixture(2),
    g = createNormalVisitor(42, 1, 0);
  s.guests.push(g);
  s.lastDaySummary = {
    completedDay: 1,
    nextDay: 2,
    occupiedGuests: 1,
    consumed: { food: 1, water: 1, fuel: 1 },
    checkedOutGuestIds: [g.id],
  };
  s.lastNightPresentation = {
    day: 1,
    title: '조용한 밤',
    choice: '쉰다',
    changes: [],
    moments: [`${g.name}의 체류가 끝났습니다. 객실 열쇠가 돌아왔습니다.`],
  };
  assert.equal(getMorningBrief(s).filter((l) => l.includes(g.name)).length, 1);
  assert.equal(residentStatus({ ...g, health: 10 }).rank, 4);
});
