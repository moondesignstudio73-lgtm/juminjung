import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hotelCapacity,
  roomCaption,
  saveOverview,
  changeTone,
  canUseShortcut,
} from '../game/ui-guidance.ts';
import {
  createInitialGameState,
  saveBrowserGame,
  saveManualGame,
  loadManualGame,
  getManualSaveSummaries,
} from '../game/save-manager.ts';
test('장부와 저장 요약은 30개 중 실제 개방된 5개 객실만 센다', () => {
  const state = createInitialGameState();
  assert.deepEqual(hotelCapacity(state.rooms), { open: 5, occupied: 0 });
  assert.equal(saveOverview(state).open, 5);
  assert.notEqual(
    roomCaption(
      state.rooms.find((r) => r.status === 'LOCKED')!,
      state.guests,
    ),
    '빈 객실',
  );
});
test('자원과 위험의 색상 의미가 서로 반대이며 시간은 중립이다', () => {
  assert.equal(changeTone('food', 10, 9), 'negative');
  assert.equal(changeTone('범죄 위험', 10, 9), 'positive');
  assert.equal(changeTone('경과 시간(분)', 0, 30), 'neutral');
});
test('입력·모달·브라우저 조합키에서는 게임 단축키를 무시한다', () => {
  const e = { altKey: false, ctrlKey: false, metaKey: false, repeat: false };
  assert.equal(canUseShortcut(e, null), true);
  assert.equal(canUseShortcut({ ...e, ctrlKey: true }, null), false);
  assert.equal(canUseShortcut(e, null, true), false);
  assert.equal(
    canUseShortcut(e, { closest: () => ({}) } as unknown as Element),
    false,
  );
});
test('슬롯 저장은 실제 주민·객실 메타데이터를 보존하고 손상 기록은 불러오지 않는다', () => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (k: string) => entries.get(k) ?? null,
        setItem: (k: string, v: string) => entries.set(k, v),
      },
    },
  });
  try {
    const s = createInitialGameState();
    assert.equal(saveManualGame(1, s, 123), true);
    assert.equal(getManualSaveSummaries()[0].open, 5);
    assert.equal(loadManualGame(1)?.rooms.length, 30);
    entries.set('juju-hotel-manual-save-1', '{"state":{}}');
    assert.equal(loadManualGame(1), null);
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          setItem: () => {
            throw Error('quota');
          },
          getItem: () => {
            throw Error('denied');
          },
        },
      },
    });
    assert.equal(saveManualGame(1, s), false);
    assert.equal(saveBrowserGame(s), false);
    assert.equal(loadManualGame(1), null);
  } finally {
    if (prior) Object.defineProperty(globalThis, 'window', prior);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
