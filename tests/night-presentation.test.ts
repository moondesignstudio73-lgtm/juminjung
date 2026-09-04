import { createEstablishedHotel } from './established-hotel.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGameState,
  restoreGameState,
  serializeGameState,
} from '../game/save-manager.ts';
import { resolveDay } from '../game/day-manager.ts';
import { getActionFeedback } from '../game/action-feedback.ts';
import { createNormalVisitor } from '../game/normal-visitor-data.ts';
import { assignGuest, moveGuest } from '../game/room-manager.ts';
import { buildFacility } from '../game/hotel-action-manager.ts';
import { FACILITIES } from '../game/facility-data.ts';
import { selectNightEvent } from '../game/night-event-manager.ts';

void test('check-in toast shows real gained resources, never invented food charges', () => {
  const before = {
    ...createEstablishedHotel(),
    phase: 'desk' as const,
    day: 1,
  };
  const guest = {
    ...createNormalVisitor(10, 1, 0),
    status: 'STAYING' as const,
    currentRoomNumber: 205,
  };
  const after = {
    ...before,
    guests: [...before.guests, guest],
    rooms: assignGuest(before.rooms, 205, guest.id),
    resources: { ...before.resources, medicine: before.resources.medicine + 2 },
  };
  const toast = getActionFeedback(before, after)!;
  assert.equal(toast.type, 'CHECK_IN');
  assert.equal(toast.changes.find((c) => c.resource === 'guests')?.after, 1);
  assert.equal(
    toast.changes.some((c) => c.resource === 'food'),
    false,
  );
  assert.match(toast.effects.join(' '), /Basic Care 활성화/);
  assert.match(toast.effects.join(' '), /좋은 배치/);
  const moved = {
    ...after,
    rooms: moveGuest(after.rooms, guest.id, 101),
    guests: after.guests.map((g) =>
      g.id === guest.id ? { ...g, currentRoomNumber: 101 } : g,
    ),
  };
  assert.equal(getActionFeedback(after, moved)?.type, 'ROOM_MOVE');
});
void test('facility effects reuse before/after diff; no-op and daily consumption never become daytime toasts', () => {
  const before = {
    ...createEstablishedHotel(),
    phase: 'desk' as const,
    day: 4,
    resources: {
      food: 100,
      water: 100,
      fuel: 100,
      medicine: 100,
      parts: 100,
      security: 100,
    },
  };
  const built = buildFacility(before, FACILITIES[0].id);
  assert.equal(built.ok, true);
  assert.ok(getActionFeedback(before, built.state)?.changes.length);
  assert.equal(getActionFeedback(before, before), null);
  assert.equal(
    getActionFeedback(before, {
      ...before,
      day: 5,
      resources: { ...before.resources, food: 1 },
    }),
    null,
  );
});
void test('night event cost excludes normal consumption and report reload does not settle twice', () => {
  const before = {
    ...createEstablishedHotel(),
    phase: 'night' as const,
    day: 2,
    selectedNightEventId: 'quiet_watch',
    selectedNightChoiceId: 'patrol',
  };
  const after = resolveDay(before);
  const fuel = after.lastNightPresentation!.changes.find(
    (c) => c.resource === 'fuel',
  )!;
  assert.equal(fuel.after - fuel.before, -1);
  assert.ok(after.resources.fuel < fuel.after);
  assert.equal(after.day, 3);
  assert.equal(after.phase, 'report');
  assert.ok(after.lastDaySummary);
  assert.ok(after.eventHistory.some((e) => e.type === 'RESOURCE'));
  const loaded = restoreGameState(serializeGameState(after));
  assert.deepEqual(loaded.lastNightPresentation, after.lastNightPresentation);
  assert.deepEqual(loaded.resources, after.resources);
  assert.throws(() => resolveDay(loaded));
});
void test('legacy reports without new presentation retain resources and history', () => {
  const old = { ...createEstablishedHotel(), day: 4, phase: 'report' as const };
  const restored = restoreGameState(serializeGameState(old));
  assert.equal(restored.lastNightPresentation, undefined);
  assert.deepEqual(restored.resources, old.resources);
});
void test('night selection still responds to resource shortage, not just DAY', () => {
  const state = {
    ...createEstablishedHotel(),
    day: 2,
    phase: 'night' as const,
  };
  assert.equal(selectNightEvent(state).id, 'quiet_watch');
  assert.equal(
    selectNightEvent({ ...state, resources: { ...state.resources, fuel: 3 } })
      .id,
    'generator_failure',
  );
});
