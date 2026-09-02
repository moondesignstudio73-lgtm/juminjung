import type { EventFlags, Guest, StoryVisitorArrivalId } from "./types.ts";

export type StoryVisitorArrivalDefinition = {
  id: StoryVisitorArrivalId;
  priority: number;
  sourceFlag: string;
  dueDayFlag: string;
  completedFlag: string;
  arrivedDayFlag: string;
  shortLabel: string;
  journalLabel: string;
  historyLabel: string;
  itemName: string;
  itemShort: string;
  itemDetail: string;
  faction: Guest["faction"];
  descriptionSuffix: string;
  introDialogue: string;
  questionLabel: string;
  questionAnswer: string;
  guestFlag: string;
  guestDayFlag: string;
  trustDelta: number;
  riskDelta: number;
};

export const SAMUEL_RESCUE_SURVIVOR_ARRIVAL: StoryVisitorArrivalDefinition = {
  id: "samuel_rescue_survivor",
  priority: 100,
  sourceFlag: "samuel_rescue_patrol",
  dueDayFlag: "samuel_rescue_survivor_due_day",
  completedFlag: "samuel_rescue_survivor_arrived",
  arrivedDayFlag: "samuel_rescue_survivor_arrived_day",
  shortLabel: "사무엘 구조대 동행",
  journalLabel: "사무엘 구조대 · 검문선 명단 생존자 도착",
  historyLabel: "사무엘 구조대가 검문선 명단에서 구조",
  itemName: "찢긴 검문선 명단",
  itemShort: "사무엘이 회수한 명단과 같은 종이 조각.",
  itemDetail: "빗물에 번진 이름 옆에 오래된 검문소 번호와 JUJU HOTEL까지 이어진 귀환 경로가 표시되어 있다.",
  faction: "REFUGEE",
  descriptionSuffix: "사무엘 프라이스가 옛 검문선 명단을 따라 찾아내 JUJU HOTEL까지 호송했다.",
  introDialogue: "“사무엘 프라이스가 검문선 명단에서 제 이름을 찾았습니다. 그가 아니었다면 이 호텔 불빛까지 오지 못했을 겁니다.”",
  questionLabel: "사무엘과 어떻게 만났습니까?",
  questionAnswer: "폐쇄된 검문소 지하에서 버티고 있었습니다. 사무엘이 명단의 이름을 하나씩 부르며 저를 찾아냈습니다.",
  guestFlag: "samuel_rescue_survivor",
  guestDayFlag: "samuel_rescue_survivor_day",
  trustDelta: 8,
  riskDelta: -5,
};

export const FAMILY_ROUTE_SURVIVOR_ARRIVAL: StoryVisitorArrivalDefinition = {
  id: "family_route_survivor",
  priority: 90,
  sourceFlag: "family_routes_complete",
  dueDayFlag: "family_route_survivor_due_day",
  completedFlag: "family_route_survivor_arrived",
  arrivedDayFlag: "family_route_survivor_arrived_day",
  shortLabel: "가족 이동로 안내",
  journalLabel: "가족 이동로 · 실종 가족을 찾는 생존자 도착",
  historyLabel: "미아와 다니엘의 가족 이동로를 따라 도착",
  itemName: "겹쳐 그린 가족 이동 지도",
  itemShort: "미아와 다니엘의 표식이 겹친 접이식 지도.",
  itemDetail: "아이 눈높이의 토끼 표식과 성인의 검문소 좌표가 같은 길 위에 겹쳐 있다. JUJU HOTEL을 거쳐 흩어진 가족들의 목격지를 잇는다.",
  faction: "REFUGEE",
  descriptionSuffix: "미아 카터와 다니엘 카터가 공유한 가족 이동로를 따라 실종된 가족을 찾으러 JUJU HOTEL에 왔다.",
  introDialogue: "“미아와 다니엘이 남긴 표식을 따라왔습니다. 제 가족도 이 길 어딘가를 지나갔다면, 호텔 장부에 흔적이 있을 겁니다.”",
  questionLabel: "누구를 찾고 있습니까?",
  questionAnswer: "무너진 대피소에서 헤어진 가족입니다. 토끼 표식과 검문소 번호가 함께 있는 길만 따라오라고 들었습니다.",
  guestFlag: "family_route_survivor",
  guestDayFlag: "family_route_survivor_day",
  trustDelta: 6,
  riskDelta: -3,
};

export const STORY_VISITOR_ARRIVALS: readonly StoryVisitorArrivalDefinition[] = [SAMUEL_RESCUE_SURVIVOR_ARRIVAL, FAMILY_ROUTE_SURVIVOR_ARRIVAL];

export const getStoryVisitorArrivalDefinition = (id: StoryVisitorArrivalId): StoryVisitorArrivalDefinition =>
  STORY_VISITOR_ARRIVALS.find((definition) => definition.id === id)!;

export const findStoryVisitorArrivalDefinition = (id: unknown): StoryVisitorArrivalDefinition | undefined =>
  typeof id === "string" ? STORY_VISITOR_ARRIVALS.find((definition) => definition.id === id) : undefined;

const dueDay = (flags: EventFlags, definition: StoryVisitorArrivalDefinition) => {
  const value = Number(flags[definition.dueDayFlag] ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
};

export const getPendingStoryVisitorArrival = (flags: EventFlags, day: number): StoryVisitorArrivalDefinition | null =>
  STORY_VISITOR_ARRIVALS
    .filter((definition) => flags[definition.sourceFlag] === true && flags[definition.completedFlag] !== true && day >= dueDay(flags, definition))
    .sort((left, right) => right.priority - left.priority)[0] ?? null;
