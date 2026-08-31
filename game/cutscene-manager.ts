import { CUTSCENES } from "./cutscene-data.ts";
import type { CutsceneId, GameState } from "./types.ts";

export function queueNightEventCutscene(state: GameState, eventId: string, completedDay: number): GameState {
  if (state.activeCutsceneId) return state;
  const cutscene = [...CUTSCENES].sort((a, b) => b.priority - a.priority).find((candidate) => (candidate.triggerEventId === undefined || candidate.triggerEventId === eventId)
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
