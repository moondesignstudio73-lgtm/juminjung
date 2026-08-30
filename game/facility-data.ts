import type { FacilityDefinition } from "./types.ts";

export const FACILITIES: FacilityDefinition[] = [
  { id: "water_purifier", name: "정수 시설", description: "외부 급수망이 끊겨도 식수를 확보합니다.", cost: { parts: 4, fuel: 4 }, statChanges: { waterSustainability: 1, hotelCondition: 5 }, reputationChanges: { community: 10, humanitarian: 5 } },
  { id: "food_production", name: "실내 식량 생산실", description: "옥상과 빈 객실에서 장기 식량을 생산합니다.", cost: { parts: 5, food: 4 }, statChanges: { foodSustainability: 1, hotelCondition: 5 }, reputationChanges: { community: 12, humanitarian: 5 } },
  { id: "armory", name: "무기고", description: "무기와 탄약을 통제된 장소에 보관합니다.", cost: { parts: 6, security: 10 }, statChanges: { security: 20 }, reputationChanges: { military: 20, refugee: -5 } },
  { id: "trade_network", name: "교역망", description: "라디오와 운송 경로를 연결해 폐허의 시장을 엽니다.", cost: { parts: 4, fuel: 6 }, statChanges: { resources: 10 }, reputationChanges: { merchant: 20, humanitarian: -3 } },
];
