import type { GameState } from './types.ts';
import { getPlacementFeedback } from './placement-guidance.ts';
export type ValueChange = { resource: string; before: number; after: number };
export type ActionFeedback = {
  type: string;
  title: string;
  changes: ValueChange[];
  effects: string[];
};
export const RESOURCE_LABELS: Record<string, string> = {
  food: '식량',
  water: '물',
  fuel: '연료',
  medicine: '의약품',
  parts: '부품',
  security: '보안 물자',
  guests: '투숙객',
  rooms: '사용 객실',
  ap: '행동 포인트',
};
export function resourceChanges(
  before: GameState,
  after: GameState,
): ValueChange[] {
  return Object.keys(before.resources).flatMap((key) => {
    const b = before.resources[key as keyof GameState['resources']],
      a = after.resources[key as keyof GameState['resources']];
    return b === a ? [] : [{ resource: key, before: b, after: a }];
  });
}
export function getActionFeedback(
  before: GameState,
  after: GameState,
): ActionFeedback | null {
  if (
    before.day !== after.day ||
    !['desk', 'story'].includes(before.phase) ||
    !['desk', 'story', 'night'].includes(after.phase)
  )
    return null;
  const changes = resourceChanges(before, after);
  for (const [key, label] of [
    ['security', '호텔 안전도'],
    ['hotelCondition', '호텔 상태'],
    ['crime', '범죄 위험'],
  ] as const) {
    if (before.hotelStats[key] !== after.hotelStats[key])
      changes.push({
        resource: label,
        before: before.hotelStats[key],
        after: after.hotelStats[key],
      });
  }
  const count = (s: GameState) =>
    s.guests.filter((g) => g.status === 'STAYING' && g.alive).length;
  for (const [resource, b, a] of [
    ['guests', count(before), count(after)],
    [
      'rooms',
      before.rooms.filter((r) => r.occupied).length,
      after.rooms.filter((r) => r.occupied).length,
    ],
    ['ap', before.actionPoints, after.actionPoints],
  ] as const) {
    if (b !== a) changes.push({ resource, before: b, after: a });
  }
  const arriving = after.guests.find(
    (g) =>
      g.status === 'STAYING' &&
      before.guests.find((old) => old.id === g.id)?.status !== 'STAYING',
  );
  const leaving = before.guests.find(
    (g) =>
      g.status === 'STAYING' &&
      after.guests.find((next) => next.id === g.id)?.status !== 'STAYING',
  );
  const moved = after.guests.find(
    (g) =>
      g.status === 'STAYING' &&
      before.guests.find(
        (old) =>
          old.id === g.id &&
          old.status === 'STAYING' &&
          old.currentRoomNumber !== g.currentRoomNumber,
      ),
  );
  const logs = after.eventHistory.slice(before.eventHistory.length);
  const effects: string[] = [];
  const active = arriving ?? moved;
  if (active?.aura)
    effects.push(
      `${active.aura.name} ${moved ? '범위 변경' : '활성화'} · ${active.currentRoomNumber}호 기준, 회복·운영 효과는 야간 정산에 적용`,
    );
  if (arriving && after.day === 1) {
    const room = after.rooms.find(
      (r) => r.roomNumber === arriving.currentRoomNumber,
    );
    if (room) effects.push(getPlacementFeedback(arriving, room, after.rooms));
  }
  if (moved)
    effects.push(
      `${before.guests.find((g) => g.id === moved.id)?.currentRoomNumber}호 → ${moved.currentRoomNumber}호`,
    );
  if (!active && logs.length) effects.push(logs.at(-1)!.message);
  if (!changes.length && !effects.length && !leaving) return null;
  return {
    type: arriving
      ? 'CHECK_IN'
      : leaving
        ? 'CHECK_OUT'
        : moved
          ? 'ROOM_MOVE'
          : 'ACTION',
    title: arriving
      ? `${arriving.name} 체크인`
      : leaving
        ? `${leaving.name} 체크아웃`
        : moved
          ? `${moved.name} 객실 이동`
          : '호텔 운영 기록',
    changes,
    effects,
  };
}
