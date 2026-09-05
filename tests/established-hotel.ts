import { createInitialGameState } from '../game/save-manager.ts';
import { createRooms } from '../game/room-manager.ts';
import type { GameState } from '../game/types.ts';
// Existing simulation scenarios exercise a fully restored hotel, not the new-game economy.
export function createEstablishedHotel(): GameState {
  const initial = createInitialGameState();
  return {
    ...initial,
    // Aura tests isolate room effects from the rank economy. Individual upkeep
    // balance is covered by npc-upkeep.test.ts.
    guests: initial.guests.map((guest) => ({
      ...guest,
      community: {
        job: 'RESIDENT',
        traits: [],
        consumption: { food: 1, water: 1 },
        upkeepVersion: 2 as const,
        repairsCompleted: 0,
      },
    })),
    rooms: createRooms({ restored: true }),
  };
}
