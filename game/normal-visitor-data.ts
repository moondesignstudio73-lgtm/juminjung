import type { AuraDefinition, Guest, GuestSkills, Resources } from './types.ts';

type Range = [number, number];
type JobProfile = {
  role: string;
  minAge: number;
  maxAge: number;
  skills: Record<keyof GuestSkills, Range>;
  offer: Partial<Resources>;
  aura?: AuraDefinition;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));
const seeded = (input: number) => {
  let value = input >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};
const pick = <T>(values: readonly T[], random: () => number): T =>
  values[Math.floor(random() * values.length)];
const between = ([min, max]: Range, random: () => number) =>
  Math.round(min + random() * (max - min));

const aura = (definition: AuraDefinition): AuraDefinition => definition;
const MEDICAL_AURA = aura({
  id: 'nursing-care',
  name: 'Basic Care',
  shortLabel: '응급',
  category: 'MEDICAL',
  icon: 'heart-pulse',
  metric: 'injuryRecovery',
  operation: 'ADD',
  value: 2,
  radius: 1,
  distance: 'CHEBYSHEV',
  description:
    '자기 방과 주변 한 칸의 투숙객이 밤마다 Health를 2 회복한다. 위아래층과 대각선도 포함한다.',
  diseaseType: 'INJURY',
});
const REPAIR_AURA = aura({
  id: 'maintenance-zone',
  name: 'Repair Assistance',
  shortLabel: '수리',
  category: 'MAINTENANCE',
  icon: 'wrench',
  metric: 'breakdownRisk',
  operation: 'ADD',
  value: -8,
  radius: 1,
  distance: 'CHEBYSHEV',
  description: '인접 객실의 고장 위험을 조금 낮춘다.',
});
const FOOD_AURA = aura({
  id: 'kitchen-efficiency',
  name: 'Kitchen Assistance',
  shortLabel: '배식',
  category: 'FOOD',
  icon: 'utensils',
  metric: 'foodUse',
  operation: 'ADD',
  value: -5,
  radius: 1,
  distance: 'CHEBYSHEV',
  description: '인접 거주자의 식량 손실을 조금 줄인다.',
});
const SECURITY_AURA = aura({
  id: 'security-presence',
  name: 'Watch Presence',
  shortLabel: '경비',
  category: 'SECURITY',
  icon: 'shield',
  metric: 'security',
  operation: 'ADD',
  value: 5,
  radius: 1,
  distance: 'CHEBYSHEV',
  description: '인접 객실의 야간 경계를 보조한다.',
});

