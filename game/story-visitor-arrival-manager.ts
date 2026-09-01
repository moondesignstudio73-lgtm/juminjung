import { getStoryVisitorArrivalDefinition, type StoryVisitorArrivalDefinition } from "./story-visitor-arrival-data.ts";
import type { EventFlags, Guest, StoryVisitorArrivalId } from "./types.ts";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function scheduleStoryVisitorArrival(flags: EventFlags, id: StoryVisitorArrivalId, currentDay: number, delayDays: number): EventFlags {
  const definition = getStoryVisitorArrivalDefinition(id);
  return {
    ...flags,
    [definition.dueDayFlag]: currentDay + Math.max(1, Math.round(delayDays)),
    [definition.completedFlag]: false,
    [definition.arrivedDayFlag]: 0,
  };
}

export function applyStoryVisitorArrival(guest: Guest, definition: StoryVisitorArrivalDefinition, day: number): Guest {
  if (guest.npcType !== "NORMAL" || !guest.generated || guest.status !== "WAITING") return guest;
  const originQuestion = guest.questions[0];
  return {
    ...guest,
    faction: "REFUGEE",
    description: `${guest.description} 사무엘 프라이스가 옛 검문선 명단을 따라 찾아내 JUJU HOTEL까지 호송했다.`,
    conditionLabel: `${definition.shortLabel} · ${guest.conditionLabel}`,
    introDialogue: "“사무엘 프라이스가 검문선 명단에서 제 이름을 찾았습니다. 그가 아니었다면 이 호텔 불빛까지 오지 못했을 겁니다.”",
    questions: [
      { ...originQuestion, label: "사무엘과 어떻게 만났습니까?", answer: "폐쇄된 검문소 지하에서 버티고 있었습니다. 사무엘이 명단의 이름을 하나씩 부르며 저를 찾아냈습니다." },
      ...guest.questions.slice(1),
    ],
    offeredItems: [
      { id: `${guest.id}-samuel-list`, type: "INFORMATION", name: definition.itemName, short: definition.itemShort, detail: definition.itemDetail },
      ...guest.offeredItems,
    ],
    trust: clamp(guest.trust + 8),
    riskLevel: clamp(guest.riskLevel - 5),
    storyFlags: {
      ...guest.storyFlags,
      story_visitor_arrival_id: definition.id,
      story_visitor_arrival_source: definition.sourceFlag,
      samuel_rescue_survivor: true,
      samuel_rescue_survivor_day: day,
    },
  };
}

export function completeStoryVisitorArrival(flags: EventFlags, definition: StoryVisitorArrivalDefinition, day: number): EventFlags {
  return { ...flags, [definition.completedFlag]: true, [definition.arrivedDayFlag]: day };
}

export function getStoryVisitorArrivalHistoryEvent(guest: Guest, day: number): string | null {
  const id = guest.storyFlags.story_visitor_arrival_id;
  if (id !== "samuel_rescue_survivor" || Number(guest.storyFlags.samuel_rescue_survivor_day) !== day) return null;
  const definition = getStoryVisitorArrivalDefinition(id);
  return `DAY ${day} · ${definition.historyLabel}`;
}
