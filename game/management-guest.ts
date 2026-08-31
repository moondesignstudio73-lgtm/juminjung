import type { Guest } from "./types.ts";

export function getStayingGuestsForManagement(guests: Guest[]): Guest[] {
  return guests
    .filter((guest) => guest.status === "STAYING" && guest.currentRoomNumber !== null)
    .sort((a, b) =>
      (b.checkedInDay ?? 0) - (a.checkedInDay ?? 0)
      || (a.currentRoomNumber ?? 0) - (b.currentRoomNumber ?? 0)
      || a.name.localeCompare(b.name),
    );
}

export function getManagedGuest(guests: Guest[], preferredGuestId: string | null): Guest | null {
  const stayingGuests = getStayingGuestsForManagement(guests);
  return stayingGuests.find((guest) => guest.id === preferredGuestId) ?? stayingGuests[0] ?? null;
}