const balanced = (
  work: Range,
  combat: Range,
  medical: Range,
  repair: Range,
  scavenge: Range,
  social: Range,
): JobProfile['skills'] => ({
  work,
  combat,
  medical,
  repair,
  scavenge,
  social,
});
const JOBS: JobProfile[] = [
  {
    role: '정비공',
    minAge: 21,
    maxAge: 68,
    skills: balanced([62, 86], [20, 48], [8, 25], [70, 95], [38, 67], [25, 55]),
    offer: { parts: 3, fuel: 1 },
    aura: REPAIR_AURA,
  },
  {
    role: '간호사',
    minAge: 22,
    maxAge: 64,
    skills: balanced([58, 82], [8, 28], [68, 92], [10, 28], [25, 52], [50, 82]),
    offer: { medicine: 2 },
    aura: MEDICAL_AURA,
  },
  {
    role: '의사',
    minAge: 28,
    maxAge: 70,
    skills: balanced([62, 88], [6, 24], [78, 98], [8, 24], [20, 48], [44, 78]),
    offer: { medicine: 2 },
    aura: MEDICAL_AURA,
  },
  {
    role: '요리사',
    minAge: 20,
    maxAge: 67,
    skills: balanced(
      [68, 92],
      [10, 35],
      [12, 34],
      [18, 42],
      [30, 58],
      [45, 78],
    ),
    offer: { food: 4 },
    aura: FOOD_AURA,
  },
  {
    role: '사냥꾼',
    minAge: 19,
    maxAge: 65,
    skills: balanced(
      [48, 76],
      [58, 88],
      [18, 42],
      [28, 55],
      [65, 94],
      [20, 52],
    ),
    offer: { food: 3, security: 2 },
    aura: SECURITY_AURA,
  },
  {
    role: '전직 군인',
    minAge: 22,
    maxAge: 62,
    skills: balanced(
      [55, 82],
      [70, 94],
      [18, 42],
      [25, 55],
      [48, 76],
      [28, 60],
    ),
    offer: { security: 4 },
    aura: SECURITY_AURA,
  },
  {
    role: '농부',
    minAge: 18,
    maxAge: 72,
    skills: balanced(
      [72, 96],
      [18, 46],
      [18, 42],
      [38, 68],
      [48, 78],
      [32, 62],
    ),
    offer: { food: 5, water: 2 },
  },
  {
    role: '전기기사',
    minAge: 22,
    maxAge: 68,
    skills: balanced([64, 88], [14, 38], [8, 25], [74, 96], [35, 62], [28, 58]),
    offer: { parts: 3 },
    aura: REPAIR_AURA,
  },
  {
    role: '교사',
    minAge: 23,
    maxAge: 70,
    skills: balanced([52, 78], [8, 28], [18, 42], [12, 34], [25, 55], [68, 92]),
    offer: { food: 2 },
  },
  {
    role: '목수',
    minAge: 20,
    maxAge: 70,
    skills: balanced(
      [68, 92],
      [22, 48],
      [10, 28],
      [62, 88],
      [38, 65],
      [28, 58],
    ),
    offer: { parts: 3 },
    aura: REPAIR_AURA,
  },
  {
    role: '운전기사',
    minAge: 21,
    maxAge: 68,
    skills: balanced(
      [58, 82],
      [28, 56],
      [10, 30],
      [35, 62],
      [52, 80],
      [32, 62],
    ),
    offer: { fuel: 3 },
  },
  {
    role: '떠돌이 상인',
    minAge: 20,
    maxAge: 72,
    skills: balanced([42, 70], [18, 44], [8, 26], [18, 45], [50, 82], [72, 96]),
    offer: { food: 3, parts: 2 },
  },
  {
    role: '경비원',
    minAge: 21,
    maxAge: 66,
    skills: balanced(
      [56, 82],
      [62, 90],
      [14, 36],
      [28, 55],
      [38, 68],
      [42, 72],
    ),
    offer: { security: 4 },
    aura: SECURITY_AURA,
  },
  {
    role: '청소 노동자',
    minAge: 18,
    maxAge: 70,
    skills: balanced(
      [72, 94],
      [12, 38],
      [12, 36],
      [38, 68],
      [36, 66],
      [32, 62],
    ),
    offer: { water: 2, parts: 1 },
  },
  {
    role: '학생',
    minAge: 16,
    maxAge: 25,
    skills: balanced([28, 58], [8, 35], [8, 38], [10, 42], [38, 72], [42, 78]),
    offer: { food: 1 },
  },
  {
    role: '약사',
    minAge: 24,
    maxAge: 68,
    skills: balanced([60, 84], [8, 26], [65, 90], [12, 34], [25, 52], [48, 78]),
    offer: { medicine: 3 },
    aura: MEDICAL_AURA,
  },
  {
    role: '건설 노동자',
    minAge: 19,
    maxAge: 65,
    skills: balanced([72, 95], [34, 65], [8, 28], [58, 84], [42, 70], [25, 55]),
    offer: { parts: 4 },
  },
  {
    role: '실직한 생존자',
    minAge: 18,
    maxAge: 72,
    skills: balanced([28, 72], [12, 62], [5, 48], [8, 65], [20, 82], [18, 76]),
    offer: { food: 1 },
  },
];

