import type { StoryChoiceEvent } from "./types.ts";

export const STORY_CHOICE_EVENTS: StoryChoiceEvent[] = [
  { id: "eleanor-triage", guestId: "eleanor", stage: "CONFLICT", title: "두 사람 중 한 사람", description: "의약품은 한 사람에게만 충분합니다. Eleanor가 결정을 당신에게 넘깁니다.", quote: "‘살릴 수 있는 사람을 고르는 일에도 기준은 있어야 해요.’", choices: [
    { id: "treat_all", label: "비축 약품을 더 내어준다", description: "의약품 2를 사용해 두 사람 모두를 치료합니다.", requiredResources: { medicine: 2 }, effect: { resources: { medicine: -2 }, trust: 12, reputations: { community: 6, humanitarian: 8 }, flags: { eleanor_humanitarian_choice: true } } },
    { id: "strict_triage", label: "Eleanor의 우선순위를 따른다", description: "약품은 보존되지만 남겨진 사람의 비명이 오래 남습니다.", effect: { trust: -5, stress: 8, reputations: { military: 3, humanitarian: -5 }, flags: { eleanor_strict_triage: true } } },
  ] },
  { id: "walter-father-lie", guestId: "walter", stage: "CONFLICT", title: "아버지의 거짓말", description: "Walter는 아버지가 호텔을 떠난 진짜 이유를 알고 있으면서도 말을 아낍니다.", quote: "‘네 아버지는 도망친 게 아니다. 하지만 돌아온다는 말도 믿지 마라.’", choices: [
    { id: "confront", label: "숨기는 사실을 추궁한다", description: "관계는 거칠어지지만 아버지의 행적에 관한 첫 단서를 얻습니다.", effect: { trust: -4, fatherStoryProgress: 15, flags: { father_clue_walter: true } } },
    { id: "wait", label: "그가 말할 때까지 기다린다", description: "Walter의 신뢰를 얻지만 진실은 조금 더 멀어집니다.", effect: { trust: 10, fatherStoryProgress: 5, flags: { walter_trusts_player: true } } },
  ] },
  { id: "mia-daniel", guestId: "mia", stage: "CONFLICT", title: "Daniel의 방문", description: "Mia의 아버지라고 주장하는 Daniel이 문밖에서 아이의 이름을 부릅니다.", quote: "Mia는 고개를 저으면서도 토끼 인형을 문 쪽으로 꼭 끌어안았다.", choices: [
    { id: "protect", label: "Mia를 숨기고 Daniel을 돌려보낸다", description: "아이의 안전을 우선하고 Daniel과의 갈등을 키웁니다.", effect: { trust: 12, stress: -5, reputations: { community: 5, humanitarian: 5 }, flags: { mia_protected: true }, relationship: { targetId: "daniel", delta: -20 } } },
    { id: "meeting", label: "감시 아래 만나게 한다", description: "가족의 진위를 확인할 기회를 열지만 Mia의 불안이 커집니다.", effect: { trust: 3, stress: 8, flags: { daniel_meeting_allowed: true }, relationship: { targetId: "daniel", delta: 15 } } },
  ] },
  { id: "owen-hayes", guestId: "owen", stage: "CONFLICT", title: "Hayes의 요구", description: "Hayes 대령이 탈영병 Owen을 넘기면 호텔을 보호하겠다고 제안합니다.", quote: "‘한 명을 지키다 서른 개 방을 잃을 셈인가?’", choices: [
    { id: "hide", label: "Owen을 호텔 안에 숨긴다", description: "군과 적대하지만 호텔의 자치와 난민들의 신뢰를 지킵니다.", effect: { trust: 15, reputations: { military: -12, refugee: 8, humanitarian: 6 }, flags: { military_resistance_started: true, owen_protected: true } } },
    { id: "surrender", label: "Owen을 군에 넘긴다", description: "군의 지원을 얻지만 호텔 공동체에 깊은 상처를 남깁니다.", effect: { trust: -25, reputations: { military: 15, refugee: -12, humanitarian: -15 }, flags: { military_influence_high: true, military_resistance_failed: true, owen_surrendered: true } } },
  ] },
  { id: "white-door", guestId: "white", stage: "CONFLICT", title: "잠기지 않은 문", description: "한 번도 열쇠를 준 적 없는 지하 문 앞에 Mr. White가 서 있습니다.", quote: "‘처음부터 이 방은 저를 기다리고 있었습니다.’", choices: [
    { id: "open", label: "문을 열게 둔다", description: "호텔 아래의 비밀과 아버지의 흔적에 가까워지지만 위협이 커집니다.", effect: { trust: 8, stress: 10, threat: 15, fatherStoryProgress: 10, flags: { mr_white_door: true, monster_origin_clue_2: true }, discoverTrait: "MonsterRelated" } },
    { id: "seal", label: "지하 문을 봉쇄한다", description: "당장의 안전을 택하고 Mr. White의 목적을 거부합니다.", effect: { trust: -10, hotelStats: { security: 5 }, flags: { white_door_sealed: true } } },
  ] },
];
