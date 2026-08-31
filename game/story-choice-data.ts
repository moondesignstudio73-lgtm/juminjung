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
  { id: "lily-redactions", guestId: "lily", stage: "CONFLICT", title: "검게 칠한 문장", description: "Lily의 문서에는 괴물 최초 출현지와 아버지의 이동 경로가 같은 검은 잉크 아래 숨겨져 있습니다.", quote: "‘누군가 재난이 시작되기 전부터 이 문서를 지우고 있었어요.’", choices: [
    { id: "decode", label: "밤새 원본을 복원한다", description: "문서의 층을 벗겨 최초 출현 기록을 해독하지만 추적자에게 흔적을 남깁니다.", effect: { trust: 10, stress: 8, threat: 6, fatherStoryProgress: 10, flags: { lily_documents_decoded: true, father_route_in_documents: true }, discoverTrait: "OriginDocuments" } },
    { id: "copy", label: "사본을 만들고 원본을 숨긴다", description: "즉시 해독하지 않고 증거를 여러 곳에 나누어 보존합니다.", effect: { trust: 5, hotelStats: { security: 3 }, flags: { lily_documents_secured: true } } },
  ] },
  { id: "vale-sample", guestId: "vale", stage: "CONFLICT", title: "살아 있는 세포", description: "밀봉된 조직 샘플이 인간의 목소리에 반응합니다. Vale는 연구를 계속할 허가를 요구합니다.", quote: "‘이건 병원체가 아닙니다. 우리를 관찰하고 있어요.’", choices: [
    { id: "stabilize", label: "의약품으로 샘플을 안정화한다", description: "의약품 2를 사용해 연구 가능한 상태로 보존합니다.", requiredResources: { medicine: 2 }, effect: { resources: { medicine: -2 }, trust: 10, threat: 8, flags: { vale_sample_stabilized: true }, discoverTrait: "PreOutbreakResearch" } },
    { id: "quarantine", label: "지하 금고에 격리한다", description: "연구 속도보다 호텔의 안전을 우선합니다.", effect: { trust: -4, hotelStats: { security: 5 }, flags: { vale_sample_quarantined: true } } },
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
    { id: "resistance", label: "호텔 방어대를 조직한다", description: "호텔의 자치권을 지키고 대규모 공성 때 로비 방어 비용과 선두 부상을 줄이는 주민 방위대를 조직합니다.", effect: { trust: 10, hotelStats: { security: 8 }, reputations: { military: -10, refugee: 8 }, flags: { military_resistance_succeeded: true, hotel_defense_force: true, owen_siege_plan: true } } },
    { id: "escape", label: "Owen의 탈출을 돕는다", description: "정면 충돌을 피하고 Owen을 안전한 길로 내보냅니다.", effect: { threat: -5, reputations: { humanitarian: 4 }, flags: { owen_escaped: true } } },
  ] },
  { id: "white-answer", guestId: "white", stage: "RESOLUTION", title: "문 너머의 대답", description: "지하에서 들려오는 목소리가 호텔의 주인에게 마지막 질문을 던집니다.", quote: "‘괴물을 들이는 것과 사람을 내쫓는 것, 어느 쪽이 더 인간답습니까?’", choices: [
    { id: "yes", label: "문 너머의 존재를 받아들인다", description: "Mr. White와 호텔의 비밀을 끝까지 마주하고 위험한 공존을 선택합니다.", effect: { trust: 8, fatherStoryProgress: 20, threat: 20, flags: { the_door_answer_yes: true, mr_white_door: true }, discoverTrait: "NonHumanPossible" } },
    { id: "no", label: "문을 닫고 그를 추방한다", description: "진실보다 생존을 택해 지하와 Mr. White를 호텔에서 끊어 냅니다.", effect: { trust: -15, threat: -10, hotelStats: { security: 8 }, flags: { the_door_answer_no: true, white_banished: true } } },
  ] },
  { id: "lily-truth", guestId: "lily", stage: "RESOLUTION", title: "누가 진실을 소유하는가", description: "복원된 기록을 세상에 공개할지, 호텔 안에서 다음 단서를 기다릴지 결정해야 합니다.", quote: "‘진실은 사람을 구할 수도 있고, 마지막 피난처를 불태울 수도 있어요.’", choices: [
    { id: "broadcast", label: "라디오로 해독 결과를 공개한다", description: "직접 복원한 문서를 모두가 검증할 수 있게 공개하지만 호텔의 위치도 드러납니다.", requiredFlags: { lily_documents_decoded: true }, effect: { trust: 12, threat: 12, reputations: { community: 6, humanitarian: 5 }, flags: { lily_documents_decoded: true, lily_truth_broadcast: true }, discoverTrait: "OriginDocuments" } },
    { id: "archive", label: "암호화해 호텔 금고에 보관한다", description: "기록을 해독하고 보존하되 최종 진실이 모일 때까지 공개를 미룹니다.", effect: { trust: 5, hotelStats: { security: 4 }, flags: { lily_documents_decoded: true, lily_truth_archived: true }, discoverTrait: "OriginDocuments" } },
  ] },
  { id: "vale-research", guestId: "vale", stage: "RESOLUTION", title: "괴물의 이름", description: "Vale의 연구는 괴물이 감염체가 아니라 인간의 기억을 모방하는 별개의 생명이라는 결론에 도달합니다.", quote: "‘이 결과를 완성하면, 우리도 이전의 인간으로 돌아갈 수 없습니다.’", choices: [
    { id: "complete", label: "연구를 완성하고 Lily와 공유한다", description: "괴물 기원 증거와 반복 이동로를 공유해 THE TRUTH 경로를 열고 매일 밤 Monster Threat를 2 낮춥니다.", requiredFlags: { vale_sample_stabilized: true }, effect: { trust: 12, fatherStoryProgress: 10, flags: { vale_research_complete: true, lily_vale_research_shared: true }, relationship: { targetId: "lily", delta: 25 }, discoverTrait: "PreOutbreakResearch" } },
    { id: "destroy", label: "연구와 샘플을 소각한다", description: "호텔의 안전을 위해 연구를 포기하고 위협을 낮춥니다.", effect: { trust: -10, threat: -12, reputations: { humanitarian: 4 }, flags: { vale_research_destroyed: true } } },
  ] },
  { id: "daniel-proof", guestId: "daniel", stage: "CONFLICT", title: "찢긴 가족사진", description: "Daniel이 내민 사진은 Mia의 것과 닮았지만 날짜 부분이 뜯겨 있습니다.", quote: "‘저 아이가 날 기억하지 못해도, 내가 찾는 걸 멈출 순 없습니다.’", choices: [
    { id: "verify", label: "Mia의 기억과 대조한다", description: "두 사람의 증언을 따로 확인해 조작된 부분을 찾아냅니다.", effect: { trust: 8, stress: 4, flags: { daniel_identity_checked: true }, relationship: { targetId: "mia", delta: 15 }, discoverTrait: "UnverifiedFamily" } },
    { id: "accept_claim", label: "Daniel의 주장을 믿는다", description: "빠르게 가족으로 인정하지만 Mia의 불안을 감수합니다.", effect: { trust: 5, stress: 8, flags: { daniel_claim_accepted: true }, relationship: { targetId: "mia", delta: -10 } } },
  ] },
  { id: "daniel-family", guestId: "daniel", stage: "RESOLUTION", title: "기억보다 안전한 곳", description: "Daniel은 Mia가 자신과 떠날지 호텔에 남을지 직접 선택하게 해 달라고 요청합니다.", quote: "‘아버지라는 말보다 저 아이의 대답을 먼저 듣겠습니다.’", choices: [
    { id: "let_choose", label: "Mia에게 선택권을 준다", description: "혈연보다 아이의 의사를 우선하는 가족 원칙을 세웁니다.", effect: { trust: 12, stress: -8, reputations: { community: 6, humanitarian: 7 }, flags: { daniel_respects_mia: true, family_routes_complete: true }, relationship: { targetId: "mia", delta: 25 } } },
    { id: "escort", label: "함께 안전지대로 보낸다", description: "보급품을 나누어 두 사람의 동행을 지원합니다.", requiredResources: { food: 2 }, effect: { resources: { food: -2 }, trust: 8, reputations: { refugee: 6 }, flags: { carter_family_departed: true }, relationship: { targetId: "mia", delta: 20 } } },
  ] },
  { id: "samuel-ledger", guestId: "samuel", stage: "CONFLICT", title: "봉쇄선의 명단", description: "Samuel의 수첩에는 그가 검문소 밖에 남겨 둔 피난민들의 이름이 적혀 있습니다.", quote: "‘명령을 지켰고, 사람을 버렸습니다. 둘 다 사실입니다.’", choices: [
    { id: "confess", label: "공동체 앞에서 증언하게 한다", description: "진실을 공개하고 버려진 피난민을 찾을 단서를 얻습니다.", effect: { trust: 8, stress: 10, reputations: { community: 5, military: -5 }, flags: { samuel_confessed: true, refugee_list_found: true }, discoverTrait: "AbandonedRefugees" } },
    { id: "seal_record", label: "명단을 보안 기록으로 봉인한다", description: "당장의 동요를 막는 대신 Samuel의 과거를 비밀로 둡니다.", effect: { trust: 4, hotelStats: { security: 4 }, reputations: { military: 3 }, flags: { samuel_record_sealed: true } } },
  ] },
  { id: "samuel-duty", guestId: "samuel", stage: "RESOLUTION", title: "다시 세운 검문선", description: "Samuel은 이번에는 명령이 아니라 호텔 사람들을 위해 입구를 지키겠다고 합니다.", quote: "‘문을 닫는 사람이 아니라, 누가 들어오는지 책임지는 사람이 되겠습니다.’", choices: [
    { id: "watch", label: "민간 경비대를 맡긴다", description: "호텔의 규칙 아래 Samuel에게 방어 책임을 맡깁니다.", effect: { trust: 10, hotelStats: { security: 8 }, reputations: { community: 5 }, flags: { samuel_civil_guard: true, hotel_defense_force: true }, relationship: { targetId: "owen", delta: 15 } } },
    { id: "search", label: "명단의 생존자를 찾게 한다", description: "Samuel을 구조대로 보내 과거의 빚을 갚게 합니다.", effect: { trust: 7, threat: 4, reputations: { refugee: 8, humanitarian: 5 }, flags: { samuel_rescue_patrol: true }, relationship: { targetId: "owen", delta: 10 } } },
  ] },
  { id: "ruth-scratch", guestId: "ruth", stage: "CONFLICT", title: "붕대 아래의 긁힌 자국", description: "Ruth의 상처가 괴물에게서 생겼다는 사실이 드러나자 복도에 공포가 번집니다.", quote: "‘감염인지 아닌지, 격리하기 전에 제가 끝까지 기록할게요.’", choices: [
    { id: "care", label: "의료 격리실에서 치료한다", description: "약품을 사용해 Ruth를 관찰하며 공포보다 의료 원칙을 우선합니다.", requiredResources: { medicine: 2 }, effect: { resources: { medicine: -2 }, trust: 14, health: 12, reputations: { humanitarian: 8, community: 4 }, flags: { ruth_treated: true, scratch_observation_started: true }, relationship: { targetId: "eleanor", delta: 20 }, discoverTrait: "MonsterScratch" } },
    { id: "lock", label: "외부 창고에 격리한다", description: "호텔 내부의 불안을 낮추지만 Ruth를 차가운 창고에 홀로 둡니다.", effect: { trust: -15, stress: 12, hotelStats: { security: 5 }, reputations: { humanitarian: -8 }, flags: { ruth_isolated: true }, relationship: { targetId: "eleanor", delta: -15 }, discoverTrait: "MonsterScratch" } },
  ] },
  { id: "ruth-home", guestId: "ruth", stage: "RESOLUTION", title: "병실이 아닌 집", description: "상처가 감염이 아님이 밝혀진 뒤 Ruth는 호텔에 남아 돌봄 체계를 만들겠다고 합니다.", quote: "‘살아남은 사람에게 필요한 건 침대만이 아니라, 다시 돌아올 자리예요.’", choices: [
    { id: "care_team", label: "공동 돌봄팀을 만든다", description: "Ruth와 Eleanor가 아이와 부상자를 함께 돌보는 생활망을 세웁니다.", effect: { trust: 15, stress: -10, reputations: { community: 9, humanitarian: 8 }, flags: { ruth_care_team: true, vulnerable_survivors_protected: true }, relationship: { targetId: "eleanor", delta: 20 } } },
    { id: "field_nurse", label: "순회 간호대를 맡긴다", description: "호텔 밖 생존자까지 치료하는 작은 의료망을 엽니다.", effect: { trust: 8, threat: 5, reputations: { refugee: 8, humanitarian: 6 }, flags: { ruth_field_nurse: true, medical_network_active: true }, relationship: { targetId: "eleanor", delta: 12 } } },
  ] },
  { id: "jack-double-deal", guestId: "jack", stage: "CONFLICT", title: "두 장의 거래 장부", description: "Jack이 호텔의 연료 정보를 Victor와 약탈자 양쪽에 팔고 있었다는 사실이 드러납니다.", quote: "‘세상이 무너졌다고 거래까지 정직해진 건 아니잖아.’", choices: [
    { id: "expose", label: "장부를 공개하고 거래망을 압수한다", description: "Jack의 신뢰를 잃지만 호텔의 보급로를 공동 관리로 돌립니다.", effect: { trust: -12, hotelStats: { security: 5 }, reputations: { community: 6 }, flags: { jack_deal_exposed: true }, relationship: { targetId: "victor", delta: -20 }, discoverTrait: "DoubleDealer" } },
    { id: "use_network", label: "비밀 거래망을 역으로 이용한다", description: "위험을 감수하고 Jack을 호텔의 정보원으로 둡니다.", effect: { trust: 10, resources: { fuel: 2 }, threat: 8, reputations: { merchant: 8 }, flags: { jack_network_controlled: true }, relationship: { targetId: "victor", delta: 10 }, discoverTrait: "DoubleDealer" } },
  ] },
  { id: "jack-market", guestId: "jack", stage: "RESOLUTION", title: "폐허의 시장", description: "Jack은 호텔을 중립 시장으로 만들면 모든 물자가 이곳을 거치게 할 수 있다고 제안합니다.", quote: "‘왕관은 필요 없어. 문을 여닫는 사람이 가격을 정하니까.’", choices: [
    { id: "fair_market", label: "공정 거래소를 연다", description: "가격과 배급량을 공개해 공동체가 감시하는 시장을 만듭니다.", effect: { trust: 10, resources: { food: 2, medicine: 1 }, reputations: { merchant: 8, community: 8 }, flags: { jack_fair_market: true, trade_network_active: true, jack_monopoly: false, ruin_market_controlled: false }, relationship: { targetId: "victor", delta: -10 } } },
    { id: "monopoly", label: "독점 거래권을 허가한다", description: "Jack과 Victor의 물자망으로 호텔의 지배력을 키웁니다.", effect: { trust: 5, resources: { food: 4, fuel: 2 }, reputations: { merchant: 12, community: -8 }, flags: { jack_monopoly: true, ruin_market_controlled: true, jack_fair_market: false, trade_network_active: false }, relationship: { targetId: "victor", delta: 25 } } },
  ] },
  { id: "grace-sermon", guestId: "grace", stage: "CONFLICT", title: "촛불 아래의 계시", description: "Grace가 괴물의 출현을 심판이라 부르며 불안한 투숙객들을 자신에게 모읍니다.", quote: "‘두려움에 이름을 붙이면 사람들은 그 이름을 따릅니다.’", choices: [
    { id: "open_debate", label: "공개 토론을 연다", description: "Grace와 Vale의 주장을 모두 검증하게 해 맹목적 추종을 막습니다.", effect: { trust: 5, stress: -4, reputations: { community: 6 }, flags: { grace_claims_challenged: true }, relationship: { targetId: "vale", delta: 15 }, discoverTrait: "CultLeader" } },
    { id: "permit_ritual", label: "질서 유지를 위해 집회를 허용한다", description: "공포는 가라앉지만 Grace의 영향력이 빠르게 커집니다.", effect: { trust: 12, stress: -8, reputations: { community: -4 }, flags: { grace_congregation: true }, relationship: { targetId: "vale", delta: -20 }, discoverTrait: "CultLeader" } },
  ] },
  { id: "grace-faith", guestId: "grace", stage: "RESOLUTION", title: "믿음의 문턱", description: "Grace는 호텔 규칙에 따를지 자신을 따르는 사람들과 떠날지 결정하려 합니다.", quote: "‘구원은 명령이 아니라 선택이어야 한다는 걸 이제 압니다.’", choices: [
    { id: "mutual_aid", label: "신도들을 구호조로 편입한다", description: "신앙을 개인의 것으로 두고 노동과 돌봄은 공동 규칙으로 묶습니다.", effect: { trust: 10, hotelStats: { hotelCondition: 8 }, reputations: { community: 8, humanitarian: 4 }, flags: { grace_mutual_aid: true } } },
    { id: "pilgrimage", label: "원하는 사람들의 출발을 허용한다", description: "강제로 붙잡지 않고 식량을 나누어 안전한 길을 알려 줍니다.", requiredResources: { food: 2 }, effect: { resources: { food: -2 }, trust: 6, threat: -3, reputations: { refugee: 5 }, flags: { grace_pilgrimage: true } } },
  ] },
  { id: "hayes-ultimatum", guestId: "hayes", stage: "CONFLICT", title: "호텔 접수 명령", description: "Hayes가 무장 병력을 로비에 세우고 객실 명단과 통제권을 요구합니다.", quote: "‘민간 규칙은 여기까지다. 이제 생존은 지휘 체계의 문제다.’", choices: [
    { id: "resist", label: "호텔의 자치권을 선언한다", description: "군의 보급을 포기하고 주민들과 바리케이드를 지킵니다.", effect: { trust: -12, hotelStats: { security: 8 }, threat: 8, reputations: { military: -15, refugee: 10 }, flags: { military_resistance_started: true, hayes_refused: true }, relationship: { targetId: "owen", delta: 20 }, discoverTrait: "HotelTakeover" } },
    { id: "cooperate", label: "제한적 통제권을 넘긴다", description: "당장의 보호를 받는 대신 군이 호텔 운영에 깊이 들어옵니다.", effect: { trust: 10, resources: { security: 2 }, hotelStats: { security: 10 }, reputations: { military: 15, refugee: -10 }, flags: { military_influence_high: true, hayes_command_post: true }, relationship: { targetId: "owen", delta: -25 }, discoverTrait: "HotelTakeover" } },
  ] },
  { id: "hayes-command", guestId: "hayes", stage: "RESOLUTION", title: "누가 호텔을 지키는가", description: "Hayes는 최종 명령권을 요구합니다. 서명하면 JUJU HOTEL은 군의 거점이 됩니다.", quote: "‘보호받고 싶다면 누군가는 명령해야 한다.’", choices: [
    { id: "civilian_rule", label: "민간 협의체에 복종시킨다", description: "Hayes의 병력도 호텔 규칙 아래 두고 자치 방위대를 완성합니다.", effect: { trust: -8, hotelStats: { security: 10 }, reputations: { military: -8, community: 8 }, flags: { military_resistance_succeeded: true, military_resistance_failed: false, military_rule_signed: false, civilian_command: true }, relationship: { targetId: "owen", delta: 20 } } },
    { id: "sign_command", label: "군 지휘권에 서명한다", description: "강력한 방어를 얻지만 호텔의 최종 결정권을 넘기며 군정 점령 경로를 엽니다.", effect: { trust: 12, resources: { security: 3 }, hotelStats: { security: 15 }, reputations: { military: 18, community: -12 }, flags: { military_influence_high: true, military_rule_signed: true, military_resistance_failed: true, military_resistance_succeeded: false, civilian_command: false }, relationship: { targetId: "owen", delta: -30 } } },
  ] },
  { id: "noah-cellar", guestId: "noah", stage: "CONFLICT", title: "비어 가는 저장고", description: "사라진 술과 식량이 Noah의 침대 아래에서 발견됩니다. 그는 손을 떨며 부엌 열쇠를 돌려줍니다.", quote: "‘취하려던 게 아니라, 오늘 밤을 기억하지 않으려 했어요.’", choices: [
    { id: "rehabilitate", label: "배급 감독 아래 부엌을 맡긴다", description: "Noah에게 책임과 회복의 기회를 함께 줍니다.", effect: { trust: 12, stress: 5, resources: { food: 1 }, reputations: { community: 5 }, flags: { noah_recovery_started: true }, discoverTrait: "Alcoholic" } },
    { id: "dismiss", label: "부엌에서 내보내고 물자를 압수한다", description: "즉시 식량을 회수하지만 Noah의 상태는 악화됩니다.", effect: { trust: -15, stress: 12, resources: { food: 3 }, flags: { noah_removed_from_kitchen: true }, discoverTrait: "Alcoholic" } },
  ] },
  { id: "noah-table", guestId: "noah", stage: "RESOLUTION", title: "다시 차린 저녁", description: "Noah가 남은 재료로 모두가 함께 먹을 수 있는 저녁을 준비합니다.", quote: "‘한 끼가 내일을 보장하진 않아도, 우리가 사람이라는 건 기억시켜 줍니다.’", choices: [
    { id: "community_kitchen", label: "공동 식당을 연다", description: "배급을 공개하고 누구도 홀로 굶지 않는 식탁을 만듭니다.", requiredFlags: { noah_recovery_started: true }, effect: { trust: 15, hotelStats: { hotelCondition: 10 }, reputations: { community: 9, humanitarian: 5 }, flags: { noah_community_kitchen: true } } },
    { id: "ration_lab", label: "장기 보존식 연구를 맡긴다", description: "맛보다 생존 기간을 우선해 식량 효율을 높입니다.", effect: { trust: 8, resources: { food: 4 }, hotelStats: { foodSustainability: 3 }, flags: { noah_ration_system: true } } },
  ] },
  { id: "victor-contract", guestId: "victor", stage: "CONFLICT", title: "지하 벙커 계약서", description: "Victor는 제한된 벙커 좌석을 호텔 물자와 교환하자며 선택받을 사람의 명단을 내밉니다.", quote: "‘모두를 구한다는 말은 결국 아무도 구하지 못한다는 뜻입니다.’", choices: [
    { id: "seize", label: "좌표를 공개 자산으로 압수한다", description: "벙커 정보를 공동체에 공개하고 독점 계약을 무효로 합니다.", effect: { trust: -15, reputations: { community: 10, merchant: -8 }, flags: { victor_bunker_public: true }, relationship: { targetId: "rosa", delta: 25 }, discoverTrait: "BunkerMonopoly" } },
    { id: "invest", label: "호텔 몫의 좌석을 매입한다", description: "연료를 대가로 비밀 좌석과 Victor의 사업망을 확보합니다.", requiredResources: { fuel: 2 }, effect: { resources: { fuel: -2 }, trust: 10, reputations: { merchant: 10, community: -8 }, flags: { victor_bunker_deal: true }, relationship: { targetId: "rosa", delta: -20 }, discoverTrait: "BunkerMonopoly" } },
  ] },
  { id: "victor-crown", guestId: "victor", stage: "RESOLUTION", title: "폐허의 왕좌", description: "Victor는 Jack의 시장과 벙커망을 합쳐 호텔이 지역 물자를 지배할 수 있다고 주장합니다.", quote: "‘도덕은 풍족할 때의 화폐죠. 지금 필요한 건 소유권입니다.’", choices: [
    { id: "public_trust", label: "벙커를 공동 신탁으로 전환한다", description: "좌석과 물자를 공개 장부로 관리해 Victor의 독점을 끝내고 피난민 분산 수용 비용과 위험을 낮춥니다.", effect: { trust: -8, reputations: { community: 12, humanitarian: 6 }, flags: { victor_public_trust: true, bunker_network_open: true, victor_monopoly_alliance: false, ruin_market_controlled: false }, relationship: { targetId: "rosa", delta: 25 } } },
    { id: "rule_market", label: "Victor와 독점 연합을 맺는다", description: "호텔이 벙커와 시장의 가격을 통제하는 지배 세력이 됩니다.", effect: { trust: 12, resources: { food: 3, medicine: 2, fuel: 2 }, reputations: { merchant: 15, community: -15 }, flags: { victor_monopoly_alliance: true, ruin_market_controlled: true, victor_public_trust: false, bunker_network_open: false }, relationship: { targetId: "rosa", delta: -30 } } },
  ] },
  { id: "rosa-ration", guestId: "rosa", stage: "CONFLICT", title: "아이들의 몫", description: "식량이 부족한 밤, Rosa가 자신의 배급표를 찢어 아이들과 부상자에게 나눠 줍니다.", quote: "‘규칙이 약한 사람부터 굶기면 그건 규칙이 아니라 포기예요.’", choices: [
    { id: "priority", label: "취약 생존자 우선 배급을 채택한다", description: "식량을 더 쓰지만 아이와 환자의 생존을 공동 원칙으로 만듭니다.", requiredResources: { food: 2 }, effect: { resources: { food: -2 }, trust: 15, reputations: { community: 8, humanitarian: 8 }, flags: { rosa_priority_rations: true, vulnerable_survivors_protected: true }, relationship: { targetId: "victor", delta: -20 } } },
    { id: "equal", label: "모두에게 같은 양을 배급한다", description: "계산 가능한 질서를 지키지만 Rosa는 그 공정함에 의문을 품습니다.", effect: { trust: -5, hotelStats: { hotelCondition: -3 }, reputations: { community: 3 }, flags: { equal_rations_enforced: true }, relationship: { targetId: "victor", delta: 10 } } },
  ] },
  { id: "rosa-family", guestId: "rosa", stage: "RESOLUTION", title: "호텔의 가족", description: "Rosa는 혈연이 없는 아이와 노인까지 함께 돌볼 생활조를 제안합니다.", quote: "‘집은 벽이 아니라, 누가 아플 때 곁에 남는 사람들이에요.’", choices: [
    { id: "household", label: "공동 생활조를 정식 운영한다", description: "객실을 작은 가족 단위로 묶어 돌봄과 배급을 함께 책임집니다.", effect: { trust: 15, hotelStats: { hotelCondition: 10 }, reputations: { community: 10, humanitarian: 6 }, flags: { rosa_household_network: true, vulnerable_survivors_protected: true }, relationship: { targetId: "victor", delta: -15 } } },
    { id: "family_room", label: "가족 전용 안전 구역을 만든다", description: "Rosa에게 보호 구역 운영을 맡겨 호텔에 정착 기반을 만듭니다.", effect: { trust: 10, hotelStats: { security: 5, hotelCondition: 6 }, reputations: { refugee: 7 }, flags: { rosa_family_zone: true }, relationship: { targetId: "victor", delta: -10 } } },
  ] },
  { id: "eli-theft", guestId: "eli", stage: "CONFLICT", title: "사라진 황동 열쇠", description: "Eli의 소매에서 객실 열쇠와 다른 투숙객의 탄약이 쏟아집니다.", quote: "‘훔친 게 아니라, 필요할 때 아무도 주지 않을 걸 빌린 거야.’", choices: [
    { id: "restitution", label: "돌려주고 피해를 갚게 한다", description: "추방 대신 공개적인 배상과 창고 일을 명령합니다.", effect: { trust: 8, stress: 5, resources: { security: 1 }, reputations: { community: 5 }, flags: { eli_restitution: true }, discoverTrait: "Thief" } },
    { id: "recruit", label: "정찰 기술을 조건부로 이용한다", description: "훔친 물건을 돌려받고 Eli를 위험한 외부 정찰에 투입합니다.", effect: { trust: 12, resources: { security: 2 }, threat: 4, flags: { eli_scout_recruited: true }, discoverTrait: "Thief" } },
  ] },
  { id: "eli-keyring", guestId: "eli", stage: "RESOLUTION", title: "맡겨진 열쇠고리", description: "Eli는 처음으로 훔치지 않은 열쇠를 맡아 보고 싶다고 말합니다.", quote: "‘믿는다는 건 감시하지 않는 게 아니라, 돌아올 자리를 남기는 거지?’", choices: [
    { id: "quartermaster", label: "창고 보조 책임을 맡긴다", description: "이중 장부와 정기 점검 아래 Eli에게 물자 관리 책임을 줍니다.", effect: { trust: 15, resources: { food: 2 }, hotelStats: { security: 3 }, reputations: { community: 5 }, flags: { eli_quartermaster: true } } },
    { id: "pathfinder", label: "호텔의 길잡이로 임명한다", description: "Eli가 찾아낸 통로를 피난민 구조와 보급에 사용합니다.", effect: { trust: 10, threat: -5, reputations: { refugee: 7 }, flags: { eli_pathfinder: true, safe_routes_mapped: true } } },
  ] },
  { id: "hazel-hunt", guestId: "hazel", stage: "CONFLICT", title: "창밖의 표적", description: "Hazel은 가족을 죽인 것과 같은 흔적을 발견하고 Mr. White를 미끼로 쓰자고 요구합니다.", quote: "‘저게 사람이면 돌아올 거고, 괴물이면 끝낼 수 있어.’", choices: [
    { id: "track", label: "흔적만 추적하게 한다", description: "사냥보다 증거 수집을 우선해 괴물의 이동로를 찾아냅니다.", effect: { trust: 8, threat: -5, hotelStats: { security: 5 }, flags: { monster_routes_mapped: true }, relationship: { targetId: "white", delta: 10 }, discoverTrait: "FamilyLost" } },
    { id: "bait", label: "위험한 미끼 작전을 허용한다", description: "괴물 한 마리를 쓰러뜨리지만 White와의 갈등과 외부 위협이 커집니다.", requiredResources: { security: 1 }, effect: { trust: 12, threat: 8, resources: { security: -1 }, reputations: { military: 5 }, flags: { hazel_bait_hunt: true }, relationship: { targetId: "white", delta: -25 }, discoverTrait: "FamilyLost" } },
  ] },
  { id: "hazel-watch", guestId: "hazel", stage: "RESOLUTION", title: "밤을 보는 사람", description: "복수의 흔적을 좇던 Hazel은 Vale가 분석한 이동 패턴으로 호텔의 야간 경계를 맡겠다고 합니다.", quote: "‘죽은 사람만 보며 걸었는데, 이제 지켜야 할 불빛이 생겼군.’", choices: [
    { id: "ranger", label: "외곽 경계대를 조직한다", description: "Vale의 분석과 괴물 이동로를 결합해 호텔 주변에 조기 경보망을 구축합니다.", effect: { trust: 12, threat: -8, hotelStats: { security: 10 }, flags: { hazel_ranger_watch: true, perimeter_alarm: true }, relationship: { targetId: "vale", delta: 10 } } },
    { id: "vengeance", label: "복수 원정을 지원한다", description: "탄약을 내어 Hazel의 마지막 사냥을 돕습니다.", requiredResources: { security: 2 }, effect: { resources: { security: -2 }, trust: 8, threat: -12, flags: { hazel_vengeance_complete: true }, relationship: { targetId: "white", delta: -15 } } },
  ] },
  { id: "thomas-blackout", guestId: "thomas", stage: "CONFLICT", title: "발전기의 마지막 회로", description: "과부하가 시작되자 Thomas는 객실 조명과 외곽 방벽 중 하나만 살릴 수 있다고 말합니다.", quote: "‘어둠은 불편하지만, 멈춘 방벽은 사람을 죽입니다.’", choices: [
    { id: "fortify", label: "방벽 전력을 유지한다", description: "연료를 투입해 방어 설비를 살리고 객실은 밤새 어둠에 둡니다.", requiredResources: { fuel: 2 }, effect: { resources: { fuel: -2 }, trust: 8, stress: 8, hotelStats: { security: 10 }, flags: { thomas_grid_fortified: true }, discoverTrait: "GridController" } },
    { id: "lights", label: "생활 구역의 불을 지킨다", description: "사람들의 공포를 낮추지만 외곽 방어가 약해집니다.", effect: { trust: 6, threat: 5, hotelStats: { hotelCondition: 10, security: -5 }, flags: { thomas_living_grid: true }, discoverTrait: "GridController" } },
  ] },
  { id: "thomas-grid", guestId: "thomas", stage: "RESOLUTION", title: "호텔의 전력망", description: "Thomas는 호텔을 독립 전력 거점으로 만들 설계도를 완성합니다.", quote: "‘전기가 흐르면 라디오도, 진료실도, 사람들의 계획도 다시 움직입니다.’", choices: [
    { id: "microgrid", label: "독립 마이크로그리드를 구축한다", description: "연료를 투자해 진료실과 방어 시설에 안정적으로 전력을 공급합니다.", requiredResources: { fuel: 3 }, effect: { resources: { fuel: -3 }, trust: 12, hotelStats: { security: 8, hotelCondition: 8 }, flags: { thomas_microgrid: true, generator_network_stable: true } } },
    { id: "signal", label: "라디오 중계망을 우선한다", description: "외부 생존자와 시설의 위치를 잇는 통신 전력망을 엽니다.", effect: { trust: 10, threat: 5, reputations: { community: 7, refugee: 5 }, flags: { thomas_radio_grid: true, safe_routes_mapped: true } } },
  ] },
  { id: "claire-pursuer", guestId: "claire", stage: "CONFLICT", title: "문밖의 남편", description: "Claire가 피해 온 남자가 자신이 아이의 아버지라며 호텔 문을 두드립니다.", quote: "‘가족이라는 말이 그 사람에게 다시 문을 열 권리를 주진 않아요.’", choices: [
    { id: "protect_claire", label: "Claire의 증언을 믿고 숨긴다", description: "호텔의 경계를 강화하고 Claire가 스스로 안전을 선택하게 합니다.", effect: { trust: 15, stress: -10, hotelStats: { security: 6 }, reputations: { humanitarian: 8 }, flags: { claire_protected: true, vulnerable_survivors_protected: true }, discoverTrait: "DangerousFather" } },
    { id: "question_both", label: "무장 해제 후 양쪽을 심문한다", description: "사실을 더 확인하지만 Claire는 자신의 공포가 의심받았다고 느낍니다.", effect: { trust: -6, stress: 10, reputations: { community: 3 }, flags: { claire_pursuer_interrogated: true }, discoverTrait: "DangerousFather" } },
  ] },
  { id: "claire-future", guestId: "claire", stage: "RESOLUTION", title: "태어날 아이의 방", description: "Claire는 아이가 태어난 뒤에도 이 호텔을 집이라 부를 수 있는지 묻습니다.", quote: "‘살아남는 것 말고도 이 아이에게 약속할 게 있을까요?’", choices: [
    { id: "nursery", label: "안전한 육아실을 마련한다", description: "Rosa와 Eleanor의 돌봄망에 Claire의 가족을 연결합니다.", effect: { trust: 15, hotelStats: { hotelCondition: 10 }, reputations: { community: 9, humanitarian: 7 }, flags: { claire_nursery: true, vulnerable_survivors_protected: true } } },
    { id: "safe_passage", label: "의료 거점으로 이동을 돕는다", description: "약품과 호위 경로를 내어 더 안전한 출산 장소로 보냅니다.", requiredResources: { medicine: 2 }, effect: { resources: { medicine: -2 }, trust: 10, reputations: { refugee: 7, humanitarian: 5 }, flags: { claire_safe_passage: true, safe_routes_mapped: true } } },
  ] },
];
