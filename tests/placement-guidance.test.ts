import test from 'node:test';
import assert from 'node:assert/strict';
import { createNormalVisitor } from '../game/normal-visitor-data.ts';
import { createRooms, assignGuest, moveGuest } from '../game/room-manager.ts';
import {
  getAffectedRoomNumbers,
  recalculateRoomEffects,
  getInjuryRecovery,
} from '../game/aura-effect-manager.ts';
import {
  getRecommendedRooms,
  getPlacementDescription,
  getPlacementFeedback,
  getPlacementProfile,
} from '../game/placement-guidance.ts';
import {
  createInitialGameState,
  serializeGameState,
  restoreGameState,
} from '../game/save-manager.ts';
import {
  prepareDailyVisitorQueue,
  getCurrentQueuedVisitor,
} from '../game/visitor-queue-manager.ts';

void test('DAY 1 tutorial is Liam with Basic Care across seeds', () => {
  for (const seed of [1, 42, 500, 91822]) {
    const guest = createNormalVisitor(seed, 1, 0);
    assert.equal(guest.name, '리암 모건');
    assert.equal(guest.aura?.name, 'Basic Care');
    const queued = prepareDailyVisitorQueue({
      ...createInitialGameState(),
      day: 1,
      visitorSeed: seed,
    });
    assert.equal(getCurrentQueuedVisitor(queued)?.name, '리암 모건');
  }
});
void test('recommendations use real topology; other interior rooms have equal reach', () => {
  const guest = createNormalVisitor(1, 1, 0),
    rooms = createRooms({ restored: true });
  assert.deepEqual(getRecommendedRooms(guest, rooms), [205, 206]);
  const coverage = (n: number) =>
    getAffectedRoomNumbers(rooms, { ...guest, currentRoomNumber: n });
  assert.deepEqual(
    coverage(205),
    [104, 105, 106, 204, 205, 206, 304, 305, 306],
  );
  assert.deepEqual(coverage(101), [101, 102, 201, 202]);
  assert.equal(coverage(202).length, coverage(205).length);
  assert.equal(getPlacementDescription(rooms[14], rooms).title, '중앙 객실');
  assert.equal(getPlacementDescription(rooms[0], rooms).title, '끝 객실');
  assert.equal(getPlacementDescription(rooms[11], rooms).title, '일반 객실');
});
void test('non-recommended choices and moving remain legal; occupied suggestions disappear', () => {
  const guest = createNormalVisitor(1, 1, 0),
    rooms = createRooms({ restored: true });
  const assigned = assignGuest(rooms, 101, guest.id);
  assert.equal(assigned[0].guestId, guest.id);
  assert.match(getPlacementFeedback(guest, rooms[0], rooms), /배치 가능합니다/);
  assert.match(getPlacementFeedback(guest, rooms[14], rooms), /좋은 배치/);
  assert.match(getPlacementFeedback(guest, rooms[11], rooms), /배치 완료/);
  const moved = moveGuest(assigned, guest.id, 205);
  assert.equal(moved[0].occupied, false);
  assert.deepEqual(getRecommendedRooms(guest, moved), [206]);
});
void test('Basic Care preview matches actual room recovery effects, including other floors and self', () => {
  const guest = {
    ...createNormalVisitor(1, 1, 0),
    currentRoomNumber: 205,
    status: 'STAYING' as const,
  };
  const rooms = recalculateRoomEffects(createRooms({ restored: true }), [guest]);
  for (const room of rooms) {
    assert.equal(
      getInjuryRecovery(room),
      [104, 105, 106, 204, 205, 206, 304, 305, 306].includes(room.roomNumber)
        ? 2
        : 0,
    );
  }
});
void test('placement metadata and assigned room survive save/load without changing day 2 rules', () => {
  const state = createInitialGameState();
  const guest = {
    ...createNormalVisitor(1, 1, 0),
    currentRoomNumber: 205,
    status: 'STAYING' as const,
  };
  state.guests.push(guest);
  state.rooms = assignGuest(state.rooms, 205, guest.id);
  state.phase = 'desk';
  state.day = 2;
  const restored = restoreGameState(serializeGameState(state));
  const loaded = restored.guests.find((g) => g.id === guest.id)!;
  assert.deepEqual(loaded.placement, guest.placement);
  assert.equal(loaded.currentRoomNumber, 205);
  assert.equal(restored.phase, 'desk');
  assert.equal(getAffectedRoomNumbers(restored.rooms, loaded).length, 9);
  assert.ok(getPlacementProfile({ ...loaded, placement: undefined }));
});
