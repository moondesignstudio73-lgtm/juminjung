import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCapacityComparison,
  residentReplacementBlockReason,
} from '../game/capacity-manager.ts';
import { expelResident, recoveryQuote } from '../game/community-manager.ts';
import { recalculateRoomEffects } from '../game/aura-effect-manager.ts';
import { createNormalVisitor } from '../game/normal-visitor-data.ts';
import { assignGuest, isRoomSelectable } from '../game/room-manager.ts';
import { createInitialGameState } from '../game/save-manager.ts';
import { prepareGuestCheckIn } from '../game/visitor-manager.ts';

function fullCapacityState() {
  let state = createInitialGameState();
  state.day = 5;
  state.phase = 'desk';
  const openRooms = state.rooms.filter(isRoomSelectable);
  const residents = openRooms.map((room, index) => ({
    ...createNormalVisitor(130 + index, 5, index),
    id: `resident-${index}`,
    name: `기존 주민 ${index + 1}`,
    status: 'STAYING' as const,
    residency: 'RESIDENT' as const,
    currentRoomNumber: room.roomNumber,
    checkedInDay: 1,
  }));
  const visitor = {
    ...createNormalVisitor(990, 5, 7),
    id: 'incoming-visitor',
    name: '신규 방문자',
    status: 'WAITING' as const,
    currentRoomNumber: null,
  };
  state.guests = [...residents, visitor];
  state.rooms = residents.reduce(
    (rooms, resident) =>
      assignGuest(rooms, resident.currentRoomNumber!, resident.id),
    state.rooms,
  );
  state.rooms = recalculateRoomEffects(state.rooms, state.guests);
  state.staffAssignments = { MAINTENANCE: residents[0].id };
  return { state, residents, visitor };
}

test('A/B: 빈 객실이 사라지면 만실 비교에 필요한 상태가 계산된다', () => {
  const { state, residents, visitor } = fullCapacityState();
  assert.equal(state.rooms.some(isRoomSelectable), false);
  const comparison = getCapacityComparison(state, residents[0], visitor);
  assert.deepEqual(comparison.current.duties, ['시설 정비']);
  assert.equal(comparison.current.need.level, 'HIGH');
  assert.equal(
    comparison.after.food,
    comparison.before.food -
      comparison.current.consumption.food +
      comparison.incoming.consumption.food,
  );
});

test('C-G: 교체는 기존 업무·객실·Aura를 정리하고 같은 방에 방문자를 배치한다', () => {
  const { state, residents, visitor } = fullCapacityState();
  const departing = residents[0];
  const roomNumber = departing.currentRoomNumber!;
  const expelled = expelResident(state, departing.id);
  assert.equal(expelled.staffAssignments.MAINTENANCE, undefined);
  assert.equal(expelled.rooms.find((room) => room.roomNumber === roomNumber)?.status, 'EMPTY');
  assert.ok(
    expelled.rooms.every((room) =>
      room.temporaryEffects.every(
        (effect) => effect.sourceGuestId !== departing.id,
      ),
    ),
  );
  const guests = prepareGuestCheckIn(
    expelled.guests,
    visitor.id,
    roomNumber,
    state.day,
    expelled.flags,
    visitor.id,
  );
  const rooms = recalculateRoomEffects(
    assignGuest(expelled.rooms, roomNumber, visitor.id),
    guests,
  );
  assert.equal(guests.find((guest) => guest.id === departing.id)?.status, 'CHECKED_OUT');
  assert.equal(guests.find((guest) => guest.id === visitor.id)?.status, 'STAYING');
  assert.equal(rooms.find((room) => room.roomNumber === roomNumber)?.guestId, visitor.id);
});

test('H: 만실이어도 잠긴 객실 복구 비용과 가능 시점을 조회할 수 있다', () => {
  const { state } = fullCapacityState();
  const locked = state.rooms.find((room) => room.status === 'LOCKED')!;
  const quote = recoveryQuote(state, locked.roomNumber);
  assert.ok(quote.parts > 0);
  assert.ok(quote.minutes > 0);
  assert.ok(locked.recovery?.availableDay);
});

test('J: 스토리 잠금 주민은 UI 판정과 실제 퇴실 처리 양쪽에서 보호된다', () => {
  const { state, residents } = fullCapacityState();
  const protectedResident = {
    ...residents[0],
    storyLockedResident: true,
    residency: 'STORY_LOCKED' as const,
  };
  const protectedState = {
    ...state,
    guests: state.guests.map((guest) =>
      guest.id === protectedResident.id ? protectedResident : guest,
    ),
  };
  assert.match(residentReplacementBlockReason(protectedResident)!, /사건/);
  assert.equal(expelResident(protectedState, protectedResident.id), protectedState);
});
