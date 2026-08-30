import { ENDING_CONDITIONS } from "./ending-data.ts";
import { ENDING_NARRATIVES } from "./ending-narrative-data.ts";
import type { EndingCondition, EndingId, EndingStatus, GameState } from "./types.ts";

function entriesMeet(actual: Record<string, boolean | number>, required: Record<string, boolean | number> = {}, mode: "min" | "max" | "equal" = "equal") {
  return Object.entries(required).every(([key, value]) => mode === "min" ? Number(actual[key] ?? 0) >= Number(value) : mode === "max" ? Number(actual[key] ?? 0) <= Number(value) : actual[key] === value);
}

export function meetsEndingCondition(state: GameState, condition: EndingCondition): boolean {
  if (condition.requiredFlags && !Object.entries(condition.requiredFlags).every(([key, value]) => state.flags[key] === value || state.endingRelatedFlags[key] === value)) return false;
  if (condition.forbiddenFlags?.some((key) => Boolean(state.flags[key]) || Boolean(state.endingRelatedFlags[key]))) return false;
  if (condition.minimumStats && !entriesMeet(state.hotelStats, condition.minimumStats, "min")) return false;
  if (condition.maximumStats && !entriesMeet(state.hotelStats, condition.maximumStats, "max")) return false;
  if (condition.requiredFacilities?.some((id) => !state.facilities[id])) return false;
  if (condition.requiredReputation && !entriesMeet(state.reputations, condition.requiredReputation, "min")) return false;
  if (condition.maximumReputation && !entriesMeet(state.reputations, condition.maximumReputation, "max")) return false;
  if (condition.requiredWorldState && !condition.requiredWorldState.includes(state.worldState)) return false;
  if (condition.requiredStoryProgress?.some((id) => !state.guests.some((guest) => guest.eventChain.some((event) => event.id === id && event.completed)))) return false;
  if (condition.requiredNPCStates?.some((requirement) => {
    const guest = state.guests.find((item) => item.id === requirement.id);
    return !guest || (requirement.alive !== undefined && guest.alive !== requirement.alive) || (requirement.minimumTrust !== undefined && guest.trust < requirement.minimumTrust) || (requirement.completedStory && guest.eventChain.some((event) => !event.completed));
  })) return false;
  if (condition.requiredRelationships?.some((requirement) => {
    const source = state.guests.find((guest) => guest.id === requirement.sourceId);
    const relation = source?.relationships.find((item) => item.targetId === requirement.targetId);
    return !relation || relation.value < requirement.minimumValue;
  })) return false;
  return true;
}

export function evaluateEndings(state: GameState): { available: EndingId[]; progress: Partial<Record<EndingId, EndingStatus>> } {
  const newlyAvailable = ENDING_CONDITIONS.filter((ending) => meetsEndingCondition(state, ending)).map((ending) => ending.endingId);
  const available = [...new Set([...state.availableEndings, ...newlyAvailable])].filter((id) => !state.completedEndingFlags.includes(id));
  const progress = Object.fromEntries(ENDING_CONDITIONS.map((ending) => [ending.endingId, state.completedEndingFlags.includes(ending.endingId) ? "COMPLETED" : available.includes(ending.endingId) ? "AVAILABLE" : ending.hidden ? "UNKNOWN" : "IN_PROGRESS"]));
  return { available, progress };
}

export function getEndingCondition(id: EndingId) { return ENDING_CONDITIONS.find((ending) => ending.endingId === id); }
export function getEndingNarrative(id: EndingId) { return ENDING_NARRATIVES.find((ending) => ending.endingId === id); }

export function startEnding(state: GameState, endingId: EndingId): GameState {
  if (!state.availableEndings.includes(endingId) || state.completedEndingFlags.includes(endingId)) throw new Error(`시작할 수 없는 엔딩입니다: ${endingId}`);
  if (!getEndingNarrative(endingId)) throw new Error(`엔딩 장면을 찾을 수 없습니다: ${endingId}`);
  return { ...state, activeEndingId: endingId, endingSceneIndex: 0, phase: "ending" };
}

export function leaveEnding(state: GameState): GameState {
  return { ...state, activeEndingId: null, endingSceneIndex: 0, phase: "report" };
}

export function advanceEnding(state: GameState): GameState {
  if (!state.activeEndingId) throw new Error("진행 중인 엔딩이 없습니다.");
  const narrative = getEndingNarrative(state.activeEndingId);
  if (!narrative) throw new Error(`엔딩 장면을 찾을 수 없습니다: ${state.activeEndingId}`);
  const index = Math.max(0, Math.min(state.endingSceneIndex, narrative.scenes.length - 1));
  if (index < narrative.scenes.length - 1) return { ...state, endingSceneIndex: index + 1 };
  const endingId = state.activeEndingId;
  const condition = getEndingCondition(endingId);
  return {
    ...state,
    completedEndingFlags: [...new Set([...state.completedEndingFlags, endingId])],
    availableEndings: state.availableEndings.filter((id) => id !== endingId),
    endingProgress: { ...state.endingProgress, [endingId]: "COMPLETED" },
    activeEndingId: null,
    endingSceneIndex: 0,
    phase: "report",
    eventHistory: [...state.eventHistory, { day: state.day, type: "EVENT", message: `엔딩 완료 · ${condition?.name ?? endingId}` }],
  };
}