const NAMES = {
  여성: [
    '에바 모건',
    '소피아 베넷',
    '한나 콜린스',
    '아이리스 워드',
    '메이 리처즈',
    '레나 하트',
    '줄리아 브룩스',
    '노라 밀스',
    '에밀리 쇼',
    '사라 벨',
  ],
  남성: [
    '리암 모건',
    '에단 베넷',
    '조나 콜린스',
    '오스카 워드',
    '테오 리처즈',
    '루크 하트',
    '에런 브룩스',
    '네이트 밀스',
    '벤 쇼',
    '애덤 벨',
  ],
} as const;
const POSITIVE_TRAITS = [
  'Kind',
  'HardWorker',
  'Calm',
  'Brave',
  'Resourceful',
  'Loyal',
  'Clean',
  'Handy',
] as const;
const NEGATIVE_TRAITS = [
  'Thief',
  'Violent',
  'Coward',
  'Sickly',
  'Greedy',
  'Liar',
  'Alcoholic',
  'Paranoid',
  'Noisy',
] as const;
const CONDITIONAL_TRAITS = [
  'Religious',
  'Parent',
  'Lonely',
  'Insomniac',
] as const;
const PORTRAITS = {
  여성: ['grace', 'hazel', 'lily', 'rosa', 'ruth'],
  남성: ['daniel', 'eli', 'jack', 'noah', 'samuel'],
} as const;
const SKILL_LABELS: Record<keyof GuestSkills, string> = {
  work: '작업',
  combat: '전투',
  medical: '의료',
  repair: '수리',
  scavenge: '탐색',
  social: '대화',
};
const stayDuration = (random: () => number) => {
  const roll = random();
  if (roll < 0.25) return 1;
  if (roll < 0.5) return 2;
  if (roll < 0.75) return 3;
  if (roll < 0.9) return random() < 0.5 ? 4 : 5;
  return random() < 0.5 ? 6 : 7;
};

