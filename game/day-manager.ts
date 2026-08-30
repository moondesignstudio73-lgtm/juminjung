import { getInjuryRecovery, recalculateRoomEffects } from "./aura-effect-manager.ts";
import { checkoutGuest } from "./room-manager.ts";
import { advanceHotelStories } from "./story-event-manager.ts";
import { evaluateEndings } from "./ending-manager.ts";
import { determineWorldState } from "./world-state-manager.ts";
import type { DaySummary, GameState, HotelLogEntry } from "./types.ts";

export function advanceDay(day: number): number { return Math.max(0, day) + 1; }

export function resolveDay(state: GameState): GameState {
  if (state.phase !== "night") throw new Error("DAY 정산은 야간 단계에서 한 번만 실행할 수 있습니다.");
  const story = advanceHotelStories(state.guests, state.day, state.rooms);
  const staying = story.guests.filter((guest) => guest.status === "STAYING" && guest.currentRoomNumber !== null);
  const stayingIds = new Set(staying.map((guest) => guest.id));
  const consumed = { food: staying.length, water: staying.length, fuel: 1 };
  const checkedOutGuestIds: string[] = [];
  const guests = story.guests.map((guest) => {
    if (!stayingIds.has(guest.id)) return guest;
    const room = state.rooms.find((candidate) => candidate.roomNumber === guest.currentRoomNumber);
    const health = Math.min(100, guest.health + (room ? getInjuryRecovery(room) : 0));
    const remainingNights = Math.max(0, guest.remainingNights - 1);
    if (remainingNights === 0) {
      checkedOutGuestIds.push(guest.id);
      return { ...guest, health, remainingNights, currentRoomNumber: null, status: "CHECKED_OUT" as const };
    }
    return { ...guest, health, remainingNights };
  });
  const emptied = checkedOutGuestIds.reduce((rooms, guestId) => checkoutGuest(rooms, guestId), state.rooms);
  const nextDay = advanceDay(state.day);
  const summary: DaySummary = { completedDay: state.day, nextDay, occupiedGuests: staying.length, consumed, checkedOutGuestIds };
  const entries: HotelLogEntry[] = [
    ...story.entries,
    { day: state.day, type: "RESOURCE", message: `식량 ${consumed.food}, 물 ${consumed.water}, 연료 ${consumed.fuel} 소비` },
    ...checkedOutGuestIds.map((guestId): HotelLogEntry => ({ day: nextDay, type: "CHECK_OUT", message: `${state.guests.find((guest) => guest.id === guestId)?.name ?? guestId} · 숙박 종료 자동 체크아웃` })),
  ];
  const eleanor = guests.find((guest) => guest.id === "eleanor");
  const stayingAfter = guests.filter((guest) => guest.status === "STAYING");
  const nextState: GameState = {
    ...state,
    day: nextDay,
    phase: "report",
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
    hotelStats: {
      ...state.hotelStats,
      security: state.resources.security,
      survivorPopulation: stayingAfter.filter((guest) => guest.alive).length,
      averageTrust: stayingAfter.length ? Math.round(stayingAfter.reduce((sum, guest) => sum + guest.trust, 0) / stayingAfter.length) : 0,
      resources: Math.min(100, Math.round((state.resources.food + state.resources.water + state.resources.fuel) / 3)),
    },
  };
  nextState.worldState = determineWorldState(nextState);
  const endings = evaluateEndings(nextState);
  return { ...nextState, availableEndings: endings.available, endingProgress: endings.progress };
}
