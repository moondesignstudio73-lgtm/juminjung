import { CUTSCENES } from "./cutscene-data.ts";
import type { CutsceneId, GameState } from "./types.ts";

const activateOrQueue = (state: GameState, cutsceneId: CutsceneId | undefined): GameState => {
  if (!cutsceneId || state.seenCutsceneIds.includes(cutsceneId) || state.activeCutsceneId === cutsceneId || state.queuedCutsceneIds.includes(cutsceneId)) return state;
  return state.activeCutsceneId
    ? { ...state, queuedCutsceneIds: [...state.queuedCutsceneIds, cutsceneId] }
    : { ...state, activeCutsceneId: cutsceneId };
};

export function queueNightEventCutscene(state: GameState, eventId: string, choiceId: string, completedDay: number): GameState {
  const specificity = (candidate: (typeof CUTSCENES)[number]) => Number(candidate.triggerEventId !== undefined) + Number(candidate.triggerChoiceId !== undefined);
  const cutscene = [...CUTSCENES].sort((a, b) => specificity(b) - specificity(a) || b.priority - a.priority || a.id.localeCompare(b.id)).find((candidate) => (candidate.triggerEventId === undefined || candidate.triggerEventId === eventId)
    && (candidate.triggerChoiceId === undefined || candidate.triggerChoiceId === choiceId)
    && candidate.triggerStoryEventId === undefined
    && candidate.triggerStoryChoiceId === undefined
    && !state.seenCutsceneIds.includes(candidate.id)
    && (candidate.minimumCompletedDay === undefined || completedDay >= candidate.minimumCompletedDay)
    && (candidate.maximumCompletedDay === undefined || completedDay <= candidate.maximumCompletedDay));
  return activateOrQueue(state, cutscene?.id);
}

export function queueStoryChoiceCutscene(state: GameState, eventId: string, choiceId: string): GameState {
  const cutscene = [...CUTSCENES]
    .filter((candidate) => candidate.triggerStoryEventId === eventId
      && candidate.triggerStoryChoiceId === choiceId
      && candidate.triggerEventId === undefined
      && candidate.triggerChoiceId === undefined
      && !state.seenCutsceneIds.includes(candidate.id))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))[0];
  return activateOrQueue(state, cutscene?.id);
}

export function dismissCutscene(state: GameState): GameState {
  if (!state.activeCutsceneId) return state;
  const seenCutsceneIds = [...new Set([...state.seenCutsceneIds, state.activeCutsceneId])] as CutsceneId[];
  const queuedCutsceneIds = state.queuedCutsceneIds.filter((id) => !seenCutsceneIds.includes(id));
  return { ...state, activeCutsceneId: queuedCutsceneIds[0] ?? null, queuedCutsceneIds: queuedCutsceneIds.slice(1), seenCutsceneIds };
}
