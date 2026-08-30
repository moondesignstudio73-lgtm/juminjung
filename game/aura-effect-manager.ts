import type { DiseaseType, Guest, Room, RoomEffect } from "./types.ts";

function gridDistance(a: Room["position"], b: Room["position"], kind: "CHEBYSHEV" | "MANHATTAN") {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return kind === "CHEBYSHEV" ? Math.max(dx, dy) : dx + dy;
}

export function getAffectedRoomNumbers(rooms: Room[], guest: Guest): number[] {
  if (!guest.aura || guest.currentRoomNumber === null) return [];
  const source = rooms.find((room) => room.roomNumber === guest.currentRoomNumber);
  if (!source) return [];
  return rooms
    .filter((room) => gridDistance(source.position, room.position, guest.aura!.distance) <= guest.aura!.radius)
    .map((room) => room.roomNumber);
}

export function recalculateRoomEffects(rooms: Room[], guests: Guest[]): Room[] {
  const clean = rooms.map((room) => ({ ...room, temporaryEffects: [] as RoomEffect[] }));
  return guests.reduce((current, guest) => {
    if (!guest.aura) return current;
    const affected = new Set(getAffectedRoomNumbers(current, guest));
    return current.map((room) => affected.has(room.roomNumber)
      ? { ...room, temporaryEffects: [...room.temporaryEffects, {
          id: guest.aura!.id,
          sourceGuestId: guest.id,
          name: guest.aura!.name,
          metric: guest.aura!.metric,
          diseaseType: guest.aura!.diseaseType,
          operation: guest.aura!.operation,
          value: guest.aura!.value,
        }] }
      : room);
  }, clean);
}

export function getDiseaseChance(room: Room, diseaseType: DiseaseType, baseChance: number): number {
  const effects = [...room.permanentEffects, ...room.temporaryEffects]
    .filter((effect) => effect.metric === "diseaseChance" && effect.diseaseType === diseaseType);
  return effects.reduce((chance, effect) => {
    if (effect.operation === "SET") return effect.value;
    if (effect.operation === "ADD") return chance + effect.value;
    return chance * effect.value;
  }, baseChance);
}
