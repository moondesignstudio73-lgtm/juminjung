import type { Guest, Room } from './types.ts';
import { getAffectedRoomNumbers } from './aura-effect-manager.ts';
import { isRoomSelectable } from './room-manager.ts';

export type PlacementProfile = NonNullable<Guest['placement']>;
export type RoomPositionKind = 'CENTER' | 'EDGE' | 'STANDARD';

// These describe topology, not new bonuses. Floor/facility strategies can be
// added when the simulation actually implements the corresponding effects.
export function getRoomPositionKind(
  room: Room,
  rooms: Room[],
): RoomPositionKind {
  const row = rooms.filter((candidate) => candidate.floor === room.floor);
  const xs = row.map((candidate) => candidate.position.x);
  const left = Math.min(...xs),
    right = Math.max(...xs);
  if (room.position.x === left || room.position.x === right) return 'EDGE';
  const middle = (left + right) / 2;
  return Math.abs(room.position.x - middle) <= 0.5 ? 'CENTER' : 'STANDARD';
}

export function getPlacementProfile(guest: Guest): PlacementProfile | null {
  if (guest.placement) return guest.placement;
  // Only public, implemented abilities are inferred; hidden traits never leak.
  const aura = guest.aura;
  if (!aura || aura.radius !== 1 || aura.distance !== 'CHEBYSHEV') return null;
  const beneficial = [
    'MEDICAL',
    'MAINTENANCE',
    'FOOD',
    'SECURITY',
    'MENTAL',
  ].includes(aura.category);
  if (!beneficial) return null;
  return {
    tags: ['support'],
    recommended: 'CENTER',
    avoid: ['EDGE'],
    reason: `${aura.name}의 주변 객실 지원`,
  };
}

export function getRecommendedRooms(guest: Guest, rooms: Room[]): number[] {
  const profile = getPlacementProfile(guest);
  if (!profile) return [];
  const candidates = rooms.filter(
    (room) =>
      isRoomSelectable(room) &&
      getRoomPositionKind(room, rooms) === profile.recommended,
  );
  if (profile.recommended === 'EDGE')
    return candidates.map((room) => room.roomNumber);
  const reach = (room: Room) =>
    getAffectedRoomNumbers(rooms, {
      ...guest,
      currentRoomNumber: room.roomNumber,
    }).length;
  const best = Math.max(0, ...candidates.map(reach));
  return candidates
    .filter((room) => reach(room) === best)
    .map((room) => room.roomNumber);
}

export function getPlacementDescription(room: Room, rooms: Room[]) {
  const kind = getRoomPositionKind(room, rooms);
  if (kind === 'CENTER')
    return {
      title: '중앙 객실',
      text: '양쪽에 방을 두고 지원 범위를 활용하기 좋은 위치입니다. 중앙이라는 이유로 별도 보너스가 붙지는 않습니다.',
    };
  if (kind === 'EDGE')
    return {
      title: '끝 객실',
      text: '주변 방이 적어 접촉을 줄이려는 배치에 적합합니다. 위·아래층에도 영향이 닿을 수 있으며, 완전 격리나 감염 차단을 보장하지 않습니다.',
    };
  return {
    title: '일반 객실',
    text: '특별한 위치 보너스는 없습니다. 지도에 표시된 실제 범위와 주변 투숙객을 함께 살펴보세요. 2층 안쪽 방은 중앙과 같은 수의 방에 닿을 수 있습니다.',
  };
}

export function getPlacementFeedback(
  guest: Guest,
  room: Room,
  rooms: Room[],
): string {
  const profile = getPlacementProfile(guest);
  const kind = getRoomPositionKind(room, rooms);
  if (profile?.recommended === kind)
    return (
      '좋은 배치입니다. ' +
      profile.reason +
      '에 맞는 위치입니다. 주변 방에 누가 머무는지도 살펴보세요.'
    );
  if (kind !== 'STANDARD' && profile?.avoid.includes(kind))
    return (
      '배치 가능합니다. 다만 ' +
      (kind === 'EDGE'
        ? '지원형 능력은 주변 객실이 적으면 활용도가 낮아질 수 있습니다.'
        : '이 투숙객은 주변 방과 거리를 두는 편이 나을 수 있습니다.')
    );
  return '배치 완료. 앞으로 투숙객의 능력과 주변 객실을 함께 고려해보세요.';
}
