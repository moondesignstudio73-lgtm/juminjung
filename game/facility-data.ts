import type { FacilityDefinition } from "./types.ts";

export const FACILITIES: FacilityDefinition[] = [
  { id: "water_purifier", name: "정수 시설", description: "외부 급수망이 끊겨도 식수를 확보합니다.", levels: [
    { level: 1, name: "침전 정수조", description: "매일 물 2 생산", cost: { parts: 4, fuel: 4 }, production: { water: 2 }, statChanges: { waterSustainability: 1, hotelCondition: 5 }, reputationChanges: { community: 10, humanitarian: 5 } },
    { level: 2, name: "모래 여과 순환기", description: "매일 연료 1을 사용해 물 4 생산", cost: { parts: 4, fuel: 3 }, production: { water: 4 }, upkeep: { fuel: 1 }, statChanges: { waterSustainability: 1, hotelCondition: 3 }, reputationChanges: { community: 5, humanitarian: 4 } },
    { level: 3, name: "폐쇄형 정수망", description: "매일 연료 1을 사용해 물 7 생산", cost: { parts: 6, fuel: 4 }, production: { water: 7 }, upkeep: { fuel: 1 }, statChanges: { hotelCondition: 4 }, reputationChanges: { community: 6, humanitarian: 5 } },
  ] },
  { id: "food_production", name: "실내 식량 생산실", description: "옥상과 빈 객실에서 장기 식량을 생산합니다.", levels: [
    { level: 1, name: "버섯 재배실", description: "매일 식량 2 생산", cost: { parts: 5, food: 4 }, production: { food: 2 }, statChanges: { foodSustainability: 1, hotelCondition: 5 }, reputationChanges: { community: 12, humanitarian: 5 } },
    { level: 2, name: "옥상 온실", description: "매일 물 1을 사용해 식량 4 생산", cost: { parts: 4, water: 4 }, production: { food: 4 }, upkeep: { water: 1 }, statChanges: { foodSustainability: 1, hotelCondition: 3 }, reputationChanges: { community: 6, humanitarian: 4 } },
    { level: 3, name: "수경 재배동", description: "매일 물 2를 사용해 식량 7 생산", cost: { parts: 6, water: 6 }, production: { food: 7 }, upkeep: { water: 2 }, statChanges: { hotelCondition: 4 }, reputationChanges: { community: 7, humanitarian: 5 } },
  ] },
  { id: "armory", name: "무기고", description: "무기와 탄약을 통제된 장소에 보관합니다.", levels: [
    { level: 1, name: "잠금 무기고", description: "매일 보안 물자 2 확보", cost: { parts: 6, security: 10 }, production: { security: 2 }, statChanges: { security: 20 }, reputationChanges: { military: 20, refugee: -5 } },
    { level: 2, name: "탄약 정비대", description: "매일 연료 1을 사용해 보안 물자 4 확보", cost: { parts: 5, security: 8 }, production: { security: 4 }, upkeep: { fuel: 1 }, statChanges: { security: 8 }, reputationChanges: { military: 8, refugee: -2 } },
    { level: 3, name: "호텔 방위 본부", description: "매일 연료 1을 사용해 보안 물자 7 확보", cost: { parts: 7, security: 10 }, production: { security: 7 }, upkeep: { fuel: 1 }, statChanges: { security: 10 }, reputationChanges: { military: 10, refugee: -3 } },
  ] },
  { id: "trade_network", name: "교역망", description: "라디오와 운송 경로를 연결해 폐허의 시장을 엽니다.", levels: [
    { level: 1, name: "라디오 교역망", description: "매일 연료 1을 사용해 부품 1 확보", cost: { parts: 4, fuel: 6 }, production: { parts: 1 }, upkeep: { fuel: 1 }, statChanges: { resources: 10 }, reputationChanges: { merchant: 20, humanitarian: -3 } },
    { level: 2, name: "폐허 운송로", description: "매일 식량·물 1로 부품 2와 연료 1 확보", cost: { parts: 5, fuel: 5 }, production: { parts: 2, fuel: 1 }, upkeep: { food: 1, water: 1 }, statChanges: { resources: 8 }, reputationChanges: { merchant: 10, humanitarian: -2 } },
    { level: 3, name: "지역 교역 허브", description: "매일 식량·물 1로 부품 3과 연료 3 확보", cost: { parts: 8, fuel: 6 }, production: { parts: 3, fuel: 3 }, upkeep: { food: 1, water: 1 }, statChanges: { resources: 10 }, reputationChanges: { merchant: 12, humanitarian: -2 } },
  ] },
];
