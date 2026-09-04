import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGameState,
  restoreGameState,
  serializeGameState,
} from '../game/save-manager.ts';
import {
  beginNightShift,
  completeNightShift,
  repairGenerator,
  generatorState,
  generatorAtRisk,
  getWorkerStatus,
  performNightHotelAction,
  isGeneratorSpecialist,
  getGeneratorFacilityView,
  moveNightLocation,
  inspectGenerator,
  assignGeneratorDuty,
  serviceGenerator,
  upgradeGenerator,
  nightClock,
} from '../game/night-work-manager.ts';
import { createNormalVisitor } from '../game/normal-visitor-data.ts';
import { assignGuest, moveGuest } from '../game/room-manager.ts';
import { prepareDailyVisitorQueue } from '../game/visitor-queue-manager.ts';
import { resolveDay } from '../game/day-manager.ts';
import { selectNightEvent } from '../game/night-event-manager.ts';
import { getNightStaffPlan } from '../game/staff-operation-manager.ts';
import type { GameState } from '../game/types.ts';

test('workload and storm increase wear; all upgrade levels survive save restoration', () => {
  const base = fixture();
  const quiet = nextNight(base);
  const loaded = nextNight({
    ...base,
    facilities: { water_purifier: 1, food_production: 1 },
    flags: { ...base.flags, severe_storm: true },
  });
  assert.ok(generatorState(loaded).condition < generatorState(quiet).condition);
  assert.ok(generatorState(loaded).wear > generatorState(quiet).wear);
  for (const level of [1, 2, 3, 4]) {
    const s = {
      ...base,
      facilityState: {
        generator: { ...generatorState(base), automationLevel: level },
      },
    };
    assert.equal(
      generatorState(restoreGameState(serializeGameState(s))).automationLevel,
      level,
    );
  }
  assert.match(
    getGeneratorFacilityView({
      ...base,
      resources: { ...base.resources, fuel: 0 },
    }).alert!,
    /연료 부족/,
  );
});
function fixture(engineer = false, condition = 60): GameState {
  let state: GameState = {
    ...createInitialGameState(),
    day: 5,
    phase: 'desk',
    actionPoints: 0,
    resources: {
      food: 80,
      water: 80,
      fuel: 80,
      medicine: 20,
      parts: 30,
      security: 50,
    },
    facilityState: {
      generator: { condition, maxCondition: 100, lastWearDay: 5 },
    },
  };
  if (engineer) {
    const guest = {
      ...createNormalVisitor(42, 5, 0),
      currentRoomNumber: 205,
      checkedInDay: 5,
      status: 'STAYING' as const,
      remainingNights: 20,
      stayDuration: 20,
      health: 80,
      stress: 20,
      aura: null,
    };
    state = {
      ...state,
      rooms: assignGuest(state.rooms, 205, guest.id),
      guests: [...state.guests, guest],
    };
  }
  return beginNightShift(state);
}
const engineerId = (s: GameState) =>
  s.guests.find((g) => g.status === 'STAYING' && isGeneratorSpecialist(g))!.id;
const nextNight = (s: GameState) =>
  beginNightShift({ ...s, day: s.day + 1, phase: 'desk' });
