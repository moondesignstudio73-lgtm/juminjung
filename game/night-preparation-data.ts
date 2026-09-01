import type { NightPreparationConfig, NightPreparationOptionDefinition } from "./types.ts";

export const DEFAULT_NIGHT_PREPARATION: NightPreparationConfig = {
  PATROL: "STANDARD_WATCH",
  ISOLATION: "OPEN_FLOORS",
  EXTERIOR_LIGHT: "DARK_PERIMETER",
  NOISE: "NORMAL_HOURS",
};

export const NIGHT_PREPARATION_OPTIONS: ReadonlyArray<NightPreparationOptionDefinition> = [
  { id: "STANDARD_WATCH", category: "PATROL", name: "표준 당직", description: "프런트와 계단만 지킵니다.", tradeoff: "추가 효과 없음", effect: {} },
  { id: "ROVING_PATROL", category: "PATROL", name: "순환 순찰", description: "복도와 비상계단을 계속 순찰합니다.", tradeoff: "Security +3 · Threat -2 · 전원 Stress +3", effect: { hotelStats: { security: 3 }, threat: -2, allGuestStress: 3 } },
  { id: "OPEN_FLOORS", category: "ISOLATION", name: "개방 생활층", description: "객실 사이의 이동을 평소처럼 허용합니다.", tradeoff: "추가 효과 없음", effect: {} },
  { id: "SEALED_WINGS", category: "ISOLATION", name: "구역 격리", description: "생활층을 방화문 단위로 나누고 이동을 통제합니다.", tradeoff: "질병 확률 -8 · Crime -2 · 전원 Stress +4", effect: { hotelStats: { crime: -2 }, diseaseChance: -8, allGuestStress: 4 } },
  { id: "DARK_PERIMETER", category: "EXTERIOR_LIGHT", name: "외곽 소등", description: "창문과 외부 조명을 끄고 연료를 보존합니다.", tradeoff: "추가 효과 없음", effect: {} },
  { id: "EXTERIOR_LIGHTS", category: "EXTERIOR_LIGHT", name: "외곽 조명", description: "동쪽 철문과 골목의 투광등을 밤새 유지합니다.", tradeoff: "방호 회로 · 연료 1 · Security +2 · Threat -3", requiresPowerCircuit: "SECURITY", effect: { fuelCost: 1, hotelStats: { security: 2 }, threat: -3 } },
  { id: "NORMAL_HOURS", category: "NOISE", name: "일상 소음", description: "라디오와 공동 공간 사용을 평소처럼 허용합니다.", tradeoff: "추가 효과 없음", effect: {} },
  { id: "SILENCE_PROTOCOL", category: "NOISE", name: "완전 정숙", description: "해가 진 뒤 라디오와 대화를 최소화합니다.", tradeoff: "Threat -2 · 전원 Stress +3", effect: { threat: -2, allGuestStress: 3 } },
];
