import { findStoryVisitorArrivalDefinition, getStoryVisitorArrivalDefinition, type StoryVisitorArrivalDefinition } from "./story-visitor-arrival-data.ts";
import type { EventFlags, Guest, StoryVisitorArrivalId } from "./types.ts";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function scheduleStoryVisitorArrival(flags: EventFlags, id: StoryVisitorArrivalId, currentDay: number, delayDays: number): EventFlags {
  const definition = getStoryVisitorArrivalDefinition(id);
  if (flags[definition.completedFlag] === true) return flags;
  const requestedDueDay = currentDay + Math.max(1, Math.round(delayDays));
  const existingDueDay = Number(flags[definition.dueDayFlag] ?? 0);
  const dueDay = Number.isFinite(existingDueDay) && existingDueDay > 0 ? Math.min(existingDueDay, requestedDueDay) : requestedDueDay;
  return {
    ...flags,
    [definition.dueDayFlag]: dueDay,
    [definition.completedFlag]: false,
    [definition.arrivedDayFlag]: 0,
  };
}

export function applyStoryVisitorArrival(guest: Guest, definition: StoryVisitorArrivalDefinition, day: number): Guest {
  if (guest.npcType !== "NORMAL" || !guest.generated || guest.status !== "WAITING") return guest;
  const originQuestion = guest.questions[0];
  return {
    ...guest,
    faction: definition.faction,
    description: `${guest.description} ${definition.descriptionSuffix}`,
    conditionLabel: `${definition.shortLabel} · ${guest.conditionLabel}`,
    introDialogue: definition.introDialogue,
    questions: [
      { ...originQuestion, label: definition.questionLabel, answer: definition.questionAnswer },
      ...guest.questions.slice(1),
    ],
    offeredItems: [
      { id: `${guest.id}-${definition.id}-item`, type: "INFORMATION", name: definition.itemName, short: definition.itemShort, detail: definition.itemDetail },
      ...guest.offeredItems,
    ],
    trust: clamp(guest.trust + definition.trustDelta),
    riskLevel: clamp(guest.riskLevel + definition.riskDelta),
    storyFlags: {
      ...guest.storyFlags,
      story_visitor_arrival_id: definition.id,
      story_visitor_arrival_source: definition.sourceFlag,
      [definition.guestFlag]: true,
      [definition.guestDayFlag]: day,
    },
  };
}

export function completeStoryVisitorArrival(flags: EventFlags, definition: StoryVisitorArrivalDefinition, day: number): EventFlags {
  return { ...flags, [definition.completedFlag]: true, [definition.arrivedDayFlag]: day };
}

export function getStoryVisitorArrivalHistoryEvent(guest: Guest, day: number): string | null {
  const id = guest.storyFlags.story_visitor_arrival_id;
  const definition = findStoryVisitorArrivalDefinition(id);
  if (!definition || Number(guest.storyFlags[definition.guestDayFlag]) !== day) return null;
  return `DAY ${day} · ${definition.historyLabel}`;
}
