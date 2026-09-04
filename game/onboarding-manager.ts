import type { GameState } from './types.ts';

export type OnboardingStage =
  | 'ARRIVAL'
  | 'ROOM_EFFECT'
  | 'PROFESSION'
  | 'SUPPLIES'
  | 'STAFFING'
  | 'POWER'
  | 'FIRST_CRISIS'
  | 'SCAVENGE'
  | 'INVESTIGATION'
  | 'CODEX';

export type OnboardingGuide = {
  stage: OnboardingStage;
  title: string;
  instruction: string;
  unlocked: string;
  showResources: boolean;
  showFood: boolean;
  showPower: boolean;
  showStaff: boolean;
  showAdvanced: boolean;
  showAura: boolean;
  showScavenge: boolean;
  showInvestigation: boolean;
  showCodex: boolean;
};

const commonHidden = {
  showResources: false,
  showFood: false,
  showPower: false,
  showStaff: false,
  showAdvanced: false,
  showAura: false,
  showScavenge: false,
  showInvestigation: false,
  showCodex: false,
};

export function getOnboardingGuide(day: number): OnboardingGuide {
  if (day <= 1)
    return {
      stage: 'ARRIVAL',
      title: '첫 손님에게 방을 내어주세요',
      instruction: '방문자를 확인하고 체크인한 뒤, 빈 객실 하나를 선택하세요.',
      unlocked: '오늘은 방문자와 객실만 사용합니다.',
      ...commonHidden,
    };
  if (day === 2)
    return {
      stage: 'ROOM_EFFECT',
      title: '아픈 투숙객에게 알맞은 방을 찾으세요',
      instruction:
        '객실 위치가 주변 사람에게 영향을 줍니다. 객실 배치도에서 가까운 방을 확인하세요.',
      unlocked: '새 시스템 · 객실 위치 효과',
      ...commonHidden,
      showAura: true,
    };
  if (day === 3)
    return {
      stage: 'PROFESSION',
      title: '투숙객의 직업 능력을 확인하세요',
      instruction:
        '직업은 말뿐인 소개가 아닙니다. 오늘의 문제에 맞는 사람을 기억해 두세요.',
      unlocked: '새 시스템 · 직업 능력',
      ...commonHidden,
    };
  if (day === 4)
    return {
      stage: 'SUPPLIES',
      title: '새 숙박 규칙으로 호텔을 운영하세요',
      instruction:
        '제공 물자와 진술을 확인한 뒤 입실을 결정하고, 밤에는 발전기 상태를 점검하세요.',
      unlocked: '새 운영 규칙 · 숙박 대가와 방문자 확인',
      showResources: true,
      showFood: true,
      showPower: false,
      showStaff: false,
      showAdvanced: false,
      showAura: true,
      showScavenge: false,
      showInvestigation: false,
      showCodex: false,
    };
  if (day === 5)
    return {
      stage: 'STAFFING',
      title: '오늘의 문제를 맡을 담당자를 정하세요',
      instruction: '정비공의 사정을 듣고 입실을 결정하세요. 발전기 담당으로 한 번 배정하면 매일 점검과 경미한 수리를 대신합니다.',
      unlocked: '새 시스템 · 직원 업무 배치',
      showResources: true,
      showFood: true,
      showPower: false,
      showStaff: true,
      showAdvanced: false,
      showAura: true,
      showScavenge: false,
      showInvestigation: false,
      showCodex: false,
    };
  if (day === 6)
    return {
      stage: 'POWER',
      title: '발전기실의 이상한 소리를 조사하세요',
      instruction:
        '엔지니어를 지속 배정하면 매일 점검과 경미 수리를 맡습니다. 별도의 조사 사건과 대형 파손은 직접 해결하세요.',
      unlocked: '새 시스템 · 전력',
      showResources: true,
      showFood: true,
      showPower: true,
      showStaff: true,
      showAdvanced: false,
      showAura: true,
      showScavenge: false,
      showInvestigation: false,
      showCodex: false,
    };
  if (day === 7)
    return {
      stage: 'FIRST_CRISIS',
      title: '정전과 침입 위기를 함께 막으세요',
      instruction:
        '지금까지 익힌 객실, 배급, 직원, 전력을 이용해 첫 종합 위기에 대비하세요.',
      unlocked: '첫 종합 위기 · 새 시스템 없음',
      showResources: true,
      showFood: true,
      showPower: true,
      showStaff: true,
      showAdvanced: true,
      showAura: true,
      showScavenge: false,
      showInvestigation: false,
      showCodex: false,
    };
  if (day === 8)
    return {
      stage: 'SCAVENGE',
      title: '호텔 밖에서 필요한 물자를 확보하세요',
      instruction:
        '탐색 담당자와 목적지를 정하고, 보이는 위험을 감수할지 선택하세요.',
      unlocked: '새 시스템 · 외부 탐색',
      showResources: true,
      showFood: true,
      showPower: true,
      showStaff: true,
      showAdvanced: true,
      showAura: true,
      showScavenge: true,
      showInvestigation: false,
      showCodex: false,
    };
  if (day === 9)
    return {
      stage: 'INVESTIGATION',
      title: '호텔 안에 남은 증거를 조사하세요',
      instruction:
        '사건 기록에서 조사 지점을 고르고, 모은 증거로 결론을 내리세요.',
      unlocked: '새 시스템 · 사건 조사',
      showResources: true,
      showFood: true,
      showPower: true,
      showStaff: true,
      showAdvanced: true,
      showAura: true,
      showScavenge: true,
      showInvestigation: true,
      showCodex: false,
    };
  return {
    stage: 'CODEX',
    title: '괴물의 행동 기록으로 밤을 대비하세요',
    instruction:
      '확인된 진술과 현장 증거를 도감에서 비교해 대응법을 선택하세요.',
    unlocked: '새 시스템 · 괴물 도감',
    showResources: true,
    showFood: true,
    showPower: true,
    showStaff: true,
    showAdvanced: true,
    showAura: true,
    showScavenge: true,
    showInvestigation: true,
    showCodex: true,
  };
}

export function getPrimaryObjective(
  state: Pick<GameState, 'day' | 'dailyVisitorQueue' | 'dailyVisitorIndex'>,
): string {
  const guide = getOnboardingGuide(state.day);
  if (
    state.day === 1 &&
    state.dailyVisitorIndex < state.dailyVisitorQueue.length
  )
    return '방문자를 결정하고 객실 배정';
  return guide.title;
}
