import type {
  GameState,
  Guest,
  FacilityState,
  NightEventDefinition,
  HotelActionId,
} from './types.ts';
import { performHotelAction } from './hotel-action-manager.ts';
import { calculatePowerPlan } from './daily-survival-manager.ts';
import { assignStaffDuty } from './staff-operation-manager.ts';
export const NIGHT_MINUTES = 360;
export const BLACKOUT_THRESHOLD = 35;
export const NIGHT_LOCATIONS = [
  { id: 'front', name: '프론트', day: 1, distance: 0 },
  { id: 'rooms', name: '객실', day: 1, distance: 2 },
  { id: 'kitchen', name: '주방', day: 2, distance: 1 },
  { id: 'storage', name: '창고', day: 3, distance: 3 },
  { id: 'generator', name: '발전기실', day: 4, distance: 4 },
  { id: 'clinic', name: '의무실', day: 6, distance: 2 },
  { id: 'entrance', name: '정문', day: 7, distance: 0 },
] as const;
export type NightLocation = (typeof NIGHT_LOCATIONS)[number]['id'];
export const NIGHT_JOB_MINUTES: Partial<Record<HotelActionId, number>> = {
  repair_hotel: 60,
  community_outreach: 25,
  security_patrol: 35,
};
export const REPAIR_JOB = {
  id: 'repair_generator',
  location: 'generator',
  roles: /정비|전기기사|전력|엔지니어|Engineer|Mechanic|Electrician/i,
  self: { parts: 3, recovery: 30 },
  expert: { parts: 1, recovery: 25 },
} as const;
export const GENERATOR_UPGRADES = [
  {
    level: 2,
    day: 6,
    parts: 4,
    minutes: 45,
    description: '원격 경보 · 방문 없이 상태와 연료 경고 확인',
  },
  {
    level: 3,
    day: 8,
    parts: 6,
    minutes: 60,
    description: '자가 복구 · 경미 이상 시 밤마다 부품 1로 내구도 +8',
  },
  {
    level: 4,
    day: 10,
    parts: 8,
    minutes: 90,
    description: '엔지니어 예방 정비 · 마모 절반, 내구도 90까지 유지',
  },
] as const;
const clamp = (n: unknown, fallback = 0, max = 100): number =>
  typeof n === 'number' && Number.isFinite(n)
    ? Math.max(0, Math.min(max, Math.trunc(n)))
    : fallback;
