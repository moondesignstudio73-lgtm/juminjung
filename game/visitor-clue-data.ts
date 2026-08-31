import type { Guest } from "./types.ts";

export type VisitorClueRule = {
  guestId:string;
  itemId?:string;
  unlocksQuestionId?:string;
  questionId:string;
  finding:string;
  revealsTrait:string;
  traitLabel:string;
  riskDelta:number;
};

export const VISITOR_CLUE_RULES:VisitorClueRule[] = [
  {guestId:"eleanor",itemId:"medical-id",unlocksQuestionId:"eleanor-triage",questionId:"eleanor-triage",finding:"신분증 케이스에 접어 둔 응급환자 분류 기록에는 ‘내 선택으로 죽었다’는 자필 문장과 지워진 환자 이름이 남아 있다.",revealsTrait:"TriageGuilt",traitLabel:"트리아지 죄책감",riskDelta:5},
  {guestId:"walter",itemId:"toolbox",unlocksQuestionId:"walter-father",questionId:"walter-father",finding:"공구함 안쪽에서 아버지의 필체로 적힌 지하 설비실 점검표가 나온다.",revealsTrait:"FatherOldFriend",traitLabel:"아버지의 옛 친구",riskDelta:-5},
  {guestId:"mia",itemId:"rabbit",unlocksQuestionId:"mia-name",questionId:"mia-name",finding:"토끼 인형 안감에 ‘M. ROSE CARTER’라는 이름표가 두 겹으로 꿰매져 있다.",revealsTrait:"InconsistentStory",traitLabel:"엇갈리는 증언",riskDelta:12},
  {guestId:"daniel",itemId:"photo",unlocksQuestionId:"daniel-middle-name",questionId:"daniel-middle-name",finding:"사진 뒷면에 ‘Mia Rose, 8번째 생일 · 2025년 4월 12일’이라는 이름과 날짜가 적혀 있다.",revealsTrait:"UnverifiedFamily",traitLabel:"검증되지 않은 가족",riskDelta:8},
  {guestId:"samuel",itemId:"badge",unlocksQuestionId:"samuel-blockade",questionId:"samuel-blockade",finding:"배지 홈에 서부 봉쇄선 통행표가 접혀 있고, 되돌려 보낸 가족들의 이름이 남아 있다.",revealsTrait:"AbandonedRefugees",traitLabel:"버려진 피난민",riskDelta:15},
  {guestId:"ruth",itemId:"bandage",unlocksQuestionId:"ruth-scratch",questionId:"ruth-scratch",finding:"사용한 붕대 안쪽에 사람 손톱보다 넓은 세 줄의 검은 자국이 스며 있다.",revealsTrait:"MonsterScratch",traitLabel:"괴물에게 긁힌 자국",riskDelta:20},
  {guestId:"jack",itemId:"crate",unlocksQuestionId:"jack-clients",questionId:"jack-clients",finding:"가짜 목록 아래에서 군과 빅터 케인 양쪽의 거래 암호가 발견된다.",revealsTrait:"DoubleDealer",traitLabel:"이중 거래상",riskDelta:15},
  {guestId:"grace",itemId:"scripture",unlocksQuestionId:"grace-dates",questionId:"grace-dates",finding:"경전에 적힌 날짜와 시간이 비밀 집회 기록과 일치하고, 여백에는 Grace의 서명 아래 신규 신도를 모으라는 지시가 적혀 있다.",revealsTrait:"CultLeader",traitLabel:"비밀 집회 지도자",riskDelta:18},
  {guestId:"owen",itemId:"rifle",unlocksQuestionId:"owen-order",questionId:"owen-order",finding:"분리된 격발핀 속에서 헤이스 부대 작전 번호와 ‘명령 불복종·탈영’이 적힌 군 수배표가 나온다.",revealsTrait:"Deserter",traitLabel:"군 탈영병",riskDelta:8},
  {guestId:"hayes",itemId:"orders",unlocksQuestionId:"hayes-authority",questionId:"hayes-authority",finding:"명령서의 호텔 접수 조항은 본문과 다른 타자기로 뒤늦게 덧붙여졌다.",revealsTrait:"HotelTakeover",traitLabel:"호텔 장악 계획",riskDelta:20},
  {guestId:"lily",itemId:"files",unlocksQuestionId:"lily-vale",questionId:"lily-vale",finding:"‘최초 발생지’라고 표시된 연구소 원본 문서에 베일의 서명과 아버지의 이동 경로가 같은 날짜로 기록돼 있다.",revealsTrait:"OriginDocuments",traitLabel:"괴물 기원 문서",riskDelta:-5},
  {guestId:"noah",itemId:"spices",unlocksQuestionId:"noah-flask",questionId:"noah-flask",finding:"여러 향신료 통에 증류주가 숨겨져 있고, 가방의 메모에는 손 떨림을 멈추기 위한 음주 시간과 양이 매일 기록돼 있다.",revealsTrait:"Alcoholic",traitLabel:"알코올 의존",riskDelta:10},
  {guestId:"victor",itemId:"valuables",unlocksQuestionId:"victor-contract",questionId:"victor-contract",finding:"귀금속 포장지는 벙커 좌석을 사람별로 매매한 계약서 조각이다.",revealsTrait:"BunkerMonopoly",traitLabel:"벙커 좌석 독점",riskDelta:12},
  {guestId:"rosa",itemId:"family-bag",unlocksQuestionId:"rosa-care",questionId:"rosa-care",finding:"가족 가방에는 체온표와 정량으로 소분한 아동용 수분 보충 분말이 들어 있다.",revealsTrait:"CareExperience",traitLabel:"간병 경험",riskDelta:-8},
  {guestId:"eli",itemId:"map",unlocksQuestionId:"eli-theft",questionId:"eli-theft",finding:"지도 여백에는 여러 피난처의 창고 열쇠 모양·교대 시간·훔친 물품 수량이 날짜별로 적혀 있다.",revealsTrait:"Thief",traitLabel:"상습 절도",riskDelta:15},
  {guestId:"vale",itemId:"sample",unlocksQuestionId:"vale-before",questionId:"vale-before",finding:"샘플 용기의 제조일은 공식적인 최초 괴물 출현보다 석 달 빠르다.",revealsTrait:"PreOutbreakResearch",traitLabel:"사태 이전 연구",riskDelta:10},
  {guestId:"hazel",itemId:"traps",unlocksQuestionId:"hazel-tracks",questionId:"hazel-tracks",finding:"덫 안쪽에는 두 발로 선 생물의 보폭 눈금과 함께 가족 세 명의 이름·실종 날짜가 칼끝으로 새겨져 있다.",revealsTrait:"FamilyLost",traitLabel:"잃어버린 가족",riskDelta:-3},
  {guestId:"thomas",itemId:"grid-key",unlocksQuestionId:"thomas-blackout",questionId:"thomas-blackout",finding:"제어 키 기록에는 중앙 차단 직후 Thomas가 병원과 호텔 구역을 긴급 우회해 연쇄 정전을 늦춘 과정이 남아 있다.",revealsTrait:"GridController",traitLabel:"전력망 제어 권한",riskDelta:-8},
  {guestId:"claire",itemId:"ultrasound",unlocksQuestionId:"claire-danger",questionId:"claire-danger",finding:"초음파 사진 보호 봉투에 적힌 좌표는 헤이스 부대 집결지와 일치하고, 안쪽에는 같은 군복을 입은 남편의 사진이 숨겨져 있다.",revealsTrait:"DangerousFather",traitLabel:"위험 세력과의 연결",riskDelta:15},
  {guestId:"white",questionId:"white-reflection",finding:"그의 모습은 로비 거울에도 비에 젖은 바닥에도 전혀 비치지 않는다.",revealsTrait:"NonHumanPossible",traitLabel:"비인간 가능성",riskDelta:30},
];

