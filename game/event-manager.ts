import type { EventFlags } from "./types.ts";

export function createEventFlags(): EventFlags {
  return { eleanor_checked_in: false, eleanor_room: 0, monster_threat: 0, faction_pressure: 0 };
}

export function setGuestRoomFlags(flags: EventFlags, roomNumber: number | null): EventFlags {
  return {
    ...flags,
    eleanor_checked_in: roomNumber !== null,
    eleanor_room: roomNumber ?? 0,
  };
}

export function meetsEventConditions(flags: EventFlags, conditions: EventFlags): boolean {
  return Object.entries(conditions).every(([key, value]) => flags[key] === value);
}
