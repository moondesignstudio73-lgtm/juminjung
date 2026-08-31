import { CUTSCENES } from "./cutscene-data.ts";
import type { CutsceneId, GameState } from "./types.ts";

export function queueNightEventCutscene(state: GameState, eventId: string): GameState {
  if (state.activeCutsceneId) return state;
  const cutscene = CUTSCENES.find((candidate) => candidate.triggerEventId === eventId && !state.seenCutsceneIds.includes(candidate.id));
  return cutscene ? { ...state, activeCutsceneId: cutscene.id } : state;
}

export function dismissCutscene(state: GameState): GameState {
  if (!state.activeCutsceneId) return state;
  const seenCutsceneIds = [...new Set([...state.seenCutsceneIds, state.activeCutsceneId])] as CutsceneId[];
  return { ...state, activeCutsceneId: null, seenCutsceneIds };
}
