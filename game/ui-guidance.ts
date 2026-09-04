import type { GameState, Guest, Room } from './types.ts';
import { ROOM_DAMAGE } from './community-data.ts';
export function hotelCapacity(rooms: Room[]) {
  return {
    open: rooms.filter((r) => r.status === 'EMPTY' || r.status === 'OCCUPIED')
      .length,
    occupied: rooms.filter((r) => r.occupied).length,
  };
}
export function roomCaption(room: Room, guests: Guest[]) {
  if (room.occupied)
    return guests.find((g) => g.id === room.guestId)?.name ?? '거주 중';
  return room.recovery && !room.recovery.restored
    ? ROOM_DAMAGE[room.recovery.damage].label
    : room.status === 'EMPTY'
      ? '빈 객실'
      : room.status === 'DAMAGED'
        ? '수리 필요'
        : '출입 제한';
}
export function canUseShortcut(
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'repeat'>,
  target: Element | null,
  modalOpen = false,
) {
  return (
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.repeat &&
    !modalOpen &&
    !target?.closest(
      'input,textarea,select,[contenteditable="true"],[role="combobox"]',
    )
  );
}
export function saveOverview(state: Partial<GameState>) {
  const guests = Array.isArray(state.guests) ? state.guests : [];
  const rooms = Array.isArray(state.rooms) ? state.rooms : [];
  return {
    residents: guests.filter((g) => g.alive && g.status === 'STAYING').length,
    ...hotelCapacity(rooms),
    event: Array.isArray(state.eventHistory)
      ? String(state.eventHistory.at(-1)?.message ?? '호텔 운영 시작').slice(
          0,
          85,
        )
      : '호텔 운영 시작',
  };
}
export function changeTone(resource: string, before: number, after: number) {
  if (['경과 시간(분)', 'guests', 'rooms', 'ap'].includes(resource))
    return 'neutral';
  const positive = after > before;
  return (resource === '범죄 위험' ? !positive : positive)
    ? 'positive'
    : 'negative';
}
