import type { Guest } from "./types.ts";

export function getEligibleVisitor(guests: Guest[], day: number): Guest | null {
  const appeared = new Set(guests.filter((guest) => guest.status !== "WAITING").map((guest) => guest.id));
  return guests.filter((guest) => guest.status === "WAITING" && guest.arrivalDay <= day && guest.arrivalConditions.every((condition) => condition.type !== "GUEST_APPEARED" || appeared.has(condition.key))).sort((a, b) => a.arrivalDay - b.arrivalDay)[0] ?? null;
}

export function markVisitorRefused(guests: Guest[], guestId: string): Guest[] {
  return guests.map((guest) => guest.id === guestId ? { ...guest, status: "REFUSED" as const, trust: Math.max(0, guest.trust - 10) } : guest);
}

export function discoverTrait(guests: Guest[], guestId: string, trait: string): Guest[] {
  return guests.map((guest) => guest.id === guestId && guest.hiddenTraits.includes(trait) ? { ...guest, discoveredTraits: [...new Set([...guest.discoveredTraits, trait])] } : guest);
}
