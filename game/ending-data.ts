import type { EndingCondition } from "./types.ts";

export const ENDING_CONDITIONS: EndingCondition[] = [
  { endingId: "SAFE_HAVEN", name: "SAFE HAVEN", priority: 70, description: "JUJU HOTEL이 영구적인 생존자 공동체가 될 수 있습니다.", minimumStats: { hotelCondition: 85, security: 70, foodSustainability: 1, waterSustainability: 1, survivorPopulation: 15, averageTrust: 60 }, maximumStats: { crime: 25 }, requiredFacilities: ["water_purifier", "food_production"], requiredReputation: { community: 70 } },
  { endingId: "THE_TRUTH", name: "THE TRUTH", priority: 90, description: "괴물과 아버지의 실종에 관한 마지막 진실에 접근할 수 있습니다.", requiredFlags: { monster_origin_clue_1: true, monster_origin_clue_2: true, vale_research_complete: true, lily_documents_decoded: true, father_secret_discovered: true } },
  { endingId: "FORTRESS", name: "FORTRESS", priority: 60, description: "호텔을 무장 요새로 완성할 수 있습니다.", minimumStats: { security: 90 }, requiredFacilities: ["armory"], requiredReputation: { military: 70 }, maximumStats: { survivorPopulation: 14 } },
  { endingId: "HOME", name: "HOME", priority: 65, description: "신뢰와 돌봄으로 이어진 공동체의 미래가 열립니다.", maximumStats: { crime: 15 }, requiredNPCStates: [{ id: "ruth", alive: true, completedStory: true }, { id: "rosa", alive: true, completedStory: true }, { id: "mia", alive: true, completedStory: true }] },
  { endingId: "KING_OF_THE_RUINS", name: "KING OF THE RUINS", priority: 55, description: "폐허의 가장 강력한 교역 중심지가 될 수 있습니다.", minimumStats: { resources: 85 }, requiredFacilities: ["trade_network"], requiredReputation: { merchant: 80 }, maximumReputation: { humanitarian: 40 }, requiredStoryProgress: ["jack-resolution", "victor-resolution"] },
  { endingId: "MILITARY_OCCUPATION", name: "MILITARY OCCUPATION", priority: 100, description: "군의 영향력이 호텔의 자치권을 위협합니다.", requiredFlags: { military_resistance_failed: true }, requiredReputation: { military: 90 } },
  { endingId: "THE_DOOR", name: "THE DOOR", priority: 110, hidden: true, description: "문 너머에서 마지막 질문이 기다립니다.", requiredFlags: { mr_white_door: true, father_secret_discovered: true, monster_origin_clue_2: true }, requiredWorldState: ["END_STAGE"] },
];
