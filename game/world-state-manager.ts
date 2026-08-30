import type { GameState, WorldState } from "./types.ts";

export function calculateWorldPressure(state: GameState): number {
  const scarcity = [state.resources.food, state.resources.water, state.resources.fuel].filter((value) => value < 5).length * 12;
  const storyPressure = Number(state.flags.monster_threat ?? 0) + Number(state.flags.faction_pressure ?? 0);
  const stabilization = Math.floor((state.hotelStats.security + state.hotelStats.hotelCondition) / 20);
  return Math.max(0, Math.floor(state.day / 4) + scarcity + storyPressure - stabilization);
}

export function determineWorldState(state: GameState): WorldState {
  const pressure = calculateWorldPressure(state);
  if (pressure >= 80) return "END_STAGE";
  if (pressure >= 55) return "CRITICAL";
  if (pressure >= 32) return "COLLAPSE";
  if (pressure >= 12) return "UNREST";
  return "STABLE";
}
