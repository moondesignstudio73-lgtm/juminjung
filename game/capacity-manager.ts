import { communityProfile, JOB_NAMES } from './community-data.ts';
import { getNpcUpkeep } from './npc-upkeep.ts';
import { residentReplacementBlockReason } from './community-manager.ts';
import { STAFF_DUTIES } from './staff-operation-manager.ts';
import type { GameState, Guest, StaffDutyId } from './types.ts';

const DUTY_LABELS = Object.fromEntries(
  STAFF_DUTIES.map((duty) => [duty.id, duty.name]),
) as Record<StaffDutyId, string>;

export type CapacityNeed = {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
};

export { residentReplacementBlockReason };

export function getAssignedDutyLabels(state: GameState, guestId: string) {
  return Object.entries(state.staffAssignments)
    .filter(([, assignedId]) => assignedId === guestId)
    .map(([dutyId]) => DUTY_LABELS[dutyId as StaffDutyId]);
}

export function getAvailableDutyLabels(guest: Guest) {
  return [...STAFF_DUTIES]
    .sort((a, b) => guest.skills[b.skill] - guest.skills[a.skill])
    .slice(0, 2)
    .map((duty) => `${duty.name} ${guest.skills[duty.skill]}`);
}

export function getGuestCapacityNeed(
  state: GameState,
  guest: Guest,
): CapacityNeed {
  const duties = getAssignedDutyLabels(state, guest.id);
  if (duties.length)
    return { level: 'HIGH', reason: `현재 ${duties.join(', ')} 담당` };

  const strongest = [...STAFF_DUTIES].sort(
    (a, b) => guest.skills[b.skill] - guest.skills[a.skill],
  )[0];
  const generatorCondition = state.facilityState?.generator?.condition ?? 100;
  const sickResident = state.guests.some(
    (resident) =>
      resident.status === 'STAYING' &&
      (resident.health < 55 || resident.infectionState !== 'HEALTHY'),
  );
  if (
    (strongest.id === 'MAINTENANCE' &&
      (generatorCondition < 70 || state.hotelStats.hotelCondition < 55)) ||
    (strongest.id === 'SECURITY' && state.hotelStats.security < 45) ||
    (strongest.id === 'MEDICAL' && sickResident)
  )
    return {
      level: 'HIGH',
      reason:
        strongest.id === 'MAINTENANCE'
          ? '발전기 또는 호텔 상태가 불안정함'
          : strongest.id === 'SECURITY'
            ? '호텔 안전도가 낮음'
            : '치료가 필요한 주민이 있음',
    };
  if (guest.aura)
    return { level: 'MEDIUM', reason: `${guest.aura.name} 객실 효과 보유` };
  return {
    level: strongest && guest.skills[strongest.skill] >= 55 ? 'MEDIUM' : 'LOW',
    reason:
      strongest && guest.skills[strongest.skill] >= 55
        ? `${strongest.name}에 활용 가능`
        : '현재 담당 업무와 객실 효과 없음',
  };
}

export function getCapacityComparison(
  state: GameState,
  resident: Guest,
  visitor: Guest,
) {
  const staying = state.guests.filter((guest) => guest.status === 'STAYING');
  const total = staying.reduce(
    (sum, guest) => {
      const consumption = getNpcUpkeep(guest);
      return {
        food: sum.food + consumption.food,
        water: sum.water + consumption.water,
      };
    },
    { food: 0, water: 0 },
  );
  const current = communityProfile(resident);
  const incoming = communityProfile(visitor);
  const currentConsumption = getNpcUpkeep(resident);
  const incomingConsumption = getNpcUpkeep(visitor);
  const duties = getAssignedDutyLabels(state, resident.id);
  const residentNeed = getGuestCapacityNeed(state, resident);
  const visitorNeed = getGuestCapacityNeed(state, visitor);
  return {
    current: {
      job: JOB_NAMES[current.job] ?? resident.role,
      consumption: currentConsumption,
      duties,
      abilities: [resident.aura?.name, ...duties].filter(Boolean) as string[],
      need: residentNeed,
      days: Math.max(1, state.day - (resident.checkedInDay ?? state.day) + 1),
      repairs: current.repairsCompleted,
    },
    incoming: {
      job: JOB_NAMES[incoming.job] ?? visitor.role,
      consumption: incomingConsumption,
      duties: getAvailableDutyLabels(visitor),
      abilities: [visitor.aura?.name, ...getAvailableDutyLabels(visitor)].filter(
        Boolean,
      ) as string[],
      need: visitorNeed,
    },
    after: {
      food: Math.round((total.food - currentConsumption.food + incomingConsumption.food) * 10) / 10,
      water:
        Math.round((total.water - currentConsumption.water + incomingConsumption.water) * 10) / 10,
    },
    before: total,
  };
}
