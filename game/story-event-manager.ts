import { getActiveRelationships } from "./relationship-manager.ts";
import { STORY_CHOICE_EVENTS } from "./story-choice-data.ts";
import type { Guest, HotelLogEntry, Room } from "./types.ts";

export function completeEventStage(guests: Guest[], guestId: string, stage: Guest["eventChain"][number]["stage"]): { guests: Guest[]; entry: HotelLogEntry | null } {
  let title: string | null = null;
  const next = guests.map((guest) => {
    if (guest.id !== guestId) return guest;
    const event = guest.eventChain.find((item) => item.stage === stage);
    if (!event || event.completed) return guest;
    title = event.title;
    return { ...guest, eventChain: guest.eventChain.map((item) => item.id === event.id ? { ...item, completed: true } : item) };
  });
  return { guests: next, entry: title ? { day: 0, type: "EVENT", message: `${next.find((guest) => guest.id === guestId)?.name} · ${title}` } : null };
}

export function advanceHotelStories(guests: Guest[], day: number, rooms: Room[] = []): { guests: Guest[]; entries: HotelLogEntry[] } {
  let current = guests;
  const entries: HotelLogEntry[] = [];
  for (const guest of guests.filter((item) => item.status === "STAYING" && item.checkedInDay !== null)) {
    const ordered: Guest["eventChain"][number]["stage"][] = ["ARRIVAL", "LIFE_AT_HOTEL", "CONFLICT", "RESOLUTION"];
    for (const stage of ordered) {
      const latest = current.find((item) => item.id === guest.id)!;
      const authoredConflict = STORY_CHOICE_EVENTS.some((event) => event.guestId === guest.id && event.stage === "CONFLICT");
      const authoredResolution = STORY_CHOICE_EVENTS.some((event) => event.guestId === guest.id && event.stage === "RESOLUTION");
      const conflictIncomplete = latest.eventChain.some((event) => event.stage === "CONFLICT" && !event.completed);
      if (stage === "CONFLICT" && authoredConflict) continue;
      if (stage === "RESOLUTION" && authoredResolution) continue;
      if (stage === "RESOLUTION" && authoredConflict && conflictIncomplete) continue;
      const residenceAge = day - (latest.checkedInDay ?? day);
      const allowed = stage === "ARRIVAL" || stage === "LIFE_AT_HOTEL" || (stage === "CONFLICT" && (latest.npcType === 'NORMAL' ? residenceAge >= 2 : latest.remainingNights <= Math.max(1, latest.stayDuration - 1))) || (stage === "RESOLUTION" && (latest.npcType === 'NORMAL' ? residenceAge >= 6 : latest.remainingNights <= 1));
      if (!allowed) continue;
      const result = completeEventStage(current, guest.id, stage);
      current = result.guests;
      if (result.entry) {
        entries.push({ ...result.entry, day });
        if (stage === "CONFLICT") {
          const relation = getActiveRelationships(rooms, current)
            .filter((item) => item.sourceId === guest.id || item.targetId === guest.id)
            .sort((a, b) => Math.abs(b.weightedValue) - Math.abs(a.weightedValue))[0];
          if (relation) entries.push({ day, type: "EVENT", message: `관계 사건 · ${relation.type} 강도 ${relation.weightedValue} (객실 거리 ×${relation.distanceMultiplier})` });
        }
      }
    }
  }
  return { guests: current, entries };
}