test('A: manual inspection/repair uses different time and resources, never day AP', () => {
  let s = moveNightLocation(fixture(), 'generator');
  assert.equal(s.nightShift?.elapsedMinutes, 25);
  s = inspectGenerator(s);
  assert.equal(s.nightShift?.elapsedMinutes, 40);
  assert.equal(inspectGenerator(s), s);
  s = repairGenerator(s).state;
  assert.equal(s.nightShift?.elapsedMinutes, 85);
  assert.equal(s.resources.parts, 27);
  assert.equal(generatorState(s).condition, 90);
  assert.equal(s.actionPoints, 0);
  assert.equal(nightClock(s), '22:25');
});
test('B: aging accumulates and neglect escalates to persistent major breakdown', () => {
  let s = beginNightShift({
    ...createInitialGameState(),
    day: 4,
    phase: 'desk',
  });
  assert.equal(generatorState(s).condition, 82);
  const wear = generatorState(s).wear;
  for (let i = 0; i < 8; i++) s = nextNight(s);
  assert.ok(generatorState(s).wear > wear);
  assert.equal(generatorState(s).activeProblem, 'major');
  assert.equal(generatorAtRisk(s), true);
  assert.deepEqual(beginNightShift(s).facilityState, s.facilityState);
});
test('C/D/E: checked-in engineer receives persistent duty, automatically inspects and repairs without a visit', () => {
  const before = fixture(true),
    id = engineerId(before);
  const assigned = assignGeneratorDuty(before, id);
  assert.equal(assigned.staffAssignments.MAINTENANCE, id);
  assert.equal(generatorState(assigned).condition, 85);
  assert.equal(assigned.resources.parts, 29);
  assert.equal(assigned.nightShift?.location, 'front');
  assert.equal(assigned.nightShift?.elapsedMinutes, 10);
  assert.equal(serviceGenerator(assigned), assigned);
  const tomorrow = nextNight(assigned);
  assert.equal(tomorrow.staffAssignments.MAINTENANCE, id);
  assert.equal(generatorState(tomorrow).lastInspectedDay, 6);
  assert.equal(tomorrow.nightShift?.elapsedMinutes, 0);
  assert.equal(tomorrow.nightShift?.location, 'front');
  assert.equal(getNightStaffPlan(tomorrow).conditionDelta, 0);
  assert.equal(assignGeneratorDuty(tomorrow, id), tomorrow);
  assert.equal(
    assignGeneratorDuty(tomorrow, null).staffAssignments.MAINTENANCE,
    undefined,
  );
});
test('F: major fault calls player and cannot be automatically repaired at any level', () => {
  const before = fixture(true, 15),
    id = engineerId(before);
  const high = {
    ...before,
    facilityState: {
      generator: { ...generatorState(before), automationLevel: 4 },
    },
  };
  const s = assignGeneratorDuty(high, id);
  assert.equal(generatorState(s).condition, 15);
  assert.equal(s.resources.parts, 30);
  assert.match(getGeneratorFacilityView(s).alert!, /혼자 해결/);
  const fixed = repairGenerator(moveNightLocation(s, 'generator')).state;
  assert.equal(generatorState(fixed).activeProblem, 'minor');
  assert.equal(fixed.resources.parts, 25);
  assert.equal(generatorAtRisk(fixed), false);
});
test('G: injury, illness, fatigue, departure and death stop delegated service', () => {
  const s = assignGeneratorDuty(fixture(true), engineerId(fixture(true)));
  for (const patch of [
    { health: 10 },
    { stress: 95 },
    { infectionState: 'SICK' as const },
    { status: 'CHECKED_OUT' as const },
    { alive: false },
  ]) {
    const tomorrow = nextNight({
      ...s,
      guests: s.guests.map((g) =>
        g.id === s.staffAssignments.MAINTENANCE ? { ...g, ...patch } : g,
      ),
    });
    assert.notEqual(generatorState(tomorrow).lastInspectedDay, tomorrow.day);
    assert.equal(tomorrow.resources.parts, s.resources.parts);
    assert.match(getGeneratorFacilityView(tomorrow).alert!, /근무 중단/);
  }
});
test('H: upgrades enable remote warnings, small self-recovery and engineer prevention', () => {
  let s = moveNightLocation(
    {
      ...fixture(),
      day: 10,
      nightShift: { ...fixture().nightShift!, day: 10 },
    },
    'generator',
  );
  s = upgradeGenerator(s);
  assert.equal(generatorState(s).automationLevel, 2);
  assert.equal(getGeneratorFacilityView(s).remote, true);
  s = upgradeGenerator(s);
  assert.equal(generatorState(s).automationLevel, 3);
  const condition = generatorState(s).condition;
  const auto = serviceGenerator(s);
  assert.equal(generatorState(auto).condition, condition + 8);
  s = upgradeGenerator(auto);
  assert.equal(generatorState(s).automationLevel, 4);
  const base = assignGeneratorDuty(
    fixture(true, 90),
    engineerId(fixture(true)),
  );
  const advanced = {
    ...base,
    facilityState: {
      generator: { ...generatorState(base), automationLevel: 4 },
    },
  };
  assert.ok(
    generatorState(nextNight(advanced)).condition >
      generatorState(nextNight(base)).condition,
  );
  assert.equal(getGeneratorFacilityView(advanced).mode, '자동 관리');
});
test('I: save/load retains assignment, upgrade, clock, position, resources and service idempotency', () => {
  const s = moveNightLocation(
    assignGeneratorDuty(fixture(true), engineerId(fixture(true))),
    'storage',
  );
  const loaded = restoreGameState(serializeGameState(s));
  assert.deepEqual(loaded.facilityState, s.facilityState);
  assert.deepEqual(loaded.nightShift, s.nightShift);
  assert.deepEqual(loaded.resources, s.resources);
  assert.deepEqual(loaded.staffAssignments, s.staffAssignments);
  assert.equal(serviceGenerator(loaded), loaded);
});
test('legacy 3-action save migrates spent work to minutes without recharging', () => {
  const s = fixture();
  const old = {
    ...s,
    nightShift: { day: 5, actions: 1, completed: false, tasks: [] },
  };
  const loaded = restoreGameState(JSON.stringify(old));
  assert.equal(loaded.nightShift?.elapsedMinutes, 90);
  assert.equal(loaded.nightShift?.actions, undefined);
  assert.deepEqual(loaded.resources, s.resources);
});
test('more than three night tasks are allowed; time boundary, location and closed-night guards hold', () => {
  let s = moveNightLocation(fixture(), 'rooms');
  for (let i = 0; i < 4; i++)
    s = performNightHotelAction(s, 'community_outreach');
  assert.equal(s.nightShift?.tasks.length, 4);
  assert.equal(s.actionPoints, 0);
  assert.equal(repairGenerator(s).ok, false);
  s = { ...s, nightShift: { ...s.nightShift!, elapsedMinutes: 350 } };
  assert.equal(performNightHotelAction(s, 'community_outreach'), s);
  assert.equal(moveNightLocation(s, 'generator'), s);
  assert.equal(
    nightClock({ ...s, nightShift: { ...s.nightShift!, elapsedMinutes: 360 } }),
    '03:00',
  );
  const closed = completeNightShift(s);
  assert.equal(performNightHotelAction(closed, 'community_outreach'), closed);
});
test('blackout still stops actual circuits and powered production, but not non-powered production', () => {
  const s = {
    ...fixture(false, 15),
    facilities: { water_purifier: 2 as const, food_production: 1 as const },
  };
  assert.equal(
    selectNightEvent(completeNightShift(s)).id,
    'generator_breakdown',
  );
  const after = resolveDay(completeNightShift(s));
  assert.deepEqual(after.lastDaySummary?.poweredCircuits, []);
  assert.ok(
    after.lastDaySummary?.inactiveFacilities?.includes('water_purifier'),
  );
  assert.equal(after.lastDaySummary?.facilityProduction?.water, undefined);
  assert.equal(after.lastDaySummary?.facilityProduction?.food, 2);
});
test('DAY 1 placement/movement and single settlement remain valid', () => {
  let s = prepareDailyVisitorQueue({
    ...createInitialGameState(),
    day: 1,
    phase: 'desk',
  });
  const visitor = s.guests.find((g) => g.id === s.dailyVisitorQueue[0])!;
  s = {
    ...s,
    rooms: assignGuest(s.rooms, 205, visitor.id),
    guests: s.guests.map((g) =>
      g.id === visitor.id
        ? { ...g, status: 'STAYING', currentRoomNumber: 205, checkedInDay: 1 }
        : g,
    ),
  };
  s = {
    ...s,
    rooms: moveGuest(s.rooms, visitor.id, 206),
    guests: s.guests.map((g) =>
      g.id === visitor.id ? { ...g, currentRoomNumber: 206 } : g,
    ),
  };
  const night = beginNightShift(s);
  assert.equal(night.facilityState, undefined);
  assert.equal(moveNightLocation(night, 'generator'), night);
  const after = resolveDay(completeNightShift(night));
  assert.equal(after.day, 2);
  assert.throws(() => resolveDay(after));
});
test('healthy DAY 5 engineer arrival and job matching remain correct', () => {
  for (let seed = 0; seed < 30; seed++) {
    const s = prepareDailyVisitorQueue({
      ...createInitialGameState(),
      day: 5,
      phase: 'desk',
      visitorSeed: seed,
    });
    const g = s.guests.find((g) => g.id === s.dailyVisitorQueue[0])!;
    assert.equal(g.name, '에단 브룩스');
    assert.equal(g.infectionState, 'HEALTHY');
    assert.equal(isGeneratorSpecialist(g), true);
    assert.equal(
      isGeneratorSpecialist({ ...g, role: '운전기사', baseTraits: [] }),
      false,
    );
  }
});
test('parts shortage never creates free repairs; worker cannot receive parallel duty benefits', () => {
  const original = fixture(true),
    s = { ...original, resources: { ...original.resources, parts: 0 } };
  const after = assignGeneratorDuty(s, engineerId(s));
  assert.equal(generatorState(after).condition, 60);
  assert.match(getGeneratorFacilityView(after).alert!, /부품 부족/);
  assert.equal(
    getWorkerStatus(
      after,
      after.guests.find((g) => g.id === engineerId(after))!,
    ),
    'WORKING',
  );
  assert.equal(getNightStaffPlan(after).conditionDelta, 0);
});
