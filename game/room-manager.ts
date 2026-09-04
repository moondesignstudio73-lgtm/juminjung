import type { Guest, Room } from "./types.ts";
import { INITIAL_OPEN_ROOMS, roomRecovery, ROOM_DAMAGE } from './community-data.ts';

const ROOM_STATUS_LABELS: Record<Room["status"], string> = {
  EMPTY: "비어 있음",
  OCCUPIED: "사용 중",
  DAMAGED: "파손",
  LOCKED: "봉쇄",
};

export function createRooms({ restored = false }: { restored?: boolean } = {}): Room[] {
  return [1, 2, 3].flatMap((floor) =>
    Array.from({ length: 10 }, (_, x) => ({
      roomNumber: floor * 100 + x + 1,
      floor,
      position: { x, y: floor - 1 },
      occupied: false,
      guestId: null,
      roomCondition: restored || INITIAL_OPEN_ROOMS.includes(floor * 100 + x + 1) ? 100 : 20,
      status: restored || INITIAL_OPEN_ROOMS.includes(floor * 100 + x + 1) ? "EMPTY" as const : "LOCKED" as const,
      recovery: restored || INITIAL_OPEN_ROOMS.includes(floor * 100 + x + 1) ? undefined : roomRecovery(floor * 100 + x + 1),
      temporaryEffects: [],
      permanentEffects: [],
    })),
  );
}

export function isRoomSelectable(room: Room): boolean {
  return room.status === "EMPTY" && !room.occupied;
}

export function getRoomOccupantLabel(room: Room, guests: Guest[]): string {
  if (!room.occupied) return room.recovery && !room.recovery.restored ? ROOM_DAMAGE[room.recovery.damage].label : ROOM_STATUS_LABELS[room.status];
  if (!room.guestId) return "사용 중";
  const guest = guests.find((candidate) => candidate.id === room.guestId);
  return guest?.name.trim().split(/\s+/)[0] || "사용 중";
}

export function assignGuest(rooms: Room[], roomNumber: number, guestId: string): Room[] {
  const target = rooms.find((room) => room.roomNumber === roomNumber);
  if (!target || !isRoomSelectable(target)) throw new Error("선택할 수 없는 객실입니다.");
  return rooms.map((room) =>
    room.roomNumber === roomNumber
      ? { ...room, occupied: true, guestId, status: "OCCUPIED" as const }
      : room,
  );
}

export function checkoutGuest(rooms: Room[], guestId: string): Room[] {
  return rooms.map((room) =>
    room.guestId === guestId
      ? { ...room, occupied: false, guestId: null, status: "EMPTY" as const, temporaryEffects: [] }
      : room,
  );
}

export function moveGuest(rooms: Room[], guestId: string, roomNumber: number): Room[] {
  return assignGuest(checkoutGuest(rooms, guestId), roomNumber, guestId);
}
