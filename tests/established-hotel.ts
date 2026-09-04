import { createInitialGameState } from '../game/save-manager.ts';
import { createRooms } from '../game/room-manager.ts';
// Existing simulation scenarios exercise a fully restored hotel, not the new-game economy.
export function createEstablishedHotel() {
  return {
    ...createInitialGameState(),
    rooms: createRooms({ restored: true }),
  };
}
