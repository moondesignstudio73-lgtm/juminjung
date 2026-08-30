import type { ActiveRelationship, Guest, Room } from "./types.ts";

export function getRelationshipDistanceMultiplier(rooms: Room[], source: Guest, target: Guest): 1 | 1.5 | 2 {
  if (source.currentRoomNumber === null || target.currentRoomNumber === null) return 1;
  const a = rooms.find((room) => room.roomNumber === source.currentRoomNumber);
  const b = rooms.find((room) => room.roomNumber === target.currentRoomNumber);
  if (!a || !b) return 1;
  const adjacent = Math.max(Math.abs(a.position.x - b.position.x), Math.abs(a.position.y - b.position.y)) <= 1;
  if (adjacent) return 2;
  return a.floor === b.floor ? 1.5 : 1;
}

export function getActiveRelationships(rooms: Room[], guests: Guest[]): ActiveRelationship[] {
  const staying = new Map(guests.filter((guest) => guest.status === "STAYING").map((guest) => [guest.id, guest]));
  return [...staying.values()].flatMap((source) => source.relationships.flatMap((relation) => {
    const target = staying.get(relation.targetId);
    if (!target) return [];
    const distanceMultiplier = getRelationshipDistanceMultiplier(rooms, source, target);
    return [{ sourceId: source.id, targetId: target.id, type: relation.type, value: relation.value, distanceMultiplier, weightedValue: relation.value * distanceMultiplier }];
  }));
}
