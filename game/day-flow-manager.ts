import type { GameState, Guest } from './types.ts';
import {
  prepareDailyVisitorQueue,
  getCurrentQueuedVisitor,
} from './visitor-queue-manager.ts';
import {
  beginNightShift,
  completeNightShift,
  getGeneratorFacilityView,
  type NightLocation,
} from './night-work-manager.ts';
import {
  getNightFoodDemand,
  getNightWaterDemand,
} from './aura-night-manager.ts';
import { calculatePowerPlan, getRationPlan } from './daily-survival-manager.ts';
import { getNightStaffPlan } from './staff-operation-manager.ts';

export type DayStage = NonNullable<GameState['dayFlow']>['stage'];
export const DAY_STAGES: Array<{ id: DayStage; label: string; day: number }> = [
  { id: 'report', label: '아침 보고', day: 1 },
  { id: 'visitors', label: '프론트', day: 1 },
  { id: 'residents', label: '주민과 배급', day: 2 },
  { id: 'operations', label: '호텔 운영', day: 3 },
  { id: 'events', label: '밤의 사건', day: 1 },
];
export function currentDayStage(state: GameState): DayStage {
  if (state.phase === 'report') return 'report';
  if (state.phase === 'night_management') return 'operations';
  if (state.phase === 'night' || state.phase === 'story') return 'events';
  if (
    state.dayFlow?.day === state.day &&
    ['residents', 'visitors', 'report'].includes(state.dayFlow.stage)
  )
    return state.dayFlow.stage;
  return 'visitors';
}
function atStage(state: GameState, stage: DayStage): GameState {
  const visited = state.dayFlow?.day === state.day ? state.dayFlow.visited : [];
  return {
    ...state,
    dayFlow: {
      day: state.day,
      stage,
      visited: [...new Set([...visited, stage])],
      operationLocation: null,
      morningBrief:
        state.dayFlow?.day === state.day
          ? state.dayFlow.morningBrief
          : undefined,
    },
  };
}
export function normalizeDayFlow(state: GameState): GameState {
  const stage = currentDayStage(state),
    old = state.dayFlow;
  const known = DAY_STAGES.map((s) => s.id);
  const visited =
    old?.day === state.day && Array.isArray(old.visited)
      ? old.visited.filter(
          (s) => known.includes(s) && known.indexOf(s) <= known.indexOf(stage),
        )
      : known.slice(0, known.indexOf(stage));
  const location = old?.operationLocation;
  return {
    ...state,
    dayFlow: {
      day: state.day,
      stage,
      visited: [...new Set([...visited, stage])],
      morningBrief:
        old?.day === state.day && Array.isArray(old.morningBrief)
          ? old.morningBrief.filter((l) => typeof l === 'string').slice(0, 5)
          : undefined,
      operationLocation:
        stage === 'operations' &&
        [
          'front',
          'rooms',
          'kitchen',
          'storage',
          'generator',
          'clinic',
          'entrance',
        ].includes(location ?? '')
          ? location
          : null,
    },
  };
}
export function residentStatus(guest: Guest) {
  if (guest.health < 35) return { label: '중상 · 도움 필요', rank: 4 };
  if (guest.infectionState !== 'HEALTHY')
    return { label: '질병 · 상태 확인', rank: 3 };
  if (guest.health < 70) return { label: '부상 · 회복 필요', rank: 2 };
  if (guest.stress >= 75) return { label: '지침 · 휴식 필요', rank: 1 };
  return { label: '안정', rank: 0 };
}
export function getLivingForecast(state: GameState) {
  const residents = state.guests.filter(
    (g) => g.alive && g.status === 'STAYING',
  );
  const power = calculatePowerPlan(state, residents.length);
  const staff = getNightStaffPlan(state);
  const food = getRationPlan(
    Math.max(
      0,
      getNightFoodDemand(state.rooms, state.guests, state.flags).demand +
        power.extraFoodDemand -
        staff.foodSaving,
    ),
    state.foodRationPolicy,
  ).foodDemand;
  const water = getNightWaterDemand(state.guests, state.flags).demand;
  return {
    residents,
    food,
    water,
    foodDays: food ? state.resources.food / food : null,
    waterDays: water ? state.resources.water / water : null,
  };
}
export type OperationTask = {
  id: string;
  title: string;
  detail: string;
  severity: '주의' | '긴급' | '선택';
  location: NightLocation | 'staff';
};
export function getOperationTasks(state: GameState): OperationTask[] {
  if (state.day < 3) return [];
  const tasks: OperationTask[] = [];
  if (!state.rooms.some(r=>r.status==='EMPTY'&&!r.occupied) && state.rooms.some(r=>r.recovery&&!r.recovery.restored)) tasks.push({id:'capacity',title:'빈 객실이 없습니다',detail:'누군가를 더 받으려면 잠긴 객실을 복구하거나 주민과 퇴실을 의논해야 합니다.',severity:'주의',location:'rooms'});
  if (state.day >= 4) {
    const gen = getGeneratorFacilityView(state);
    if (gen.alert || (!gen.remote && gen.lastInspectedDay !== state.day))
      tasks.push({
        id: 'generator',
        title: gen.alert ? '발전기 지원 요청' : '발전기 직접 점검',
        detail:
          gen.alert ??
          '접점과 연료를 살피세요. 엔지니어에게 계속 맡길 수도 있습니다.',
        severity: ['URGENT', 'CRITICAL'].includes(gen.severity)
          ? '긴급'
          : '주의',
        location: 'generator',
      });
  }
  const damaged = state.rooms.filter((r) => r.status === 'DAMAGED');
  if (damaged.length || state.hotelStats.hotelCondition < 65)
    tasks.push({
      id: 'rooms',
      title: damaged.length
        ? `손상 객실 ${damaged.length}개`
        : '호텔 보수 필요',
      detail: '객실과 공용 공간을 직접 확인하세요.',
      severity: '주의',
      location: 'rooms',
    });
  if (
    state.day >= 6 &&
    state.guests.some(
      (g) => g.alive && g.status === 'STAYING' && residentStatus(g).rank >= 2,
    )
  )
    tasks.push({
      id: 'clinic',
      title: '회복이 필요한 주민',
      detail: '의무실 상태와 진료 담당을 확인하세요.',
      severity: '주의',
      location: 'clinic',
    });
  if (state.day >= 7 && state.hotelStats.security < 45)
    tasks.push({
      id: 'entrance',
      title: '정문 경계 보강',
      detail: '낮아진 안전도에 대비해 순찰할 수 있습니다.',
      severity: '긴급',
      location: 'entrance',
    });
  if (
    state.day >= 8 &&
    state.guests.some((g) => g.alive && g.status === 'STAYING') &&
    state.lastScavengeDay !== state.day
  )
    tasks.push({
      id: 'scavenge',
      title: '외부 탐사 준비',
      detail: '부족한 물자에 맞춰 담당자와 수색지를 선택하세요.',
      severity: '선택',
      location: 'staff',
    });
  return tasks.sort(
    (a, b) => Number(b.severity === '긴급') - Number(a.severity === '긴급'),
  );
}
export function advanceDayFlow(state: GameState): GameState {
  const stage = currentDayStage(state);
  if (
    stage === 'events' ||
    ['title', 'prologue', 'ending'].includes(state.phase)
  )
    return state;
  if (stage === 'report') {
    state = {
      ...state,
      dayFlow: {
        ...normalizeDayFlow(state).dayFlow!,
        morningBrief: getMorningBrief(state),
      },
    };
    const next = prepareDailyVisitorQueue({
      ...state,
      phase: 'desk',
      decision: null,
      asked: [],
      inspected: [],
      negotiated: false,
      held: false,
    });
    if (getCurrentQueuedVisitor(next)) return atStage(next, 'visitors');
    return afterVisitors(next);
  }
  if (stage === 'visitors')
    return getCurrentQueuedVisitor(state) ? state : afterVisitors(state);
  if (stage === 'residents') return startOperations(state);
  return atStage(completeNightShift(state), 'events');
}
function afterVisitors(state: GameState): GameState {
  return state.day >= 2
    ? atStage({ ...state, phase: 'desk' }, 'residents')
    : startOperations(state);
}
function startOperations(state: GameState): GameState {
  const next = atStage(
    beginNightShift({ ...state, phase: 'desk' }),
    'operations',
  );
  return getOperationTasks(next).length
    ? next
    : atStage(completeNightShift(next), 'events');
}
export function openOptionalOperations(state: GameState): GameState {
  if (state.day < 3 || currentDayStage(state) !== 'residents') return state;
  return atStage(beginNightShift({ ...state, phase: 'desk' }), 'operations');
}
/** A short presentation projection. It never replays settlement or invents events. */
export function getMorningBrief(state: GameState): string[] {
  if (state.dayFlow?.day === state.day && state.dayFlow.morningBrief?.length)
    return state.dayFlow.morningBrief;
  if (state.day <= 1)
    return [
      '아버지가 남긴 호텔의 문을 엽니다.',
      '첫 손님의 사정을 듣고, 머물 방을 정해 주세요.',
    ];
  const result = state.lastNightPresentation;
  const lines: string[] = [];
  if (result?.choice) lines.push(`어젯밤의 선택 · ${result.choice}`);
  if (result?.moments) lines.push(...result.moments.slice(0, 2));
  const gen =
    state.day >= 4 && state.facilityState?.generator
      ? getGeneratorFacilityView(state)
      : null;
  if (gen?.alert) lines.push(gen.alert);
  const majorChange = [...(result?.changes ?? [])]
    .filter((c) => Math.abs(c.after - c.before) >= 3)
    .sort(
      (a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before),
    )[0];
  if (majorChange) {
    const label =
      (
        {
          food: '식량',
          water: '물',
          fuel: '연료',
          parts: '부품',
          medicine: '의약품',
          security: '보안 물자',
        } as Record<string, string>
      )[majorChange.resource] ?? majorChange.resource;
    lines.push(
      `${label} ${Math.abs(majorChange.after - majorChange.before)}${majorChange.after < majorChange.before ? ' 손실' : ' 확보'} · 어젯밤 사건의 결과입니다.`,
    );
  }
  const checkedOut = state.lastDaySummary?.checkedOutGuestIds ?? [];
  const unreported = checkedOut.filter((id) => {
    const name = state.guests.find((g) => g.id === id)?.name;
    return (
      !name ||
      !lines.some(
        (line) => line.includes(name) && /체류|열쇠|떠났|퇴실/.test(line),
      )
    );
  });
  if (unreported.length)
    lines.push(
      `${unreported
        .map((id) => state.guests.find((g) => g.id === id)?.name ?? '투숙객')
        .slice(0, 2)
        .join(
          ', ',
        )}${unreported.length > 2 ? ' 외 주민' : ''}이 호텔을 떠났습니다.`,
    );
  const forecast = getLivingForecast(state);
  if (forecast.foodDays !== null && forecast.foodDays < 2)
    lines.push('식량이 이틀분보다 적습니다. 오늘 배급과 물자 확보를 살피세요.');
  if (forecast.waterDays !== null && forecast.waterDays < 2)
    lines.push('물이 이틀분보다 적습니다. 주민에게 돌아갈 물을 확인하세요.');
  return [...new Set(lines)].slice(0, 5).length
    ? [...new Set(lines)].slice(0, 5)
    : ['호텔은 조용히 아침을 맞았습니다. 주민들의 안부를 살펴보세요.'];
}
