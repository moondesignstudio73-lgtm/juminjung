import { createEstablishedHotel } from './established-hotel.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAffectedRoomNumbers,
  getDiseaseChance,
  recalculateRoomEffects,
} from '../game/aura-effect-manager.ts';
import { ELEANOR_ID } from '../game/guest-data.ts';
import {
  createInitialGameState,
  restoreGameState,
  serializeGameState,
} from '../game/save-manager.ts';
import {
  assignGuest,
  checkoutGuest,
  getRoomOccupantLabel,
  isRoomSelectable,
  moveGuest,
} from '../game/room-manager.ts';

function placeEleanor(roomNumber: number) {
  const state = createEstablishedHotel();
  state.guests = state.guests.map((guest) =>
    guest.id === ELEANOR_ID
      ? { ...guest, currentRoomNumber: roomNumber }
      : guest,
  );
  state.rooms = recalculateRoomEffects(
    assignGuest(state.rooms, roomNumber, ELEANOR_ID),
    state.guests,
  );
  return state;
}

test('1. 객실 배정 중에도 게임 단계는 프론트에 머문다', () => {
  const state = createEstablishedHotel();
  state.phase = 'desk';
  const rooms = assignGuest(state.rooms, 301, ELEANOR_ID);
  assert.equal(state.phase, 'desk');
  assert.equal(
    rooms.find((room) => room.roomNumber === 301)?.guestId,
    ELEANOR_ID,
  );
});

test('2. 초기 상태는 203호를 자동 배정하지 않는다', () => {
  const state = createEstablishedHotel();
  assert.equal(
    state.rooms.find((room) => room.roomNumber === 203)?.occupied,
    false,
  );
  assert.equal(state.guests[0].currentRoomNumber, null);
  assert.equal(state.resources.fuel, 62);
});

test('3. 복구 완료 시나리오는 30개 객실을 사용할 수 있다', () => {
  const state = createEstablishedHotel();
  assert.equal(state.rooms.length, 30);
  assert.equal(state.rooms.filter(isRoomSelectable).length, 30);
});

test('4. 사용 중인 객실은 선택할 수 없다', () => {
  const rooms = assignGuest(createEstablishedHotel().rooms, 203, ELEANOR_ID);
  assert.equal(
    isRoomSelectable(rooms.find((room) => room.roomNumber === 203)!),
    false,
  );
  assert.throws(() => assignGuest(rooms, 203, 'other'));
});

test('5. 301호 Medical Care Zone은 그리드 인접 객실을 계산한다', () => {
  const state = placeEleanor(301);
  assert.deepEqual(
    getAffectedRoomNumbers(state.rooms, state.guests[0]).sort(),
    [201, 202, 301, 302],
  );
});

test('6. Zone 내부 NORMAL_DISEASE 확률은 0이다', () => {
  const room = placeEleanor(301).rooms.find((item) => item.roomNumber === 202)!;
  assert.equal(getDiseaseChance(room, 'NORMAL_DISEASE', 25), 0);
  assert.equal(getDiseaseChance(room, 'MONSTER_INFECTION', 25), 25);
});

test('7. Zone 외부 객실은 영향을 받지 않는다', () => {
  const room = placeEleanor(301).rooms.find((item) => item.roomNumber === 210)!;
  assert.equal(getDiseaseChance(room, 'NORMAL_DISEASE', 25), 25);
});

test('8. 체크아웃하면 Aura가 제거된다', () => {
  const state = placeEleanor(301);
  const guests = state.guests.map((guest) => ({
    ...guest,
    currentRoomNumber: null,
  }));
  const rooms = recalculateRoomEffects(
    checkoutGuest(state.rooms, ELEANOR_ID),
    guests,
  );
  assert.equal(
    rooms.some((room) => room.temporaryEffects.length > 0),
    false,
  );
});

test('9. 객실 이동 시 Aura 범위가 재계산된다', () => {
  const state = placeEleanor(301);
  const guests = state.guests.map((guest) => ({
    ...guest,
    currentRoomNumber: 110,
  }));
  const rooms = recalculateRoomEffects(
    moveGuest(state.rooms, ELEANOR_ID, 110),
    guests,
  );
  assert.equal(
    rooms.find((room) => room.roomNumber === 301)?.temporaryEffects.length,
    0,
  );
  assert.ok(
    rooms.find((room) => room.roomNumber === 109)?.temporaryEffects.length,
  );
});

test('10. 저장 복원 후 객실 위치와 Aura가 복구된다', () => {
  const restored = restoreGameState(serializeGameState(placeEleanor(301)));
  assert.equal(restored.guests[0].currentRoomNumber, 301);
  assert.equal(
    getDiseaseChance(
      restored.rooms.find((room) => room.roomNumber === 202)!,
      'NORMAL_DISEASE',
      25,
    ),
    0,
  );
});

