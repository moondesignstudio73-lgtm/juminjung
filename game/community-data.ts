import type { Guest, Room } from './types.ts';
export const INITIAL_OPEN_ROOMS = [201, 204, 205, 206, 207];
export type RoomDamage =
  | 'PLUMBING'
  | 'DOOR'
  | 'CONTAMINATION'
  | 'ELECTRICAL'
  | 'STRUCTURE';
export const ROOM_DAMAGE = {
  PLUMBING: {
    label: '수도 파손',
    job: 'PLUMBER',
    parts: 4,
    medicine: 0,
    minutes: 180,
  },
  DOOR: {
    label: '문과 벽 파손',
    job: 'CARPENTER',
    parts: 3,
    medicine: 0,
    minutes: 150,
  },
  CONTAMINATION: {
    label: '곰팡이 오염',
    job: 'CLEANER',
    parts: 1,
    medicine: 2,
    minutes: 120,
  },
  ELECTRICAL: {
    label: '전기 단절',
    job: 'ELECTRICIAN',
    parts: 4,
    medicine: 0,
    minutes: 180,
  },
  STRUCTURE: {
    label: '구조 손상',
    job: 'ENGINEER',
    parts: 6,
    medicine: 0,
    minutes: 240,
  },
} as const;
export const JOB_NAMES: Record<string, string> = {
  ENGINEER: '정비공',
  PLUMBER: '배관공',
  CARPENTER: '목수',
  CLEANER: '청소 담당',
  ELECTRICIAN: '전기기사',
  DOCTOR: '의료인',
  COOK: '요리사',
  SECURITY: '경비',
  MERCHANT: '상인',
  SCAVENGER: '탐색가',
  RESIDENT: '생존자',
};
export function communityProfile(
  guest: Guest,
): NonNullable<Guest['community']> {
  if (guest.community) {
    const saved = guest.community;
    const finite = (value: unknown, fallback: number, max: number) =>
      typeof value === 'number' && Number.isFinite(value)
        ? Math.max(1, Math.min(max, value))
        : fallback;
    return {
      job: JOB_NAMES[saved.job] ? saved.job : 'RESIDENT',
      traits: Array.isArray(saved.traits)
        ? saved.traits
            .filter((t) => ['CAREFUL', 'FAST_WASTEFUL', 'STEADY'].includes(t))
            .slice(0, 1)
        : ['STEADY'],
      consumption: {
        food: finite(saved.consumption?.food, 1, 5),
        water: finite(saved.consumption?.water, 1, 5),
      },
      repairsCompleted:
        typeof saved.repairsCompleted === 'number' &&
        Number.isFinite(saved.repairsCompleted)
          ? Math.max(0, Math.floor(saved.repairsCompleted))
          : 0,
    };
  }
  const role = guest.role;
  const job = /배관/.test(role)
    ? 'PLUMBER'
    : /목수/.test(role)
      ? 'CARPENTER'
      : /청소|미화/.test(role)
        ? 'CLEANER'
        : /전기/.test(role)
          ? 'ELECTRICIAN'
          : /정비|기술|엔지니어/.test(role)
            ? 'ENGINEER'
            : /의사|간호|의료/.test(role)
              ? 'DOCTOR'
              : /요리|주방/.test(role)
                ? 'COOK'
                : /경비|군인|경찰/.test(role)
                  ? 'SECURITY'
                  : /상인/.test(role)
                    ? 'MERCHANT'
                    : /탐색|정찰/.test(role)
                      ? 'SCAVENGER'
                      : 'RESIDENT';
  const seed = [...guest.id].reduce((n, c) => n + c.charCodeAt(0), 0);
  return {
    job,
    traits: [(['CAREFUL', 'FAST_WASTEFUL', 'STEADY'] as const)[seed % 3]],
    consumption: {
      food:
        guest.npcType === 'NORMAL' && ['ENGINEER', 'CARPENTER'].includes(job)
          ? 2
          : 1,
      water: 1,
    },
    repairsCompleted: 0,
  };
}
export function roomRecovery(
  roomNumber: number,
): NonNullable<Room['recovery']> {
  const floor = Math.floor(roomNumber / 100),
    position = roomNumber % 100;
  const damage = (
    ['PLUMBING', 'DOOR', 'CONTAMINATION', 'ELECTRICAL', 'STRUCTURE'] as const
  )[(position - 1) % 5];
  return {
    damage,
    availableDay:
      floor === 2 ? (damage === 'STRUCTURE' ? 10 : 3) : floor === 1 ? 10 : 18,
    restored: false,
  };
}
export function residenceLabel(guest: Guest) {
  return guest.residency === 'TEMPORARY'
    ? `임시 체류 · ${guest.remainingNights}박`
    : '장기 거주';
}