export function createNormalVisitor(
  saveSeed: number,
  day: number,
  slot: number,
): Guest {
  const identitySeed =
    (saveSeed ^
      Math.imul(day + 17, 0x9e3779b1) ^
      Math.imul(slot + 31, 0x85ebca6b)) >>>
    0;
  const random = seeded(identitySeed);
  const tutorial = day === 1 && slot === 0;
  const rolledGender = random() < 0.5 ? '여성' : '남성';
  const gender = tutorial ? '남성' : rolledGender;
  const rolledProfile = pick(JOBS, random);
  const profile = tutorial ? JOBS[1] : rolledProfile;
  const age = between([profile.minAge, profile.maxAge], random);
  const rare = random() < 0.04;
  const skills = Object.fromEntries(
    Object.entries(profile.skills).map(([key, range]) => [
      key,
      clamp(between(range as Range, random) + (rare ? 10 : 0)),
    ]),
  ) as GuestSkills;
  const visibleTraits: string[] = [pick(POSITIVE_TRAITS, random)];
  if (random() < 0.55) visibleTraits.push(pick(CONDITIONAL_TRAITS, random));
  if (rare) visibleTraits.push('RareTalent');
  const hiddenTraits =
    random() < Math.min(0.7, 0.2 + day * 0.018)
      ? [pick(NEGATIVE_TRAITS, random)]
      : [];
  const health = clamp(between([Math.max(38, 78 - day), 96], random));
  const stress = clamp(between([28, Math.min(88, 48 + day)], random));
  const illnessRoll = random();
  const infectionState: Guest['infectionState'] =
    illnessRoll < Math.min(0.08, day * 0.002)
      ? 'INFECTED_SUSPECTED'
      : illnessRoll < 0.18
        ? 'INJURED'
        : illnessRoll < 0.25
          ? 'SICK'
          : 'HEALTHY';
  const rolledName = pick(NAMES[gender], random);
  const name = tutorial ? '리암 모건' : rolledName;
  const id = `normal-${day}-${slot}-${identitySeed.toString(36)}`;
  const nights = stayDuration(random);
  const portraitTemplate = pick(PORTRAITS[gender], random);
  const riskLevel = clamp(
    between([12, Math.min(82, 38 + day)], random) +
      (hiddenTraits.includes('Violent') ? 18 : 0) +
      (hiddenTraits.includes('Thief') ? 12 : 0),
  );
  const auraEnabled = Boolean(profile.aura) && random() < (rare ? 0.8 : 0.32);
  const itemType: Guest['offeredItems'][number]['type'] = profile.offer.medicine
    ? 'MEDICINE'
    : profile.offer.fuel
      ? 'FUEL'
      : profile.offer.food
        ? 'FOOD'
        : 'VALUABLE';
  const itemName = profile.offer.medicine
    ? '응급 약품'
    : profile.offer.fuel
      ? '연료통'
      : profile.offer.food
        ? '밀봉 식량'
        : '작업용 물자';
  const faction: Guest['faction'] = profile.role.includes('상인')
    ? 'MERCHANT'
    : profile.role.includes('군인')
      ? 'MILITARY'
      : random() < 0.35
        ? 'REFUGEE'
        : 'INDEPENDENT';
  const events: Guest['eventChain'] = [
    {
      id: `${id}-arrival`,
      stage: 'ARRIVAL',
      title: '비를 뚫고 온 생존자',
      completed: false,
    },
    {
      id: `${id}-life`,
      stage: 'LIFE_AT_HOTEL',
      title: '복도에서 맡은 작은 일',
      completed: false,
    },
    {
      id: `${id}-conflict`,
      stage: 'CONFLICT',
      title: '감춰 둔 문제',
      completed: false,
    },
    {
      id: `${id}-resolution`,
      stage: 'RESOLUTION',
      title: '떠날 것인가 남을 것인가',
      completed: false,
    },
  ];
  return {
    id,
    npcType: 'NORMAL',
    residency: 'TEMPORARY',
    storyLockedResident: false,
    revisitPolicy: 'ALWAYS',
    generated: true,
    faction,
    name,
    role: rare ? `숙련 ${profile.role}` : profile.role,
    age,
    gender,
    description: `무너진 도로를 지나 JUJU HOTEL의 불빛을 찾아온 ${profile.role}.`,
    portrait: `/juminjung/assets/portraits/${portraitTemplate}/neutral-v1.png`,
    portraitVariants: {},
    expressions: [
      'neutral',
      'happy',
      'sad',
      'angry',
      'afraid',
      'suspicious',
      'injured',
    ],
    arrivalDay: day,
    arrivalDayRange: [day, day],
    arrivalConditions: [],
    conditionLabel:
      infectionState === 'HEALTHY'
        ? '피로 · 안정'
        : infectionState === 'INJURED'
          ? '부상 흔적'
          : infectionState === 'SICK'
            ? '발열'
            : '감염 의심',
    introDialogue: tutorial
      ? '“리암 모건입니다. 간호사였어요. 방을 내어주시면 가까이 있는 부상자들을 밤마다 돌보겠습니다.”'
      : `“${day}일째 길 위에 있었습니다. ${nights}박만 버티게 해주시면 가진 물자를 내놓겠습니다.”`,
    negotiationDialogue:
      '“전부는 어렵습니다. 그래도 창고 바닥까지 털어 보겠습니다.”',
    questions: [
      {
        id: `${id}-origin`,
        label: '어느 길로 왔습니까?',
        answer:
          '동쪽 우회도로를 따라왔습니다. 두 번 숨어야 했고, 마지막 구간은 뛰었습니다.',
      },
      {
        id: `${id}-condition`,
        label: '몸 상태를 설명하세요.',
        answer:
          infectionState === 'HEALTHY'
            ? '지쳤을 뿐입니다. 물과 잠이 필요합니다.'
            : '상태가 좋지 않은 건 압니다. 숨기지 않고 관찰을 받겠습니다.',
      },
      {
        id: `${id}-skill`,
        label: '호텔에서 무슨 일을 할 수 있죠?',
        answer: `${profile.role} 일을 했습니다. 제일 자신 있는 능력은 ${SKILL_LABELS[Object.entries(skills).sort((a, b) => b[1] - a[1])[0][0] as keyof GuestSkills]}입니다.`,
      },
    ],
    offeredItems: [
      {
        id: `${id}-offer`,
        type: itemType,
        name: itemName,
        short: '숙박 대가로 내놓은 물자.',
        detail: `${profile.role}가 폐허를 지나 지켜 낸 물자다.`,
      },
    ],
    offer: { ...profile.offer },
    negotiatedOffer: { food: 1 },
    baseTraits: visibleTraits,
    hiddenTraits,
    discoveredTraits: [],
    health,
    stress,
    trust: between([18, 48], random),
    riskLevel,
    skills,
    relationships: [],
    storyFlags: { generated_seed: identitySeed },
    eventChain: events,
    infectionState,
    alive: true,
    endingState: null,
    currentRoomNumber: null,
    stayDuration: nights,
    remainingNights: nights,
    checkedInDay: null,
    status: 'WAITING',
    aura: tutorial
      ? { ...MEDICAL_AURA }
      : auraEnabled
        ? { ...profile.aura! }
        : null,
    ...(tutorial
      ? {
          placement: {
            tags: ['support', 'medical'] as Array<'support' | 'medical'>,
            recommended: 'CENTER' as const,
            avoid: ['EDGE' as const],
            reason: '주변 투숙객의 야간 회복 지원',
          },
        }
      : {}),
  };
}

export const NORMAL_VISITOR_JOBS = JOBS.map(({ role, minAge, maxAge }) => ({
  role,
  minAge,
  maxAge,
}));