export function isGeneratorSpecialist(guest: Guest): boolean {
  return (
    REPAIR_JOB.roles.test(guest.role) ||
    guest.baseTraits.some((t) =>
      ['Engineer', 'Mechanic', 'Electrician'].includes(t),
    )
  );
}
export function generatorState(state: GameState) {
  const raw = state.facilityState?.generator;
  const condition = clamp(raw?.condition, 82);
  return {
    condition,
    maxCondition: 100,
    lastWearDay: clamp(raw?.lastWearDay, Math.max(4, state.day), state.day),
    wear: clamp(raw?.wear, 10),
    automationLevel: Math.max(1, clamp(raw?.automationLevel, 1, 4)),
    lastServicedDay: clamp(raw?.lastServicedDay, 0, state.day),
    lastInspectedDay: clamp(raw?.lastInspectedDay, 0, state.day),
    lastAutomationDay: clamp(raw?.lastAutomationDay, 0, state.day),
    activeProblem:
      raw?.activeProblem === 'major' || condition <= 20
        ? ('major' as const)
        : condition <= 70
          ? ('minor' as const)
          : null,
  };
}
function putGenerator(state: GameState, generator: FacilityState): GameState {
  return { ...state, facilityState: { ...state.facilityState, generator } };
}
export function generatorAtRisk(state: GameState): boolean {
  return (
    state.day >= 4 &&
    !!state.facilityState?.generator &&
    (generatorState(state).condition <= BLACKOUT_THRESHOLD ||
      generatorState(state).activeProblem === 'major') &&
    state.flags.generator_network_stable !== true
  );
}
export function getWorkerStatus(
  state: GameState,
  guest: Guest,
): 'AVAILABLE' | 'WORKING' | 'INJURED' | 'RESTING' | 'SICK' | 'MISSING' {
  if (
    !guest.alive ||
    guest.status !== 'STAYING' ||
    guest.currentRoomNumber === null
  )
    return 'MISSING';
  if (guest.health < 35) return 'INJURED';
  if (['SICK', 'INFECTED', 'INFECTED_SUSPECTED'].includes(guest.infectionState))
    return 'SICK';
  if (guest.stress >= 90) return 'RESTING';
  if (
    state.nightShift?.day === state.day &&
    state.nightShift.tasks.some((t) => t.workerId === guest.id)
  )
    return 'WORKING';
  return 'AVAILABLE';
}
function assignedEngineer(state: GameState) {
  return state.guests.find(
    (g) =>
      g.id === state.staffAssignments.MAINTENANCE && isGeneratorSpecialist(g),
  );
}
function availableEngineer(state: GameState) {
  const guest = assignedEngineer(state);
  return guest &&
    ['AVAILABLE', 'WORKING'].includes(getWorkerStatus(state, guest))
    ? guest
    : undefined;
}
export function getGeneratorFacilityView(state: GameState) {
  const generator = generatorState(state),
    worker = assignedEngineer(state),
    active = availableEngineer(state);
  const power = calculatePowerPlan(
    state,
    state.guests.filter((g) => g.status === 'STAYING').length,
  );
  const severity =
    generator.activeProblem === 'major'
      ? 'CRITICAL'
      : generatorAtRisk(state)
        ? 'URGENT'
        : generator.activeProblem
          ? 'WARNING'
          : 'NORMAL';
  const mode =
    active && generator.automationLevel === 4
      ? '자동 관리'
      : active || generator.automationLevel >= 2
        ? '부분 자동화'
        : '직접 관리';
  const alert =
    generator.activeProblem === 'major'
      ? '대형 파손 · 엔지니어 혼자 해결할 수 없습니다. 직접 수리가 필요합니다.'
      : worker && !active
        ? `${worker.name} 근무 중단 · ${getWorkerStatus(state, worker)}. 직접 관리가 필요합니다.`
        : generator.activeProblem && state.resources.parts < 1
          ? '수리 부품 부족 · 자동 복구 중단'
          : state.flags.generator_network_stable !== true &&
              state.resources.fuel <= 1
            ? '연료 부족 · 다음 날 물자를 확보하세요.'
            : generatorAtRisk(state)
              ? '정전 위험 · 수리하지 않고 밤을 넘기면 전체 전력 회로가 멈춥니다.'
              : generator.activeProblem
                ? '출력 불안정 · 수리하거나 다음 밤으로 미룰 수 있습니다.'
                : null;
  return {
    ...generator,
    assignedWorker: worker?.id ?? null,
    workerName:
      worker?.name ?? (generator.automationLevel >= 2 ? '원격 장치' : '없음'),
    mode,
    severity,
    alert,
    remote: !!active || generator.automationLevel >= 2,
    status:
      power.activeCircuits.length === 0
        ? 'OFFLINE'
        : generatorAtRisk(state)
          ? 'UNSTABLE'
          : 'STABLE',
    risk: generatorAtRisk(state) ? 'BLACKOUT' : null,
    maintenance: active ? '정기 점검' : '수동 점검',
    failureRisk: severity,
    production: { circuits: power.activeCircuits.length },
    consumption: { fuel: power.fuelDemand },
  };
}
export function nightClock(state: GameState) {
  const minutes = 21 * 60 + (state.nightShift?.elapsedMinutes ?? 0);
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
export function canSpendNightTime(state: GameState, minutes: number) {
  return (
    state.phase === 'night_management' &&
    state.nightShift?.day === state.day &&
    !state.nightShift.completed &&
    minutes >= 0 &&
    (state.nightShift.elapsedMinutes ?? 0) + minutes <= NIGHT_MINUTES
  );
}
function spendTime(state: GameState, minutes: number): GameState {
  return {
    ...state,
    nightShift: {
      ...state.nightShift!,
      elapsedMinutes: (state.nightShift?.elapsedMinutes ?? 0) + minutes,
    },
  };
}
export function movementMinutes(state: GameState, destination: NightLocation) {
  const from = state.nightShift?.location ?? 'front';
  if (from === destination) return 0;
  const distance = (id: NightLocation) =>
    NIGHT_LOCATIONS.find((l) => l.id === id)!.distance;
  return 5 + Math.abs(distance(from) - distance(destination)) * 5;
}
export function moveNightLocation(
  state: GameState,
  destination: NightLocation,
): GameState {
  const target = NIGHT_LOCATIONS.find((l) => l.id === destination),
    minutes = target ? movementMinutes(state, destination) : Infinity;
  if (!target || state.day < target.day || !canSpendNightTime(state, minutes))
    return state;
  const next = spendTime(state, minutes);
  return {
    ...next,
    nightShift: { ...next.nightShift!, location: destination },
  };
}
function recordWork(
  state: GameState,
  before: GameState,
  title: string,
  message: string,
  actionId: string,
  workerId: string | null,
): GameState {
  return {
    ...state,
    nightShift: {
      ...state.nightShift!,
      tasks: [
        ...state.nightShift!.tasks,
        { actionId, workerId, location: 'generator' },
      ],
      lastWork: {
        title,
        message,
        partsBefore: before.resources.parts,
        partsAfter: state.resources.parts,
        conditionBefore: generatorState(before).condition,
        conditionAfter: generatorState(state).condition,
      },
    },
    eventHistory: [
      ...state.eventHistory,
      { day: state.day, type: 'EVENT', message: `${title} · ${message}` },
    ],
  };
}
/** Once per facility/night, independent of player movement. Loading never invokes this. */
export function serviceGenerator(state: GameState): GameState {
  const gen = generatorState(state),
    worker = availableEngineer(state);
  if (
    state.day < 4 ||
    !state.nightShift ||
    gen.lastAutomationDay === state.day ||
    (!worker && gen.automationLevel < 2)
  )
    return state;
  let nextGen = {
      ...gen,
      lastAutomationDay: state.day,
      lastInspectedDay: state.day,
    },
    parts = 0;
  if (gen.activeProblem !== 'major') {
    if (
      worker &&
      (gen.condition <= 70 ||
        (gen.automationLevel === 4 && gen.condition < 90)) &&
      state.resources.parts >= 1
    ) {
      parts = 1;
      nextGen = {
        ...nextGen,
        condition: Math.min(
          gen.automationLevel === 4 ? 90 : 100,
          gen.condition + 25,
        ),
        wear: Math.max(0, gen.wear - 12),
        lastServicedDay: state.day,
      };
    } else if (
      !worker &&
      gen.automationLevel >= 3 &&
      gen.condition <= 70 &&
      state.resources.parts >= 1
    ) {
      parts = 1;
      nextGen = {
        ...nextGen,
        condition: Math.min(100, gen.condition + 8),
        lastServicedDay: state.day,
      };
    }
    nextGen.activeProblem = nextGen.condition <= 70 ? 'minor' : null;
  }
  let next = putGenerator(
    {
      ...state,
      resources: { ...state.resources, parts: state.resources.parts - parts },
      guests: state.guests.map((g) =>
        g.id === worker?.id
          ? { ...g, stress: Math.min(100, g.stress + (parts ? 4 : 1)) }
          : g,
      ),
    },
    nextGen,
  );
  const message =
    gen.activeProblem === 'major'
      ? '대형 파손입니다. 혼자서는 복구할 수 없습니다. 주인님의 도움이 필요합니다.'
      : parts
        ? `접점을 복구했습니다. 부품 ${state.resources.parts} → ${next.resources.parts}, 내구도 ${gen.condition} → ${nextGen.condition}.`
        : gen.activeProblem && !state.resources.parts
          ? '점검 완료. 부품이 없어 수리하지 못했습니다.'
          : '점검 완료. 이상이 생기면 알리겠습니다.';
  next = recordWork(
    next,
    state,
    `${worker?.name ?? '발전기 원격 장치'} · 자동 점검`,
    message,
    'generator_auto_service',
    worker?.id ?? null,
  );
  return next;
}
export function beginNightShift(state: GameState): GameState {
  if (!['desk', 'night_management'].includes(state.phase)) return state;
  if (state.nightShift?.day === state.day)
    return state.nightShift.completed
      ? state
      : { ...state, phase: 'night_management' };
  let next: GameState = {
    ...state,
    phase: 'night_management',
    nightShift: {
      day: state.day,
      elapsedMinutes: 0,
      location: 'front',
      completed: false,
      tasks: [],
    },
  };
  if (state.day >= 4) {
    const gen = generatorState(state),
      nights = Math.max(0, state.day - gen.lastWearDay);
    const occupants = state.guests.filter(
      (g) => g.alive && g.status === 'STAYING',
    ).length;
    const load =
      Math.ceil(occupants / 5) +
      Object.keys(state.facilities).length +
      (state.flags.severe_storm ? 4 : 0);
    const preventive = !!availableEngineer(next) && gen.automationLevel === 4;
    const wear = clamp(gen.wear + nights * (4 + load));
    const condition = Math.max(
      0,
      gen.condition -
        nights *
          Math.ceil(
            (8 + Math.floor(wear / 20) + load) * (preventive ? 0.5 : 1),
          ),
    );
    next = putGenerator(next, {
      ...gen,
      wear,
      condition,
      lastWearDay: state.day,
      activeProblem:
        gen.activeProblem === 'major' || condition <= 20
          ? 'major'
          : condition <= 70
            ? 'minor'
            : null,
    });
    next = serviceGenerator(next);
  }
  return next;
}
export function completeNightShift(state: GameState): GameState {
  if (!canSpendNightTime(state, 0)) return state;
  return {
    ...state,
    phase: 'night',
    nightShift: { ...state.nightShift!, completed: true },
  };
}
export function repairBlockReason(
  state: GameState,
  workerId: string | null,
): string | null {
  if (workerId) return '매일 수리 지시 대신 발전기 담당으로 지속 배정하세요.';
  if (state.day < 4 || state.nightShift?.location !== 'generator')
    return '발전기실에서 작업하세요.';
  const major = generatorState(state).activeProblem === 'major';
  if (!canSpendNightTime(state, major ? 90 : 45))
    return '새벽 03:00 전에는 이 작업을 마칠 시간이 없습니다.';
  if (generatorState(state).condition >= 100)
    return '발전기는 이미 정상 상태입니다.';
  if (state.resources.parts < (major ? 5 : 3))
    return `부품 ${major ? 5 : 3}개가 필요합니다.`;
  return null;
}
export function repairGenerator(
  state: GameState,
  workerId: string | null = null,
) {
  const blocked = repairBlockReason(state, workerId);
  if (blocked) return { state, ok: false, message: blocked };
  const gen = generatorState(state),
    major = gen.activeProblem === 'major',
    condition = Math.min(100, gen.condition + (major ? 45 : 30));
  let next = putGenerator(spendTime(state, major ? 90 : 45), {
    ...gen,
    condition,
    wear: Math.max(0, gen.wear - 15),
    lastServicedDay: state.day,
    lastInspectedDay: state.day,
    activeProblem: condition <= 70 ? 'minor' : null,
  });
  next = {
    ...next,
    resources: {
      ...next.resources,
      parts: next.resources.parts - (major ? 5 : 3),
    },
  };
  const message = '공구를 내려놓자 발전기의 불빛이 안정됩니다.';
  return {
    state: recordWork(
      next,
      state,
      '직접 발전기 수리',
      message,
      'repair_generator',
      null,
    ),
    ok: true,
    message,
  };
}
export function inspectGenerator(state: GameState): GameState {
  if (
    state.day < 4 ||
    state.nightShift?.location !== 'generator' ||
    generatorState(state).lastInspectedDay === state.day ||
    !canSpendNightTime(state, 15)
  )
    return state;
  const gen = generatorState(state);
  return recordWork(
    putGenerator(spendTime(state, 15), {
      ...gen,
      lastInspectedDay: state.day,
      wear: Math.max(0, gen.wear - 3),
    }),
    state,
    '발전기 점검 완료',
    `접점을 청소했습니다. ${gen.activeProblem ? '수리가 필요한 부분이 있습니다.' : '지금은 정상입니다.'} 연료 ${state.resources.fuel}.`,
    'inspect_generator',
    null,
  );
}
export function assignGeneratorDuty(
  state: GameState,
  workerId: string | null,
): GameState {
  if (
    state.day < 5 ||
    !canSpendNightTime(state, 10) ||
    (state.staffAssignments.MAINTENANCE ?? null) === workerId
  )
    return state;
  const worker = state.guests.find((g) => g.id === workerId);
  if (
    workerId &&
    (!worker ||
      !isGeneratorSpecialist(worker) ||
      getWorkerStatus(state, worker) !== 'AVAILABLE')
  )
    return state;
  const result = assignStaffDuty(state, 'MAINTENANCE', workerId);
  return result.ok ? serviceGenerator(spendTime(result.state, 10)) : state;
}
export function upgradeGenerator(state: GameState): GameState {
  const gen = generatorState(state),
    upgrade = GENERATOR_UPGRADES.find(
      (u) => u.level === gen.automationLevel + 1,
    );
  if (
    !upgrade ||
    state.day < upgrade.day ||
    state.nightShift?.location !== 'generator' ||
    !canSpendNightTime(state, upgrade.minutes) ||
    state.resources.parts < upgrade.parts ||
    gen.activeProblem === 'major'
  )
    return state;
  const next = putGenerator(
    spendTime(
      {
        ...state,
        resources: {
          ...state.resources,
          parts: state.resources.parts - upgrade.parts,
        },
      },
      upgrade.minutes,
    ),
    { ...gen, automationLevel: upgrade.level },
  );
  return recordWork(
    next,
    state,
    `발전기 LV.${upgrade.level}`,
    `${upgrade.description}. 경보는 즉시, 자동 복구·예방 정비는 다음 밤부터 적용됩니다.`,
    'upgrade_generator',
    null,
  );
}
export function performNightHotelAction(
  state: GameState,
  action: HotelActionId,
): GameState {
  const minutes = NIGHT_JOB_MINUTES[action],
    location = action === 'security_patrol' ? 'entrance' : 'rooms';
  if (
    !minutes ||
    state.nightShift?.location !== location ||
    (action === 'security_patrol' && state.day < 7) ||
    !canSpendNightTime(state, minutes)
  )
    return state;
  const result = performHotelAction(state, action, false);
  if (!result.ok) return state;
  const next = spendTime(result.state, minutes);
  return {
    ...next,
    nightShift: {
      ...next.nightShift!,
      tasks: [
        ...next.nightShift!.tasks,
        { actionId: action, workerId: null, location },
      ],
    },
  };
}
export function getGeneratorBreakdownEvent(
  state: GameState,
): NightEventDefinition | null {
  if (!generatorAtRisk(state)) return null;
  return {
    id: 'generator_breakdown',
    title: '새벽 · 복도 조명이 꺼졌다',
    description:
      '수리하지 못한 발전기가 멎었습니다. 진료와 주방 회로가 꺼지고, 연료를 쓰는 생산 시설도 밤새 멈춥니다.',
    quote: '“내일도 불이 들어오지 않는 건가요?”',
    priority: 1000,
    condition: {},
    choices: [
      {
        id: 'endure_blackout',
        label: '손전등을 들고 투숙객을 안심시킨다',
        description:
          '전체 회로 정지 · 투숙객 스트레스 +10 · 안전도 -4. 다음 밤 수리가 필요합니다.',
        effect: {
          flags: { generator_blackout: true, generator_outage_day: state.day },
          allGuestStress: 10,
        },
      },
    ],
  };
}
/** Restore source state only: no automatic service or second resource charge on load. */
export function normalizeNightWork(state: GameState): GameState {
  const old = state.nightShift;
  const nightShift =
    old && old.day === state.day
      ? {
          day: state.day,
          elapsedMinutes: clamp(
            old.elapsedMinutes,
            (3 - clamp(old.actions, 3, 3)) * 45,
            NIGHT_MINUTES,
          ),
          location: NIGHT_LOCATIONS.some(
            (l) => l.id === old.location && l.day <= state.day,
          )
            ? old.location
            : ('front' as const),
          completed: old.completed === true,
          tasks: Array.isArray(old.tasks)
            ? old.tasks.filter(
                (t) =>
                  t &&
                  typeof t.actionId === 'string' &&
                  (t.workerId === null || typeof t.workerId === 'string') &&
                  typeof t.location === 'string',
              )
            : [],
          lastWork:
            old.lastWork &&
            typeof old.lastWork.title === 'string' &&
            typeof old.lastWork.message === 'string' &&
            [
              'partsBefore',
              'partsAfter',
              'conditionBefore',
              'conditionAfter',
            ].every((k) => Number.isFinite(old.lastWork![k as 'partsBefore']))
              ? old.lastWork
              : undefined,
        }
      : undefined;
  const next: GameState = {
    ...state,
    facilityState: state.facilityState?.generator
      ? { ...state.facilityState, generator: generatorState(state) }
      : undefined,
    nightShift,
  };
  if (state.phase === 'night_management' && !nightShift)
    return beginNightShift({ ...next, phase: 'desk' });
  if (state.phase === 'night_management' && nightShift?.completed)
    return { ...next, phase: 'night' };
  return next;
}
