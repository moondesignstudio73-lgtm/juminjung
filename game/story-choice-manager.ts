import { completeEventStage } from "./story-event-manager.ts";
import { STORY_CHOICE_EVENTS } from "./story-choice-data.ts";
import type { GameState, HotelLogEntry, StoryChoice, StoryChoiceEvent } from "./types.ts";

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const canAfford = (state: GameState, choice: StoryChoice) => !choice.requiredResources || Object.entries(choice.requiredResources).every(([key, value]) => state.resources[key as keyof GameState["resources"]] >= Number(value));
const add = <T extends Record<string, number>>(current: T, changes: Partial<T> | undefined): T => !changes ? current : Object.fromEntries(Object.entries(current).map(([key, value]) => [key, clamp(value + Number(changes[key] ?? 0))])) as T;

export function getPendingStoryChoice(state: GameState): StoryChoiceEvent | null {
  return STORY_CHOICE_EVENTS.find((event) => {
    const guest = state.guests.find((item) => item.id === event.guestId);
    const conflict = guest?.eventChain.find((item) => item.stage === event.stage);
    return Boolean(guest && guest.status === "STAYING" && guest.remainingNights <= Math.max(1, guest.stayDuration - 1) && conflict && !conflict.completed);
  }) ?? null;
}

export function canChooseStoryChoice(state: GameState, choice: StoryChoice): boolean { return canAfford(state, choice); }

export function applyStoryChoice(state: GameState, _eventId: string, choiceId: string): { state: GameState; event: StoryChoiceEvent; choice: StoryChoice; entry: HotelLogEntry } {
  const pending = getPendingStoryChoice(state);
  const event = pending;
  if (!event) throw new Error("진행 가능한 NPC 스토리 사건이 없습니다.");
  const requested = event.choices.find((choice) => choice.id === choiceId);
  const choice = requested && canAfford(state, requested) ? requested : event.choices.find((item) => canAfford(state, item)) ?? event.choices[0];
  const effect = choice.effect;
  const guests = state.guests.map((guest) => {
    if (guest.id !== event.guestId) return guest;
    return { ...guest, trust: clamp(guest.trust + Number(effect.trust ?? 0)), stress: clamp(guest.stress + Number(effect.stress ?? 0)), health: clamp(guest.health + Number(effect.health ?? 0)), discoveredTraits: effect.discoverTrait ? [...new Set([...guest.discoveredTraits, effect.discoverTrait])] : guest.discoveredTraits, relationships: effect.relationship ? guest.relationships.map((relation) => relation.targetId === effect.relationship!.targetId ? { ...relation, value: relation.value + effect.relationship!.delta } : relation) : guest.relationships, storyFlags: { ...guest.storyFlags, choice_conflict: choice.id } };
  });
  const completed = completeEventStage(guests, event.guestId, "CONFLICT");
  const resources = add(state.resources, effect.resources);
  const entry: HotelLogEntry = { day: state.day, type: "EVENT", message: `NPC 사건 · ${event.title} · ${choice.label}` };
  const next: GameState = { ...state, guests: completed.guests, resources, hotelStats: add(state.hotelStats, effect.hotelStats), reputations: add(state.reputations, effect.reputations), flags: { ...state.flags, ...effect.flags, monster_threat: clamp(Number(state.flags.monster_threat ?? 0) + Number(effect.threat ?? 0)) }, fatherStoryProgress: clamp(state.fatherStoryProgress + Number(effect.fatherStoryProgress ?? 0)), pendingStoryEventId: null, eventHistory: [...state.eventHistory, entry] };
  return { state: next, event, choice, entry };
}
