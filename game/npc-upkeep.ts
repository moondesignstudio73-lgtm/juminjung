import { communityProfile } from './community-data.ts';
import { getNpcRank } from './npc-rank.ts';
import type { Guest, NpcRank, StaffDutyId } from './types.ts';

export type NpcUpkeep = { food: number; water: number };

export const RANK_UPKEEP_RANGES: Record<
  NpcRank,
  { food: readonly [number, number]; water: readonly [number, number] }
> = {
  F: { food: [0.3, 0.5], water: [0.2, 0.4] },
  E: { food: [0.5, 0.7], water: [0.3, 0.5] },
  D: { food: [0.7, 0.9], water: [0.5, 0.7] },
  C: { food: [0.9, 1.2], water: [0.7, 0.9] },
  B: { food: [1.2, 1.5], water: [0.9, 1.1] },
  A: { food: [1.5, 1.9], water: [1.1, 1.4] },
  S: { food: [1.9, 2.4], water: [1.4, 1.8] },
  SS: { food: [2.4, 3], water: [1.8, 2.3] },
  SSS: { food: [3, 4], water: [2.3, 3] },
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const stableUnit = (key: string) => {
  let hash = 2166136261;
  for (const character of key) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
};
const between = (range: readonly [number, number], unit: number) =>
  range[0] + (range[1] - range[0]) * unit;

function includesTrait(guest: Guest, trait: string) {
  return (
    guest.baseTraits.includes(trait) ||
    guest.hiddenTraits.includes(trait) ||
    guest.discoveredTraits.includes(trait)
  );
}

function storedUpkeep(guest: Guest): NpcUpkeep | null {
  const food = guest.community?.consumption.food;
  const water = guest.community?.consumption.water;
  if (Number.isFinite(food) && Number.isFinite(water)) {
    return {
      food: round1(Math.max(0.2, food!)),
      water: round1(Math.max(0.2, water!)),
    };
  }
  return null;
}

function calculateRankedUpkeep(guest: Guest): NpcUpkeep {
  const rank = getNpcRank(guest);
  const range = RANK_UPKEEP_RANGES[rank];
  const profile = communityProfile(guest);
  let food = between(range.food, stableUnit(`${guest.id}:food`));
  let water = between(range.water, stableUnit(`${guest.id}:water`));

  if (['SECURITY', 'SCAVENGER', 'CARPENTER', 'PLUMBER'].includes(profile.job)) {
    food *= 1.1;
    water *= 1.1;
  }
  if (guest.age > 0 && guest.age < 18) {
    food *= 0.78;
    water *= 0.82;
  } else if (guest.age >= 65) {
    food *= 0.86;
    water *= 0.9;
  }
  if (guest.health < 45 || includesTrait(guest, 'Sickly')) food *= 0.9;
  if (guest.infectionState !== 'HEALTHY') water *= 1.1;
  if (includesTrait(guest, 'Pregnant')) {
    food *= 1.15;
    water *= 1.15;
  }
  if (includesTrait(guest, 'SmallEater')) food *= 0.8;
  if (includesTrait(guest, 'BigEater') || includesTrait(guest, 'Greedy'))
    food *= 1.3;
  if (includesTrait(guest, 'Thirsty')) water *= 1.25;
  if (includesTrait(guest, 'Frugal') || profile.traits.includes('CAREFUL')) {
    food *= 0.9;
    water *= 0.9;
  }
  if (profile.traits.includes('FAST_WASTEFUL')) {
    food *= 1.1;
    water *= 1.1;
  }

  return {
    food: round1(Math.max(0.2, Math.min(5, food))),
    water: round1(Math.max(0.2, Math.min(4, water))),
  };
}

/** Stable, rank-led daily cost. Explicit personal costs remain authoritative. */
export function getNpcUpkeep(guest: Guest): NpcUpkeep {
  return storedUpkeep(guest) ?? calculateRankedUpkeep(guest);
}

export function formatUpkeep(value: number) {
  return value.toFixed(1);
}

export function getWorkWaterSurcharge(guest: Guest, dutyId: StaffDutyId) {
  if (!['MAINTENANCE', 'SECURITY'].includes(dutyId)) return 0;
  return Math.max(0.1, round1(getNpcUpkeep(guest).water * 0.15));
}

export function withRankedUpkeep(guest: Guest, forceRecalculate = false): Guest {
  const profile = communityProfile(guest);
  return {
    ...guest,
    community: {
      ...profile,
      upkeepVersion: 2,
      consumption: forceRecalculate ? calculateRankedUpkeep(guest) : getNpcUpkeep(guest),
    },
  };
}
