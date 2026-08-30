import { recalculateRoomEffects } from "./aura-effect-manager.ts";
import { checkoutGuest } from "./room-manager.ts";
import type { DaySummary, GameState, HotelLogEntry } from "./types.ts";

export function advanceDay(day: number): number { return Math.min(30, Math.max(0, day) + 1); }

export function resolveDay(state: GameState): GameState {
  if (state.phase !== "night") throw new Error("DAY 정산은 야간 단계에서 한 번만 실행할 수 있습니다.");
  const staying = state.guests.filter((guest) => guest.status === "STAYING" && guest.currentRoomNumber !== null);
  const stayingIds = new Set(staying.map((guest) => guest.id));
  const consumed = { food: staying.length, water: staying.length, fuel: 1 };
  const checkedOutGuestIds: string[] = [];
  const guests = state.guests.map((guest) => {
    if (!stayingIds.has(guest.id)) return guest;
    const remainingNights = Math.max(0, guest.remainingNights - 1);
    if (remainingNights === 0) {
      checkedOutGuestIds.push(guest.id);
      return { ...guest, remainingNights, currentRoomNumber: null, status: "CHECKED_OUT" as const };
    }
    return { ...guest, remainingNights };
  });
  const emptied = checkedOutGuestIds.reduce((rooms, guestId) => checkoutGuest(rooms, guestId), state.rooms);
  const nextDay = advanceDay(state.day);
  const summary: DaySummary = { completedDay: state.day, nextDay, occupiedGuests: staying.length, consumed, checkedOutGuestIds };
  const entries: HotelLogEntry[] = [
    { day: state.day, type: "RESOURCE", message: `식량 ${consumed.food}, 물 ${consumed.water}, 연료 ${consumed.fuel} 소비` },
    ...checkedOutGuestIds.map((guestId): HotelLogEntry => ({ day: nextDay, type: "CHECK_OUT", message: `${state.guests.find((guest) => guest.id === guestId)?.name ?? guestId} · 숙박 종료 자동 체크아웃` })),
  ];
  const eleanor = guests.find((guest) => guest.id === "eleanor");
  return {
    ...state,
    day: nextDay,
    phase: state.day >= 30 ? "ending" : "report",
    guests,
    rooms: recalculateRoomEffects(emptied, guests),
    resources: {
      ...state.resources,
      food: Math.max(0, state.resources.food - consumed.food),
      water: Math.max(0, state.resources.water - consumed.water),
      fuel: Math.max(0, state.resources.fuel - consumed.fuel),
    },
    flags: {
      ...state.flags,
      eleanor_checked_in: eleanor?.status === "STAYING",
      eleanor_room: eleanor?.currentRoomNumber ?? 0,
    },
    eventHistory: [...state.eventHistory, ...entries],
    lastDaySummary: summary,
  };
}
