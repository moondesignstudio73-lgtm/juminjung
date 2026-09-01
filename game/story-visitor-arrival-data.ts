import type { EventFlags, StoryVisitorArrivalId } from "./types.ts";

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
};

export const STORY_VISITOR_ARRIVALS: readonly StoryVisitorArrivalDefinition[] = [SAMUEL_RESCUE_SURVIVOR_ARRIVAL];

export const getStoryVisitorArrivalDefinition = (id: StoryVisitorArrivalId): StoryVisitorArrivalDefinition =>
  STORY_VISITOR_ARRIVALS.find((definition) => definition.id === id)!;

const dueDay = (flags: EventFlags, definition: StoryVisitorArrivalDefinition) => {
  const value = Number(flags[definition.dueDayFlag] ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
};

export const getPendingStoryVisitorArrival = (flags: EventFlags, day: number): StoryVisitorArrivalDefinition | null =>
  STORY_VISITOR_ARRIVALS
    .filter((definition) => flags[definition.sourceFlag] === true && flags[definition.completedFlag] !== true && day >= dueDay(flags, definition))
    .sort((left, right) => right.priority - left.priority)[0] ?? null;
