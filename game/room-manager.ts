import type { Room } from "./types.ts";

export function createRooms(): Room[] {
  return [1, 2, 3].flatMap((floor) =>
    Array.from({ length: 10 }, (_, x) => ({
      roomNumber: floor * 100 + x + 1,
      floor,
      position: { x, y: floor - 1 },
      occupied: false,
      guestId: null,
      roomCondition: 100,
      status: "EMPTY" as const,
      temporaryEffects: [],
      permanentEffects: [],
    })),
  );
}

export function isRoomSelectable(room: Room): boolean {
  return room.status === "EMPTY" && !room.occupied;
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
