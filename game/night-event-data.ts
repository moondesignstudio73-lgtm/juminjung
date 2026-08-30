import type { NightEventDefinition } from "./types.ts";

export const NIGHT_EVENTS: NightEventDefinition[] = [
  { id: "perimeter_breach", title: "동쪽 철문의 그림자", description: "철문 바깥의 무언가가 바리케이드를 밀어내고 있습니다.", quote: "금속이 한 번 휘고, 복도 조명이 모두 꺼졌다.", priority: 100, condition: { worldStates: ["COLLAPSE", "CRITICAL", "END_STAGE"], minimumThreat: 20, maximumSecurity: 59, requiresGuests: true }, choices: [
    { id: "barricade", label: "부품으로 철문을 보강한다", description: "부품 2를 사용해 침입을 늦춥니다.", requiredResources: { parts: 2 }, effect: { resources: { parts: -2 }, hotelStats: { hotelCondition: -2, security: 3 }, threat: -5 } },
    { id: "fight", label: "무장 인원을 내보낸다", description: "위협은 크게 줄지만 투숙객 한 명이 다칠 수 있습니다.", effect: { resources: { security: -5 }, reputations: { military: 5 }, threat: -10, targetGuestHealth: -15 } },
  ] },
  { id: "food_shortage", title: "배급실 앞의 언쟁", description: "남은 식량이 오늘 밤 투숙객 모두에게 돌아가지 않습니다.", quote: "빈 통조림이 바닥을 구르자 복도에서 말소리가 끊겼다.", priority: 90, condition: { shortage: "food", requiresGuests: true }, choices: [
    { id: "ration", label: "배급량을 줄인다", description: "자원은 보존하지만 모두의 Stress가 증가합니다.", effect: { allGuestStress: 8, reputations: { community: -3 } } },
    { id: "share", label: "비상 식량을 연다", description: "식량 3을 더 소비하고 공동체의 신뢰를 지킵니다.", requiredResources: { food: 3 }, effect: { resources: { food: -3 }, allGuestStress: -3, reputations: { humanitarian: 5, community: 3 } } },
  ] },
  { id: "generator_failure", title: "발전기의 마지막 기침", description: "연료 압력이 떨어지며 호텔 절반이 암흑에 잠깁니다.", quote: "아버지가 남긴 발전기 매뉴얼의 마지막 장이 찢겨 있다.", priority: 80, condition: { maximumResource: { fuel: 10 } }, choices: [
    { id: "reserve", label: "예비 연료를 붓는다", description: "연료 2를 더 사용해 조명을 유지합니다.", requiredResources: { fuel: 2 }, effect: { resources: { fuel: -2 }, threat: -1 } },
    { id: "blackout", label: "객실 한 동을 폐쇄한다", description: "연료를 아끼지만 호텔 상태와 안전이 나빠집니다.", effect: { hotelStats: { hotelCondition: -3, security: -3 }, threat: 5 } },
  ] },
  { id: "refugee_wave", title: "빗속의 가족들", description: "어린아이를 포함한 피난민들이 철문 앞에서 하룻밤만을 청합니다.", quote: "‘방은 필요 없어요. 지붕만이라도 빌려주세요.’", priority: 60, condition: { worldStates: ["UNREST", "COLLAPSE", "CRITICAL", "END_STAGE"], minimumDay: 8, dayModulo: 4 }, choices: [
    { id: "shelter", label: "로비를 피난처로 연다", description: "식량을 나누고 피난민 평판을 얻지만 위협도 따라옵니다.", requiredResources: { food: 4, water: 3 }, effect: { resources: { food: -4, water: -3 }, reputations: { refugee: 8, humanitarian: 6, community: 3 }, flags: { refugees_sheltered: true }, threat: 4 } },
    { id: "deny", label: "철문을 열지 않는다", description: "안전은 유지되지만 바깥에 소문이 퍼집니다.", effect: { reputations: { refugee: -8, humanitarian: -4 }, hotelStats: { security: 2 }, threat: -1 } },
  ] },
  { id: "quiet_watch", title: "긴 복도, 짧은 밤", description: "라디오 잡음 외에는 아무 소리도 들리지 않습니다.", quote: "평온한 밤일수록 다음 노크가 더 선명하게 들린다.", priority: 0, condition: {}, choices: [
    { id: "patrol", label: "복도를 순찰한다", description: "연료 1을 사용해 Security를 높이고 위협을 낮춥니다.", requiredResources: { fuel: 1 }, effect: { resources: { fuel: -1, security: 2 }, hotelStats: { security: 2 }, threat: -2 } },
    { id: "rest", label: "모두 쉬게 한다", description: "투숙객들의 Stress가 조금 회복됩니다.", effect: { allGuestStress: -5 } },
  ] },
];
