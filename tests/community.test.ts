import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGameState,
  restoreGameState,
  serializeGameState,
} from '../game/save-manager.ts';
import { createNormalVisitor } from '../game/normal-visitor-data.ts';
import {
  assignGuest,
  isRoomSelectable,
  createRooms,
} from '../game/room-manager.ts';
import { resolveDay } from '../game/day-manager.ts';
import {
  beginNightShift,
  moveNightLocation,
} from '../game/night-work-manager.ts';
import {
  communityProfile,
  INITIAL_OPEN_ROOMS,
  ROOM_DAMAGE,
} from '../game/community-data.ts';
import {
  expelResident,
  recoveryQuote,
  restoreRoom,
} from '../game/community-manager.ts';
import {
  getNightFoodDemand,
  getNightWaterDemand,
} from '../game/aura-night-manager.ts';
import { performHotelAction } from '../game/hotel-action-manager.ts';
import { advanceHotelStories } from '../game/story-event-manager.ts';
import type { GameState } from '../game/types.ts';

test('resident story records grow with residence age instead of zero compatibility nights',()=>{
 const state=residentState();const first=advanceHotelStories(state.guests,1,state.rooms);
 assert.equal(first.guests[0].eventChain.find(e=>e.stage==='CONFLICT')?.completed,false);
 const third=advanceHotelStories(first.guests,3,state.rooms);
 assert.equal(third.guests[0].eventChain.find(e=>e.stage==='CONFLICT')?.completed,true);
 assert.equal(third.guests[0].eventChain.find(e=>e.stage==='RESOLUTION')?.completed,false);
 const seventh=advanceHotelStories(third.guests,7,state.rooms);
 assert.equal(seventh.guests[0].eventChain.find(e=>e.stage==='RESOLUTION')?.completed,true);
 assert.equal(seventh.guests[0].status,'STAYING');
});