export function getVisitorClueRule(guestId:string, source:"ITEM"|"QUESTION", sourceId:string):VisitorClueRule|null {
  return VISITOR_CLUE_RULES.find((rule) => rule.guestId === guestId && (source === "ITEM" ? rule.itemId === sourceId : rule.questionId === sourceId)) ?? null;
}

export function getVisitorTraitLabel(guestId:string, trait:string):string {
  return VISITOR_CLUE_RULES.find((rule)=>rule.guestId===guestId&&rule.revealsTrait===trait)?.traitLabel ?? trait;
}

export function getAvailableVisitorQuestions(guest:Guest, inspectedItemIds:string[]):Guest["questions"] {
  return guest.questions.filter((question) => {
    const lock = VISITOR_CLUE_RULES.find((rule) => rule.guestId === guest.id && rule.unlocksQuestionId === question.id);
    return !lock?.itemId || inspectedItemIds.includes(lock.itemId);
  });
}

export function applyVisitorQuestionClue(guests:Guest[], guestId:string, questionId:string, inspectedItemIds:string[]=[]):{guests:Guest[];rule:VisitorClueRule|null;applied:boolean} {
  const rule = getVisitorClueRule(guestId,"QUESTION",questionId);
  if (!rule) return {guests,rule:null,applied:false};
  if (rule.itemId && !inspectedItemIds.includes(rule.itemId)) return {guests,rule,applied:false};
  let applied = false;
  const updated = guests.map((guest) => {
    if (guest.id !== guestId || guest.discoveredTraits.includes(rule.revealsTrait) || !guest.hiddenTraits.includes(rule.revealsTrait)) return guest;
    applied = true;
    return {...guest,discoveredTraits:[...guest.discoveredTraits,rule.revealsTrait],riskLevel:Math.max(0,Math.min(100,guest.riskLevel+rule.riskDelta))};
  });
  return {guests:updated,rule,applied};
}
