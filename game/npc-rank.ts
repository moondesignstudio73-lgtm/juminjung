import { communityProfile, JOB_NAMES } from './community-data.ts';
import type { Guest, GuestSkills, NpcRank } from './types.ts';

export const NPC_RANKS: readonly NpcRank[] = [
  'F',
  'E',
  'D',
  'C',
  'B',
  'A',
  'S',
  'SS',
  'SSS',
] as const;

export const NPC_RANK_MEANING: Record<NpcRank, string> = {
  F: '비전문',
  E: '초보',
  D: '기초 숙련',
  C: '평균적',
  B: '숙련',
  A: '전문가',
  S: '최상위 전문가',
  SS: '희귀한 최정예',
  SSS: '고유급 인물',
};

const BASE_WEIGHTS: Record<NpcRank, number> = {
  F: 8,
  E: 14,
  D: 18,
  C: 25,
  B: 18,
  A: 10,
  S: 5,
  SS: 1.5,
  SSS: 0.35,
};

const RANK_CENTER: Record<NpcRank, number> = {
  F: 28,
  E: 36,
  D: 44,
  C: 54,
  B: 65,
  A: 76,
  S: 85,
  SS: 91,
  SSS: 96,
};

const SKILL_LABELS: Record<keyof GuestSkills, string> = {
  work: '작업 숙련',
  combat: '위협 대응',
  medical: '의료 숙련',
  repair: '수리 숙련',
  scavenge: '탐색 숙련',
  social: '대화 능력',
};

const SKILL_HELP: Record<keyof GuestSkills, string> = {
  work: '배식과 일반 작업 결과에 반영됩니다. 현재 수치는 이 주민의 실제 작업 숙련도입니다.',
  combat: '경계 업무와 외부 위협 대응에 반영됩니다. 호텔 안전도 자체와는 다른 개인 능력입니다.',
  medical: '의료 업무의 회복량과 환자 대응에 반영됩니다. 객실 Aura 효과와는 별도로 계산됩니다.',
  repair: '시설과 객실 복구 작업에 반영됩니다. 실제 결과는 작업 종류와 주민 상태의 영향도 받습니다.',
  scavenge: '외부 탐색의 성공 가능성과 결과에 반영됩니다. 임무 난이도와 전투·작업 능력도 함께 사용됩니다.',
  social: '대화와 공동체 업무에 쓰이는 개인 능력입니다. 현재 신뢰도와는 별개의 전문 수치입니다.',
};

const JOB_SKILLS: Record<string, Array<keyof GuestSkills>> = {
  DOCTOR: ['medical', 'work', 'social', 'scavenge'],
  ENGINEER: ['repair', 'work', 'scavenge', 'combat'],
  PLUMBER: ['repair', 'work', 'scavenge', 'medical'],
  CARPENTER: ['repair', 'work', 'combat', 'scavenge'],
  CLEANER: ['work', 'repair', 'medical', 'social'],
  ELECTRICIAN: ['repair', 'work', 'scavenge', 'combat'],
  SECURITY: ['combat', 'work', 'scavenge', 'social'],
  COOK: ['work', 'social', 'medical', 'repair'],
  MERCHANT: ['social', 'scavenge', 'work', 'combat'],
  SCAVENGER: ['scavenge', 'combat', 'work', 'repair'],
  RESIDENT: ['work', 'social', 'scavenge', 'combat'],
};

const SPECIALIZATIONS: Record<string, readonly string[]> = {
  DOCTOR: ['응급 대응형', '예방 관리형'],
  ENGINEER: ['현장 수리형', '정밀 점검형'],
  PLUMBER: ['긴급 복구형', '절약 보수형'],
  CARPENTER: ['구조 보강형', '신속 복구형'],
  CLEANER: ['오염 대응형', '생활 관리형'],
  ELECTRICIAN: ['회로 복구형', '고장 예방형'],
  SECURITY: ['정문 방어형', '순찰 탐지형'],
  COOK: ['배급 효율형', '위생 관리형'],
  MERCHANT: ['협상형', '물자 감정형'],
  SCAVENGER: ['정찰형', '위험 돌파형'],
  RESIDENT: ['현장 지원형', '공동체 지원형'],
};

export type ProfessionalStat = {
  id: keyof GuestSkills | 'aura';
  label: string;
  value: string;
  help: string;
};

export function isNpcRank(value: unknown): value is NpcRank {
  return typeof value === 'string' && NPC_RANKS.includes(value as NpcRank);
}

