import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGameState, restoreGameState, serializeGameState } from '../game/save-manager.ts';
import {
  getDayFourMorningBrief,
  getHotelPolicyTransition,
  getLodgingContribution,
} from '../game/day-four-transition.ts';
import { queueHotelPolicyTransition } from '../game/cutscene-manager.ts';
import {
  beginNightShift,
  generatorState,
  inspectGenerator,
  moveNightLocation,
} from '../game/night-work-manager.ts';
import type { GameState } from '../game/types.ts';

const dayFour = (): GameState => ({
  ...createInitialGameState(),
  day: 4,
  phase: 'report',
});

test('DAY 3 종료 뒤 운영 규칙 전환 장면은 한 번만 열린다', () => {
  const state = dayFour();
  const queued = queueHotelPolicyTransition(state, 3);
  assert.equal(queued.activeCutsceneId, 'hotel_policy_changed');
  assert.equal(queueHotelPolicyTransition(state, 2), state);
  const seen = { ...queued, activeCutsceneId: null, seenCutsceneIds: ['hotel_policy_changed' as const] };
  assert.equal(queueHotelPolicyTransition(seen, 3), seen);
});

test('객실 압박 문구는 실제 빈 객실과 최근 거절 기록을 과장하지 않는다', () => {
  const roomy = getHotelPolicyTransition(dayFour());
  assert.match(roomy.roomPressure, new RegExp(`빈 객실은 ${roomy.availableRooms}개`));
  assert.doesNotMatch(roomy.roomPressure, /돌려보낸/);

  const oneRoomState = dayFour();
  const selectable = oneRoomState.rooms.filter((room) => room.status === 'EMPTY');
  oneRoomState.rooms = oneRoomState.rooms.map((room) =>
    selectable.slice(1).some((open) => open.roomNumber === room.roomNumber)
      ? { ...room, status: 'LOCKED' as const }
      : room,
  );
  assert.match(getHotelPolicyTransition(oneRoomState).roomPressure, /하나뿐/);

  oneRoomState.rooms = oneRoomState.rooms.map((room) =>
    room.status === 'EMPTY' ? { ...room, status: 'LOCKED' as const } : room,
  );
  oneRoomState.visitorHistory = [{
    visitorId: 'eleanor', firstVisitDay: 3, lastVisitDay: 3,
    acceptedCount: 0, refusedCount: 1, roomsStayed: [], itemsPaid: {},
    events: ['거절'], finalState: 'REFUSED',
  }];
  assert.match(getHotelPolicyTransition(oneRoomState).roomPressure, /돌려보낸 방문자도 1명/);
});

test('DAY 4 아침 보고와 숙박 대가는 실제 상태 및 협상 결과를 사용한다', () => {
  const state = dayFour();
  state.resources.food = 7;
  state.resources.water = 9;
  const brief = getDayFourMorningBrief(state);
  assert.equal(brief.length, 4);
  assert.match(brief[0], /생존 호텔/);
  assert.match(brief[2], /식량 7, 물 9/);

  const guest = state.guests.find((candidate) => candidate.id === 'samuel')!;
  const base = getLodgingContribution(guest);
  const negotiated = getLodgingContribution(guest, true);
  assert.ok(base.some((entry) => entry.resource === 'security' && entry.amount === 5));
  assert.ok(negotiated.find((entry) => entry.resource === 'security')!.amount > 5);
  assert.ok(negotiated.some((entry) => entry.extra));
});

test('전환 장면과 아침 보고는 저장 후에도 동일하게 복원된다', () => {
  const state = queueHotelPolicyTransition(dayFour(), 3);
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.activeCutsceneId, 'hotel_policy_changed');
  assert.deepEqual(getDayFourMorningBrief(restored), getDayFourMorningBrief(state));
});

test('DAY 4 첫 시설 사용은 발전기 상태를 확인하는 경미한 점검이다', () => {
  const started = beginNightShift({ ...dayFour(), phase: 'desk' });
  const atGenerator = moveNightLocation(started, 'generator');
  const before = generatorState(atGenerator);
  const inspected = inspectGenerator(atGenerator);
  assert.equal(generatorState(inspected).lastInspectedDay, 4);
  assert.equal(generatorState(inspected).condition, before.condition);
  assert.equal(
    inspected.eventHistory.at(-1)?.message.startsWith('발전기 점검 완료'),
    true,
  );
});
