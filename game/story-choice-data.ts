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
  { id: "eleanor-standard", guestId: "eleanor", stage: "RESOLUTION", title: "호텔의 진료 원칙", description: "Eleanor는 임시 진료실을 계속 운영하려면 호텔이 누구를, 어디까지 치료할지 정해야 한다고 말합니다.", quote: "‘원칙이 없으면 약보다 먼저 사람이 바닥나요.’", choices: [
    { id: "clinic", label: "상설 진료 구역을 만든다", description: "의약품 3을 투입해 JUJU HOTEL을 피난민도 치료하는 의료 거점으로 만듭니다.", requiredResources: { medicine: 3 }, effect: { resources: { medicine: -3 }, trust: 10, reputations: { community: 8, humanitarian: 8 }, flags: { eleanor_clinic_established: true, medical_network_active: true } } },
    { id: "mobile", label: "순회 진료만 허용한다", description: "비축분을 지키면서 Eleanor가 필요한 방만 찾아가도록 합니다.", effect: { trust: 5, reputations: { refugee: 5 }, flags: { eleanor_mobile_medic: true } } },
  ] },
  { id: "walter-key", guestId: "walter", stage: "RESOLUTION", title: "아버지가 남긴 열쇠", description: "Walter가 낡은 황동 열쇠를 내밉니다. 호텔 지하의 봉인된 기록실에 맞는 열쇠입니다.", quote: "‘네 아버지는 진실을 숨긴 게 아니라, 견딜 사람을 기다린 거다.’", choices: [
    { id: "use_key", label: "지금 기록실을 연다", description: "아버지의 비밀과 괴물의 기원에 다가가지만 호텔의 잠든 위협도 깨웁니다.", effect: { fatherStoryProgress: 30, threat: 8, flags: { father_secret_discovered: true, monster_origin_clue_1: true, basement_key_used: true } } },
    { id: "hide_key", label: "열쇠를 숨겨 둔다", description: "당장의 안전을 위해 기록실을 봉인하고 때를 기다립니다.", effect: { fatherStoryProgress: 10, hotelStats: { security: 4 }, flags: { basement_key_hidden: true } } },
  ] },
  { id: "mia-family", guestId: "mia", stage: "RESOLUTION", title: "가족이 되는 방법", description: "확인된 기억과 상처 앞에서 Mia와 Daniel의 관계를 어떻게 이어 갈지 결정해야 합니다.", quote: "‘가족이면… 무서워도 같이 있어야 하는 거야?’", choices: [
    { id: "reunite", label: "두 사람의 재회를 돕는다", description: "감시 아래 함께 지낼 길을 열고 흩어진 가족들의 이동로를 공유합니다.", effect: { trust: 5, stress: -10, flags: { family_routes_complete: true, mia_reunited: true }, relationship: { targetId: "daniel", delta: 25 } } },
    { id: "stay", label: "Mia를 호텔 공동체에 남긴다", description: "혈연보다 아이가 선택한 안전을 우선합니다.", effect: { trust: 12, reputations: { community: 8, humanitarian: 5 }, flags: { mia_stays_at_hotel: true, vulnerable_survivors_protected: true } } },
  ] },
  { id: "owen-future", guestId: "owen", stage: "RESOLUTION", title: "군의 포위망", description: "Hayes의 병력이 호텔로 접근합니다. Owen은 싸울지, 떠날지 결정할 준비가 되었습니다.", quote: "‘이번에는 명령이 아니라 내가 지킬 곳을 고르겠습니다.’", choices: [
    { id: "resistance", label: "호텔 방어대를 조직한다", description: "군의 영향력에 맞서 호텔의 자치권을 지킵니다.", effect: { trust: 10, hotelStats: { security: 8 }, reputations: { military: -10, refugee: 8 }, flags: { military_resistance_succeeded: true, hotel_defense_force: true } } },
    { id: "escape", label: "Owen의 탈출을 돕는다", description: "정면 충돌을 피하고 Owen을 안전한 길로 내보냅니다.", effect: { threat: -5, reputations: { humanitarian: 4 }, flags: { owen_escaped: true } } },
  ] },
  { id: "white-answer", guestId: "white", stage: "RESOLUTION", title: "문 너머의 대답", description: "지하에서 들려오는 목소리가 호텔의 주인에게 마지막 질문을 던집니다.", quote: "‘괴물을 들이는 것과 사람을 내쫓는 것, 어느 쪽이 더 인간답습니까?’", choices: [
    { id: "yes", label: "문 너머의 존재를 받아들인다", description: "Mr. White와 호텔의 비밀을 끝까지 마주하고 위험한 공존을 선택합니다.", effect: { trust: 8, fatherStoryProgress: 20, threat: 20, flags: { the_door_answer_yes: true, mr_white_door: true }, discoverTrait: "NonHumanPossible" } },
    { id: "no", label: "문을 닫고 그를 추방한다", description: "진실보다 생존을 택해 지하와 Mr. White를 호텔에서 끊어 냅니다.", effect: { trust: -15, threat: -10, hotelStats: { security: 8 }, flags: { the_door_answer_no: true, white_banished: true } } },
  ] },
];