export function rollNpcRank(roll: number, day: number): NpcRank {
  const progress = Math.max(0, Math.min(1, (day - 4) / 22));
  const weights = NPC_RANKS.map((rank, index) => {
    if (rank === 'SSS' && day < 18) return 0;
    if (rank === 'SS' && day < 10) return 0;
    if (rank === 'S' && day < 6) return BASE_WEIGHTS[rank] * 0.03;
    if (index >= 5) return BASE_WEIGHTS[rank] * (0.3 + progress * 0.7);
    return BASE_WEIGHTS[rank];
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = Math.max(0, Math.min(0.999999, roll)) * total;
  for (let index = 0; index < NPC_RANKS.length; index += 1) {
    cursor -= weights[index];
    if (cursor < 0) return NPC_RANKS[index];
  }
  return 'C';
}

export function createRankedSkills(
  ranges: Record<keyof GuestSkills, readonly [number, number]>,
  rank: NpcRank,
  random: () => number,
): { skills: GuestSkills; focus: keyof GuestSkills } {
  const ordered = (Object.keys(ranges) as Array<keyof GuestSkills>).sort(
    (a, b) =>
      (ranges[b][0] + ranges[b][1]) / 2 -
      (ranges[a][0] + ranges[a][1]) / 2,
  );
  const focus = ordered[Math.floor(random() * Math.min(2, ordered.length))];
  const center = RANK_CENTER[rank];
  const skills = Object.fromEntries(
    (Object.keys(ranges) as Array<keyof GuestSkills>).map((skill) => {
      const relevance = ordered.indexOf(skill);
      const [min, max] = ranges[skill];
      const baseline = min + random() * (max - min);
      const target =
        skill === focus
          ? center + 5
          : relevance <= 2
            ? center - 9 - relevance * 3
            : baseline * 0.72 + 8;
      const jitter = (random() - 0.5) * (skill === focus ? 8 : 14);
      return [skill, Math.max(2, Math.min(100, Math.round(target + jitter)))];
    }),
  ) as GuestSkills;
  return { skills, focus };
}

export function rankFromSkills(guest: Pick<Guest, 'skills'>): NpcRank {
  const values = Object.values(guest.skills).sort((a, b) => b - a);
  const score = values[0] * 0.7 + (values[1] ?? values[0]) * 0.3;
  if (score >= 96) return 'SSS';
  if (score >= 91) return 'SS';
  if (score >= 84) return 'S';
  if (score >= 75) return 'A';
  if (score >= 64) return 'B';
  if (score >= 52) return 'C';
  if (score >= 42) return 'D';
  if (score >= 32) return 'E';
  return 'F';
}

export function getNpcRank(guest: Pick<Guest, 'rank' | 'skills'>): NpcRank {
  return isNpcRank(guest.rank) ? guest.rank : rankFromSkills(guest);
}

export function getNpcSpecialization(
  guest: Pick<Guest, 'specialization' | 'community' | 'role' | 'id'>,
  focusIndex = 0,
): string {
  if (guest.specialization) return guest.specialization;
  const job = communityProfile(guest as Guest).job;
  const options = SPECIALIZATIONS[job] ?? SPECIALIZATIONS.RESIDENT;
  return options[Math.abs(focusIndex) % options.length];
}

export function getProfessionalStats(guest: Guest): ProfessionalStat[] {
  const job = communityProfile(guest).job;
  const keys = JOB_SKILLS[job] ?? JOB_SKILLS.RESIDENT;
  const stats: ProfessionalStat[] = keys.map((skill) => ({
    id: skill,
    label: SKILL_LABELS[skill],
    value: `${guest.skills[skill]}%`,
    help: SKILL_HELP[skill],
  }));
  if (guest.aura)
    stats.unshift({
      id: 'aura',
      label: '객실 효과',
      value: guest.aura.name,
      help: `${guest.aura.description} 객실 배치도에서 실제 영향 범위를 확인할 수 있습니다.`,
    });
  return stats.slice(0, 5);
}

export function getRankProfessionalTrait(rank: NpcRank, focus: keyof GuestSkills) {
  if (!['S', 'SS', 'SSS'].includes(rank)) return [];
  const prefix = rank === 'SSS' ? '고유 전문화' : rank === 'SS' ? '최정예' : '현장 베테랑';
  return [`${prefix} · ${SKILL_LABELS[focus]}`];
}

export function getMainNpcRank(id: string): NpcRank {
  const fixed: Record<string, NpcRank> = {
    eleanor: 'S', walter: 'S', mia: 'F', daniel: 'C', samuel: 'A',
    ruth: 'A', jack: 'A', grace: 'A', owen: 'A', hayes: 'S', lily: 'A',
    noah: 'A', victor: 'S', rosa: 'B', eli: 'A', vale: 'S', hazel: 'S',
    thomas: 'SS', claire: 'C', white: 'SSS',
  };
  return fixed[id] ?? 'C';
}

export function getJobLabel(guest: Guest) {
  const profile = communityProfile(guest);
  return JOB_NAMES[profile.job] ?? guest.role;
}
