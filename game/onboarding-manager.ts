import type { GameState } from "./types.ts";

export type OnboardingStage = "ARRIVAL" | "SUPPLIES" | "MAINTENANCE" | "FULL_HOTEL";

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
};

export function getOnboardingGuide(day: number): OnboardingGuide {
  if (day <= 1) return {
    stage: "ARRIVAL",
    title: "첫 손님에게 방을 내어주세요",
    instruction: "방문자를 확인하고 체크인한 뒤, 빈 객실 하나를 선택하세요.",
    unlocked: "오늘은 방문자와 객실만 사용합니다.",
    showResources: false,
    showFood: false,
    showPower: false,
    showStaff: false,
    showAdvanced: false,
  };
  if (day === 2) return {
    stage: "SUPPLIES",
    title: "오늘 밤 먹을 식량을 확인하세요",
    instruction: "투숙객이 늘면 밤마다 식량을 소비합니다. 필요한 경우 배급을 조정하세요.",
    unlocked: "새 시스템 · 식량과 배급",
    showResources: true,
    showFood: true,
    showPower: false,
    showStaff: false,
    showAdvanced: false,
  };
  if (day === 3) return {
    stage: "MAINTENANCE",
    title: "발전기 이상음을 조사하세요",
    instruction: "수리 능력이 높은 투숙객을 정비 담당으로 배치하고 필요한 회로만 남기세요.",
    unlocked: "새 시스템 · 전력과 정비 배치",
    showResources: true,
    showFood: true,
    showPower: true,
    showStaff: true,
    showAdvanced: false,
  };
  return {
    stage: "FULL_HOTEL",
    title: "오늘의 문제를 해결하세요",
    instruction: "목표를 확인하고 투숙객의 능력과 호텔 자원을 활용하세요.",
    unlocked: "호텔 운영 시스템 개방",
    showResources: true,
    showFood: true,
    showPower: true,
    showStaff: true,
    showAdvanced: true,
  };
}

export function getPrimaryObjective(state: Pick<GameState, "day" | "dailyVisitorQueue" | "dailyVisitorIndex">): string {
  const guide = getOnboardingGuide(state.day);
  if (state.day === 1 && state.dailyVisitorIndex < state.dailyVisitorQueue.length) return "방문자를 결정하고 객실 배정";
  return guide.title;
}
