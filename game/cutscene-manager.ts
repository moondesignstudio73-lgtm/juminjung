import { CUTSCENES } from "./cutscene-data.ts";
import type { CutsceneId, GameState } from "./types.ts";

export function queueNightEventCutscene(state: GameState, eventId: string, choiceId: string, completedDay: number): GameState {
  if (state.activeCutsceneId) return state;
  const specificity = (candidate: (typeof CUTSCENES)[number]) => Number(candidate.triggerEventId !== undefined) + Number(candidate.triggerChoiceId !== undefined);
  const cutscene = [...CUTSCENES].sort((a, b) => specificity(b) - specificity(a) || b.priority - a.priority || a.id.localeCompare(b.id)).find((candidate) => (candidate.triggerEventId === undefined || candidate.triggerEventId === eventId)
    && (candidate.triggerChoiceId === undefined || candidate.triggerChoiceId === choiceId)
    && !state.seenCutsceneIds.includes(candidate.id)
    && (candidate.minimumCompletedDay === undefined || completedDay >= candidate.minimumCompletedDay)
    && (candidate.maximumCompletedDay === undefined || completedDay <= candidate.maximumCompletedDay));
  return cutscene ? { ...state, activeCutsceneId: cutscene.id } : state;
}

export function dismissCutscene(state: GameState): GameState {
  if (!state.activeCutsceneId) return state;
  const seenCutsceneIds = [...new Set([...state.seenCutsceneIds, state.activeCutsceneId])] as CutsceneId[];
  return { ...state, activeCutsceneId: null, seenCutsceneIds };
}
