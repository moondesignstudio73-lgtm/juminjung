import { VISITOR_REACTIONS } from "./visitor-reaction-data.ts";
import type { EventFlags, GameState, Guest, Resources, VisitorReactionDefinition } from "./types.ts";

export function getEligibleVisitor(guests: Guest[], day: number, flags: EventFlags = {}): Guest | null {
  const appeared = new Set(guests.filter((guest) => guest.status !== "WAITING").map((guest) => guest.id));
  return guests.filter((guest) => guest.status === "WAITING" && guest.arrivalDay <= day && guest.arrivalConditions.every((condition) => condition.type === "GUEST_APPEARED" ? appeared.has(condition.key) : flags[condition.key] === (condition.value ?? true))).sort((a, b) => a.arrivalDay - b.arrivalDay)[0] ?? null;
}

const entriesMeet = (actual: Record<string, number>, required: Record<string, number> | undefined, mode: "min" | "max") => !required || Object.entries(required).every(([key, value]) => mode === "min" ? Number(actual[key] ?? 0) >= Number(value) : Number(actual[key] ?? 0) <= Number(value));

export function getVisitorReaction(state: GameState, guest: Guest): VisitorReactionDefinition | null {
  return VISITOR_REACTIONS.find((reaction) => reaction.guestId === guest.id
    && (!reaction.requiredFlags || Object.entries(reaction.requiredFlags).every(([key, value]) => state.flags[key] === value || state.endingRelatedFlags[key] === value))
    && !reaction.forbiddenFlags?.some((key) => Boolean(state.flags[key]) || Boolean(state.endingRelatedFlags[key]))
    && entriesMeet(state.reputations, reaction.minimumReputation, "min")
    && entriesMeet(state.reputations, reaction.maximumReputation, "max")) ?? null;
}

export function getVisitorReactionById(guest: Guest, reactionId: string | null): VisitorReactionDefinition | null {
  return reactionId ? VISITOR_REACTIONS.find((reaction) => reaction.id === reactionId && reaction.guestId === guest.id) ?? null : null;
}

export function applyVisitorReaction(guests: Guest[], guestId: string, reaction: VisitorReactionDefinition | null): Guest[] {
  if (!reaction) return guests;
  return guests.map((guest) => guest.id === guestId ? { ...guest, trust: Math.max(0, Math.min(100, guest.trust + reaction.trustDelta)), riskLevel: Math.max(0, Math.min(100, guest.riskLevel + Number(reaction.riskDelta ?? 0))), storyFlags: { ...guest.storyFlags, visitor_reaction: reaction.id } } : guest);
}

export function collectVisitorOffer(resources: Resources, guest: Guest, negotiated: boolean, reaction: VisitorReactionDefinition | null): Resources {
  return Object.fromEntries(Object.entries(resources).map(([key, value]) => [key, value + Number(guest.offer[key as keyof Resources] ?? 0) + (negotiated ? Number(guest.negotiatedOffer[key as keyof Resources] ?? 0) : 0) + Number(reaction?.offerBonus?.[key as keyof Resources] ?? 0)])) as Resources;
}

export function applyVisitorCheckInBenefits(resources: Resources, guests: Guest[], guestId: string, negotiated: boolean, reaction: VisitorReactionDefinition | null): { resources: Resources; guests: Guest[]; applied: boolean } {
  const guest = guests.find((item) => item.id === guestId);
  if (!guest) throw new Error(`체크인 방문자를 찾을 수 없습니다: ${guestId}`);
  if (guest.storyFlags.checkin_benefits_collected) return { resources, guests, applied: false };
  const reacted = applyVisitorReaction(guests, guestId, reaction).map((item) => item.id === guestId ? { ...item, storyFlags: { ...item.storyFlags, checkin_benefits_collected: true } } : item);
  return { resources: collectVisitorOffer(resources, guest, negotiated, reaction), guests: reacted, applied: true };
}

export function markVisitorRefused(guests: Guest[], guestId: string): Guest[] {
  return guests.map((guest) => guest.id === guestId ? { ...guest, status: "REFUSED" as const, trust: Math.max(0, guest.trust - 10) } : guest);
}

export function discoverTrait(guests: Guest[], guestId: string, trait: string): Guest[] {
  return guests.map((guest) => guest.id === guestId && guest.hiddenTraits.includes(trait) ? { ...guest, discoveredTraits: [...new Set([...guest.discoveredTraits, trait])] } : guest);
}
