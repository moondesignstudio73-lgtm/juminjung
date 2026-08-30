import { completeEventStage } from "./story-event-manager.ts";
import { STORY_CHOICE_EVENTS } from "./story-choice-data.ts";
import type { GameState, HotelLogEntry, StoryChoice, StoryChoiceEvent } from "./types.ts";

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const canAfford = (state: GameState, choice: StoryChoice) => !choice.requiredResources || Object.entries(choice.requiredResources).every(([key, value]) => state.resources[key as keyof GameState["resources"]] >= Number(value));
const add = <T extends Record<string, number>>(current: T, changes: Partial<T> | undefined): T => !changes ? current : Object.fromEntries(Object.entries(current).map(([key, value]) => [key, clamp(value + Number(changes[key] ?? 0))])) as T;

export function getPendingStoryChoice(state: GameState): StoryChoiceEvent | null {
  return STORY_CHOICE_EVENTS.find((event) => {
    const guest = state.guests.find((item) => item.id === event.guestId);
    const stageRecord = guest?.eventChain.find((item) => item.stage === event.stage);
    const conflictCompleted = guest?.eventChain.find((item) => item.stage === "CONFLICT")?.completed ?? false;
    const timingReady = event.stage === "CONFLICT"
      ? Boolean(guest && guest.remainingNights <= Math.max(1, guest.stayDuration - 1))
      : Boolean(guest && guest.remainingNights <= 1 && conflictCompleted);
    return Boolean(guest && guest.status === "STAYING" && timingReady && stageRecord && !stageRecord.completed);
  }) ?? null;
}

export function canChooseStoryChoice(state: GameState, choice: StoryChoice): boolean { return canAfford(state, choice); }

export function applyStoryChoice(state: GameState, eventId: string, choiceId: string): { state: GameState; event: StoryChoiceEvent; choice: StoryChoice; entry: HotelLogEntry } {
  const pending = getPendingStoryChoice(state);
  const event = pending;
  if (!event) throw new Error("진행 가능한 NPC 스토리 사건이 없습니다.");
  if (event.id !== eventId) throw new Error("현재 진행 중인 NPC 스토리 사건과 일치하지 않습니다.");
  const requested = event.choices.find((choice) => choice.id === choiceId);
  if (!requested) throw new Error("선택할 수 없는 NPC 스토리 응답입니다.");
  if (!canAfford(state, requested)) throw new Error("이 선택에 필요한 자원이 부족합니다.");
  const choice = requested;
  const effect = choice.effect;
  const guests = state.guests.map((guest) => {
    if (guest.id !== event.guestId) return guest;
    return { ...guest, trust: clamp(guest.trust + Number(effect.trust ?? 0)), stress: clamp(guest.stress + Number(effect.stress ?? 0)), health: clamp(guest.health + Number(effect.health ?? 0)), discoveredTraits: effect.discoverTrait ? [...new Set([...guest.discoveredTraits, effect.discoverTrait])] : guest.discoveredTraits, relationships: effect.relationship ? guest.relationships.map((relation) => relation.targetId === effect.relationship!.targetId ? { ...relation, value: relation.value + effect.relationship!.delta } : relation) : guest.relationships, storyFlags: { ...guest.storyFlags, [`choice_${event.stage.toLowerCase()}`]: choice.id } };
  });
  const completed = completeEventStage(guests, event.guestId, event.stage);
  const resources = add(state.resources, effect.resources);
  const entry: HotelLogEntry = { day: state.day, type: "EVENT", message: `NPC 사건 · ${event.title} · ${choice.label}` };
  const next: GameState = { ...state, guests: completed.guests, resources, hotelStats: add(state.hotelStats, effect.hotelStats), reputations: add(state.reputations, effect.reputations), flags: { ...state.flags, ...effect.flags, monster_threat: clamp(Number(state.flags.monster_threat ?? 0) + Number(effect.threat ?? 0)) }, fatherStoryProgress: clamp(state.fatherStoryProgress + Number(effect.fatherStoryProgress ?? 0)), pendingStoryEventId: null, eventHistory: [...state.eventHistory, entry] };
  return { state: next, event, choice, entry };
}
