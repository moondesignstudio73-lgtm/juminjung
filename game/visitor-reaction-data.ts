import type { VisitorReactionDefinition } from "./types.ts";

export const VISITOR_REACTIONS: VisitorReactionDefinition[] = [
  { id: "rosa-refugees-sheltered", guestId: "rosa", label: "피난민들의 증언", faction: "refugee", dialogue: "‘비 오는 밤에 아이들을 로비로 들였다고 들었어요. 그런 곳이라면 제 가족도 믿어볼게요.’", requiredFlags: { refugees_sheltered: true }, trustDelta: 12, riskDelta: -5, offerBonus: { food: 2, water: 2 } },
  { id: "rosa-refugees-denied", guestId: "rosa", label: "철문 밖의 소문", faction: "refugee", dialogue: "‘그날 밤 문밖에 아이들이 있었다죠. 제 아이들에게도 똑같이 할 건지 먼저 대답해요.’", requiredFlags: { refugees_denied: true }, trustDelta: -12, riskDelta: 8 },
  { id: "hayes-resistance", guestId: "hayes", label: "군사 저항 감지", faction: "military", dialogue: "‘탈영병을 숨기고 군 보급로까지 건드렸더군. 오늘은 손님이 아니라 조건을 제시하러 왔다.’", requiredFlags: { military_resistance_started: true }, trustDelta: -15, riskDelta: 12 },
  { id: "hazel-investigation", guestId: "hazel", label: "조사망의 소문", faction: "community", dialogue: "‘기자와 박사가 같은 흔적을 찾고 있다지. 내 덫에 걸린 털도 그 기록에 보태겠어.’", requiredFlags: { investigation_network_active: true }, trustDelta: 10, riskDelta: -4, offerBonus: { security: 2 } },
  { id: "claire-medical-network", guestId: "claire", label: "의료 공동체의 평판", faction: "humanitarian", dialogue: "‘여기 의사와 간호사가 함께 밤을 지새운다고 들었어요. 제 아이에게도 자리가 있을까요?’", requiredFlags: { medical_joint_triage: true }, trustDelta: 14, riskDelta: -8, offerBonus: { medicine: 1 } },
  { id: "thomas-blackout", guestId: "thomas", label: "정전의 흔적", faction: "community", dialogue: "‘어젯밤 이 구역 전압이 통째로 떨어졌어. 방보다 먼저 발전기실을 보여줘.’", requiredFlags: { generator_blackout: true }, trustDelta: -4, riskDelta: 5, offerBonus: { parts: 2 } },
  { id: "jack-merchant-reputation", guestId: "jack", label: "상인망 우호", faction: "merchant", dialogue: "‘JUJU HOTEL은 거래 약속을 지킨다더군. 단골에게는 상자 하나쯤 더 얹어야지.’", minimumReputation: { merchant: 30 }, trustDelta: 8, offerBonus: { food: 2, parts: 1 } },
  { id: "hayes-military-reputation", guestId: "hayes", label: "군 평판 우호", faction: "military", dialogue: "‘군의 질서를 존중하는 곳이라고 보고받았다. 그에 맞는 보급품을 가져왔지.’", forbiddenFlags: ["military_resistance_started"], minimumReputation: { military: 40 }, trustDelta: 10, riskDelta: -5, offerBonus: { security: 3, fuel: 2 } },
  { id: "rosa-refugee-reputation", guestId: "rosa", label: "피난민 평판 우호", faction: "refugee", dialogue: "‘길 위의 사람들이 이 호텔 이름을 안전한 곳처럼 말해요. 저도 그 말을 믿고 왔어요.’", forbiddenFlags: ["refugees_denied", "refugees_sheltered"], minimumReputation: { refugee: 30 }, trustDelta: 8, offerBonus: { water: 2 } },
];