test('11. 손상된 저장에서 한 NPC가 여러 객실을 점유하면 현재 객실 하나만 복원한다', () => {
  const state = placeEleanor(301);
  state.rooms = state.rooms.map((room) =>
    [202, 205].includes(room.roomNumber)
      ? {
          ...room,
          occupied: true,
          guestId: ELEANOR_ID,
          status: 'OCCUPIED' as const,
        }
      : room,
  );
  const restored = restoreGameState(JSON.stringify(state));
  const occupied = restored.rooms.filter((room) => room.guestId === ELEANOR_ID);
  assert.deepEqual(
    occupied.map((room) => room.roomNumber),
    [301],
  );
  assert.equal(
    restored.guests.find((guest) => guest.id === ELEANOR_ID)?.currentRoomNumber,
    301,
  );
});

test('12. 두 투숙객의 현재 객실이 충돌하면 저장된 실제 점유자를 유지하고 다른 빈방으로 복구한다', () => {
  const state = placeEleanor(202);
  state.guests = state.guests.map((guest) =>
    guest.id === 'samuel'
      ? {
          ...guest,
          status: 'STAYING' as const,
          currentRoomNumber: 202,
          checkedInDay: 2,
        }
      : guest,
  );
  state.rooms = state.rooms.map((room) =>
    room.roomNumber === 202
      ? {
          ...room,
          occupied: true,
          guestId: 'samuel',
          status: 'OCCUPIED' as const,
        }
      : room,
  );
  const restored = restoreGameState(JSON.stringify(state));
  const eleanor = restored.guests.find((guest) => guest.id === ELEANOR_ID)!;
  const samuel = restored.guests.find((guest) => guest.id === 'samuel')!;
  assert.equal(samuel.currentRoomNumber, 202);
  assert.notEqual(eleanor.currentRoomNumber, 202);
  assert.equal(
    restored.rooms.filter((room) => room.guestId === ELEANOR_ID).length,
    1,
  );
  assert.equal(
    restored.rooms.filter((room) => room.guestId === 'samuel').length,
    1,
  );
});

test('13. 파손된 선호 객실은 점유하지 않고 사용 가능한 빈방으로 복구한다', () => {
  const state = placeEleanor(301);
  state.rooms = state.rooms.map((room) =>
    room.roomNumber === 301
      ? { ...room, status: 'DAMAGED' as const, occupied: false, guestId: null }
      : room,
  );
  const restored = restoreGameState(JSON.stringify(state));
  const eleanor = restored.guests.find((guest) => guest.id === ELEANOR_ID)!;
  assert.notEqual(eleanor.currentRoomNumber, 301);
  assert.equal(
    restored.rooms.find((room) => room.roomNumber === 301)?.status,
    'DAMAGED',
  );
  assert.equal(
    restored.rooms.filter((room) => room.guestId === ELEANOR_ID).length,
    1,
  );
});

test('14. 객실 그리드는 하드코딩 이름 대신 실제 점유 NPC 이름을 표시한다', () => {
  const state = createEstablishedHotel();
  const room = assignGuest(state.rooms, 202, 'samuel').find(
    (candidate) => candidate.roomNumber === 202,
  )!;
  assert.equal(getRoomOccupantLabel(room, state.guests), '새뮤얼');
  assert.equal(
    getRoomOccupantLabel({ ...room, guestId: 'missing' }, state.guests),
    '사용 중',
  );
  assert.equal(
    getRoomOccupantLabel({ ...room, guestId: null }, state.guests),
    '사용 중',
  );
});

test('15. Aura가 없는 NPC는 객실 영향 범위와 잘못된 라벨을 만들지 않는다', () => {
  const state = createEstablishedHotel();
  const guest = { ...state.guests[0], aura: null, currentRoomNumber: 203 };
  assert.deepEqual(getAffectedRoomNumbers(state.rooms, guest), []);
});

test('16. 빈 객실·파손·봉쇄 상태는 객실 화면에 한국어로 표시된다', () => {
  const state = createEstablishedHotel();
  const [empty, damaged, locked] = state.rooms.slice(0, 3);
  assert.equal(getRoomOccupantLabel(empty, state.guests), '비어 있음');
  assert.equal(
    getRoomOccupantLabel({ ...damaged, status: 'DAMAGED' }, state.guests),
    '파손',
  );
  assert.equal(
    getRoomOccupantLabel({ ...locked, status: 'LOCKED' }, state.guests),
    '봉쇄',
  );
});

test('17. 손상 저장의 객실 상태 수치는 0~100 범위의 유효한 값으로 복구된다', () => {
  const state = createEstablishedHotel();
  state.rooms[0].roomCondition = Number.NaN;
  state.rooms[1].roomCondition = 500;
  state.rooms[2].roomCondition = -20;
  const restored = restoreGameState(JSON.stringify(state));
  assert.equal(restored.rooms[0].roomCondition, 100);
  assert.equal(restored.rooms[1].roomCondition, 100);
  assert.equal(restored.rooms[2].roomCondition, 0);
});