function residentState(): GameState {
  const state = createInitialGameState();
  const guest = {
    ...createNormalVisitor(42, 5, 0),
    status: 'STAYING' as const,
    currentRoomNumber: 205,
    checkedInDay: 1,
    health: 100,
    stress: 10,
  };
  return {
    ...state,
    day: 5,
    phase: 'desk',
    guests: [guest],
    rooms: assignGuest(state.rooms, 205, guest.id),
    resources: {
      ...state.resources,
      food: 300,
      water: 300,
      parts: 30,
      medicine: 20,
    },
  };
}
function workState() {
  return moveNightLocation(beginNightShift(residentState()), 'rooms');
}
test('A: normal resident remains housed for ten real night settlements', () => {
  let state = residentState();
  const id = state.guests[0].id;
  for (let i = 0; i < 10; i++) {
    state = resolveDay({ ...state, phase: 'night' });
    assert.equal(state.guests.find((g) => g.id === id)?.status, 'STAYING');
  }
  assert.equal(state.guests[0].currentRoomNumber, 205);
  assert.equal(
    state.eventHistory.some((e) => e.type === 'CHECK_OUT'),
    false,
  );
});
test('B: expulsion frees room and duty, stops consumption, records human consequence once', () => {
  const state = residentState(),
    id = state.guests[0].id;
  state.staffAssignments = { MAINTENANCE: id };
  const next = expelResident(state, id);
  assert.equal(next.guests[0].residency, 'EXPELLED');
  assert.equal(next.guests[0].revisitPolicy, 'NEVER');
  assert.equal(next.staffAssignments.MAINTENANCE, undefined);
  assert.equal(next.rooms.find((r) => r.roomNumber === 205)?.status, 'EMPTY');
  assert.equal(getNightFoodDemand(next.rooms, next.guests).demand, 0);
  assert.equal(getNightWaterDemand(next.guests).demand, 0);
  assert.equal(expelResident(next, id), next);
  assert.match(next.eventHistory.at(-1)!.message, /열쇠/);
});
test('C/D: fresh game has five usable rooms and typed repair requirements for 25 others', () => {
  const state = createInitialGameState();
  assert.deepEqual(
    state.rooms.filter(isRoomSelectable).map((r) => r.roomNumber),
    INITIAL_OPEN_ROOMS,
  );
  const locked = state.rooms.filter((r) => r.status === 'LOCKED');
  assert.equal(locked.length, 25);
  assert.ok(new Set(locked.map((r) => r.recovery?.damage)).size >= 3);
  for (const room of locked) {
    assert.ok(ROOM_DAMAGE[room.recovery!.damage].parts > 0);
    assert.ok(recoveryQuote(state, room.roomNumber).blocked);
  }
});
test('E: direct restoration spends exactly quoted resources and time once, survives load', () => {
  const state = workState(),
    quote = recoveryQuote(state, 202);
  assert.equal(quote.blocked, null);
  const next = restoreRoom(state, 202);
  assert.equal(next.resources.parts, state.resources.parts - quote.parts);
  assert.equal(
    next.nightShift!.elapsedMinutes,
    state.nightShift!.elapsedMinutes! + quote.minutes,
  );
  assert.equal(next.rooms.find((r) => r.roomNumber === 202)?.status, 'EMPTY');
  assert.equal(restoreRoom(next, 202), next);
  const restored = restoreGameState(serializeGameState(next));
  assert.equal(
    restored.rooms.find((r) => r.roomNumber === 202)?.recovery?.restored,
    true,
  );
  assert.equal(
    restored.rooms.filter(isRoomSelectable).length,
    next.rooms.filter(isRoomSelectable).length,
  );
});
test('F: relevant profession reduces costs/time and records work; injured helpers cannot work', () => {
  const state = workState(),
    worker = state.guests[0];
  worker.community = {
    ...communityProfile(worker),
    job: 'CARPENTER',
    traits: ['STEADY'],
  };
  const direct = recoveryQuote(state, 202),
    help = recoveryQuote(state, 202, worker.id);
  assert.equal(help.blocked, null);
  assert.ok(help.parts < direct.parts);
  assert.ok(help.minutes < direct.minutes);
  const next = restoreRoom(state, 202, worker.id);
  assert.equal(next.guests[0].community?.repairsCompleted, 1);
  assert.equal(next.guests[0].stress, worker.stress + 8);
  assert.ok(
    recoveryQuote(
      { ...state, guests: [{ ...worker, health: 5 }] },
      202,
      worker.id,
    ).blocked,
  );
});
test('G: full hotel refuses sixth room assignment; generic hotel repair cannot bypass expansion', () => {
  let state = residentState();
  for (const room of state.rooms.filter(isRoomSelectable))
    state = {
      ...state,
      rooms: assignGuest(
        state.rooms,
        room.roomNumber,
        `occupant-${room.roomNumber}`,
      ),
    };
  assert.equal(state.rooms.some(isRoomSelectable), false);
  assert.throws(() => assignGuest(state.rooms, 202, 'sixth'));
  const result = performHotelAction(state, 'repair_hotel');
  assert.equal(
    result.state.rooms.filter((r) => r.status === 'LOCKED').length,
    25,
  );
});
test('H: legacy residents migrate without closing any established rooms or reviving departed residents', () => {
  const state = residentState();
  state.guests[0].residency = 'TEMPORARY';
  state.guests[0].remainingNights = 1;
  delete state.guests[0].community;
  state.rooms = assignGuest(
    createRooms({ restored: true }),
    205,
    state.guests[0].id,
  );
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(
    restored.guests.find((g) => g.id === state.guests[0].id)?.residency,
    'RESIDENT',
  );
  assert.equal(restored.rooms.filter((r) => r.status === 'LOCKED').length, 0);
  const expelled = expelResident(restored, state.guests[0].id);
  assert.equal(
    restoreGameState(serializeGameState(expelled)).guests.find(
      (g) => g.id === state.guests[0].id,
    )?.status,
    'CHECKED_OUT',
  );
});
test('restoration rejects future floors, insufficient supplies, late night, and settled phases', () => {
  const state = workState();
  assert.equal(restoreRoom(state, 301), state);
  const poor = { ...state, resources: { ...state.resources, parts: 0 } };
  assert.equal(restoreRoom(poor, 202), poor);
  const late = {
    ...state,
    nightShift: { ...state.nightShift!, elapsedMinutes: 350 },
  };
  assert.equal(restoreRoom(late, 202), late);
  const settled = { ...state, phase: 'night' as const };
  assert.equal(restoreRoom(settled, 202), settled);
});
test('personal food/water values affect the same demand used by daily settlement', () => {
  const state = residentState(),
    g = state.guests[0];
  g.aura = null;
  g.community = { ...communityProfile(g), consumption: { food: 3, water: 2 } };
  assert.equal(getNightFoodDemand(state.rooms, state.guests).demand, 3);
  assert.equal(getNightWaterDemand(state.guests).demand, 2);
});
