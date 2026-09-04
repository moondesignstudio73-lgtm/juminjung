import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGamePhase } from '../game/game-phase.ts';
import {
  createInitialGameState,
  restoreGameState,
  serializeGameState,
} from '../game/save-manager.ts';

for (const phase of ['assignment', 'management']) {
  void test(`이전 ${phase} 저장은 프론트로 복원하고 진행·객실을 보존한다`, () => {
    const state = createInitialGameState();
    state.day = 5;
    state.visitorQueueDay = 5;
    state.dailyVisitorQueue = [state.guests[0].id];
    const restored = restoreGameState(
      JSON.stringify({
        ...state,
        phase,
        assignmentMode: 'checkin',
        selectedRoomNumber: 301,
      }),
    );
    assert.equal(restored.phase, 'desk');
    assert.equal(restored.day, 5);
    assert.deepEqual(restored.dailyVisitorQueue, state.dailyVisitorQueue);
    assert.deepEqual(restored.resources, state.resources);
    assert.equal(
      restored.rooms.find((room) => room.roomNumber === 301)?.guestId,
      null,
    );
    const saved = JSON.parse(serializeGameState(restored));
    assert.equal('assignmentMode' in saved, false);
    assert.equal('selectedRoomNumber' in saved, false);
  });
}

void test('컷신·야간·결과·엔딩 단계는 이관으로 변경되지 않는다', () => {
  for (const phase of [
    'title',
    'prologue',
    'desk',
    'story',
    'night',
    'report',
    'ending',
  ])
    assert.equal(normalizeGamePhase(phase), phase);
  assert.equal(normalizeGamePhase('corrupted'), 'title');
});
