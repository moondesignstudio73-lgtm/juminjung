import type { GameState, Guest, Resources } from './types.ts';
import { isRoomSelectable } from './room-manager.ts';

const RESOURCE_NAMES: Record<keyof Resources, string> = {
  food: '식량',
  water: '물',
  medicine: '의약품',
  fuel: '연료',
  parts: '부품',
  security: '보안 물자',
};

export type HotelPolicyTransition = {
  availableRooms: number;
  residents: number;
  recentRefusals: number;
  roomPressure: string;
  supplyPressure: string;
  facilityPressure: string;
  storyBody: string;
};

export function getHotelPolicyTransition(
  state: Pick<
    GameState,
    'day' | 'rooms' | 'guests' | 'resources' | 'visitorHistory' | 'facilityState'
  >,
): HotelPolicyTransition {
  const availableRooms = state.rooms.filter(isRoomSelectable).length;
  const residents = state.guests.filter(
    (guest) => guest.alive && guest.status === 'STAYING',
  ).length;
  const recentRefusals = state.visitorHistory
    .filter(
      (record) =>
        record.lastVisitDay >= Math.max(1, state.day - 1) &&
        record.finalState === 'REFUSED',
    ).length;
  const roomPressure =
    availableRooms === 0
      ? recentRefusals > 0
        ? `열쇠걸이가 모두 비었습니다. 최근 돌려보낸 방문자도 ${recentRefusals}명입니다.`
        : '열쇠걸이가 모두 비었습니다. 다음 방문자에게 내어 줄 빈 객실이 없습니다.'
      : availableRooms === 1
        ? '프런트에 남은 빈 객실 열쇠는 이제 하나뿐입니다.'
        : `찾아오는 발걸음이 늘었습니다. 지금 남은 빈 객실은 ${availableRooms}개입니다.`;
  const supplyPressure =
    residents === 0
      ? `식량 ${state.resources.food}, 물 ${state.resources.water}. 문을 열기 전에 비축량부터 세어야 합니다.`
      : `현재 ${residents}명이 머뭅니다. 남은 식량 ${state.resources.food}, 물 ${state.resources.water}을 모두의 밤까지 나눠야 합니다.`;
  const generatorCondition = state.facilityState?.generator?.condition ?? 82;
  const facilityPressure = `발전기 내구도 ${generatorCondition}%. 아직 위험하지 않지만 늘어난 사용량을 점검해야 합니다.`;
  return {
    availableRooms,
    residents,
    recentRefusals,
    roomPressure,
    supplyPressure,
    facilityPressure,
    storyBody: `${roomPressure} ${supplyPressure} 아버지의 장부 마지막 여백에는 짧은 문장이 남아 있었습니다. “호의만으로 호텔은 굴러가지 않는다.” 당신은 프런트 입구에 낡은 판자를 걸고, 내일부터 방을 원하는 사람의 말과 가져온 물자를 함께 확인하기로 합니다.`,
  };
}

export function getDayFourMorningBrief(state: GameState): string[] {
  const transition = getHotelPolicyTransition(state);
  return [
    '오늘부터 JUJU HOTEL은 피난처가 아니라, 지켜서 운영해야 하는 생존 호텔입니다.',
    transition.roomPressure,
    transition.supplyPressure,
    '새 숙박 규칙 · 방문자의 말과 제공 물자를 확인한 뒤 입실을 결정합니다.',
  ];
}

export function getLodgingContribution(
  guest: Pick<Guest, 'offer' | 'negotiatedOffer'>,
  negotiated = false,
): Array<{ resource: keyof Resources; label: string; amount: number; extra: boolean }> {
  return (Object.keys(RESOURCE_NAMES) as Array<keyof Resources>).flatMap(
    (resource) => {
      const base = Number(guest.offer[resource] ?? 0);
      const extra = negotiated ? Number(guest.negotiatedOffer[resource] ?? 0) : 0;
      const amount = base + extra;
      return amount > 0
        ? [{ resource, label: RESOURCE_NAMES[resource], amount, extra: extra > 0 }]
        : [];
    },
  );
}
