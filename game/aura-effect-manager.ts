import type { ActiveSynergy, DiseaseType, Guest, Room, RoomEffect } from "./types.ts";

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
  const withAuras = guests.reduce((current, guest) => {
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
  const medicalWard = getActiveAuraSynergies(withAuras, guests).find((synergy) => synergy.id === "medical-ward");
  if (!medicalWard) return withAuras;
  const affected = new Set(medicalWard.affectedRoomNumbers);
  return withAuras.map((room) => affected.has(room.roomNumber) ? { ...room, temporaryEffects: [...room.temporaryEffects, { id: "medical-ward", sourceGuestId: "eleanor+ruth", name: "MEDICAL WARD", metric: "injuryRecovery", diseaseType: "INJURY", operation: "SET", value: 10 }] } : room);
}

export function getActiveAuraSynergies(rooms: Room[], guests: Guest[]): ActiveSynergy[] {
  const eleanor = guests.find((guest) => guest.id === "eleanor" && guest.status === "STAYING");
  const ruth = guests.find((guest) => guest.id === "ruth" && guest.status === "STAYING");
  if (!eleanor || !ruth) return [];
  const ruthRooms = new Set(getAffectedRoomNumbers(rooms, ruth));
  const overlap = getAffectedRoomNumbers(rooms, eleanor).filter((roomNumber) => ruthRooms.has(roomNumber));
  return overlap.length ? [{ id: "medical-ward", name: "MEDICAL WARD", guestIds: [eleanor.id, ruth.id], affectedRoomNumbers: overlap, description: "Eleanor와 Ruth의 치료 범위가 겹쳐 일반 질병 방지와 부상 회복 지원이 강화됩니다." }] : [];
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

export function getInjuryRecovery(room: Room): number {
  return [...room.permanentEffects, ...room.temporaryEffects]
    .filter((effect) => effect.metric === "injuryRecovery")
    .reduce((recovery, effect) => effect.operation === "MULTIPLY" ? recovery * effect.value : effect.operation === "SET" ? effect.value : recovery + effect.value, 0);
}
