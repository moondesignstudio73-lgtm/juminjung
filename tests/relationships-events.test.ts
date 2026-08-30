import test from "node:test";
import assert from "node:assert/strict";
import { getActiveAuraSynergies, getInjuryRecovery, recalculateRoomEffects } from "../game/aura-effect-manager.ts";
import { createGuests } from "../game/guest-data.ts";
import { getActiveRelationships, getRelationshipDistanceMultiplier } from "../game/relationship-manager.ts";
import { assignGuest } from "../game/room-manager.ts";
import { createRooms } from "../game/room-manager.ts";
import { advanceHotelStories, completeEventStage } from "../game/story-event-manager.ts";
import { resolveDay } from "../game/day-manager.ts";
import { createInitialGameState } from "../game/save-manager.ts";

function stayingGuests() {
  return createGuests().map((guest) => guest.id === "eleanor" ? { ...guest, status: "STAYING" as const, currentRoomNumber: 301, checkedInDay: 1 } : guest.id === "ruth" ? { ...guest, status: "STAYING" as const, currentRoomNumber: 302, checkedInDay: 1 } : guest);
}

test("관계 이벤트 배율은 인접 2배, 같은 층 1.5배, 다른 층 1배다", () => {
  const rooms = createRooms();
  const guests = stayingGuests();
  const eleanor = guests.find((guest) => guest.id === "eleanor")!;
  const ruth = guests.find((guest) => guest.id === "ruth")!;
  assert.equal(getRelationshipDistanceMultiplier(rooms, eleanor, ruth), 2);
  assert.equal(getRelationshipDistanceMultiplier(rooms, eleanor, { ...ruth, currentRoomNumber: 310 }), 1.5);
  assert.equal(getRelationshipDistanceMultiplier(rooms, eleanor, { ...ruth, currentRoomNumber: 110 }), 1);
});

test("같이 투숙 중인 NPC 관계만 활성 관계 목록에 포함된다", () => {
  const relationships = getActiveRelationships(createRooms(), stayingGuests());
  assert.ok(relationships.some((relation) => relation.sourceId === "eleanor" && relation.targetId === "ruth" && relation.distanceMultiplier === 2 && relation.weightedValue === 80));
});

test("Eleanor와 Ruth의 Aura가 겹치면 MEDICAL WARD가 활성화된다", () => {
  const guests = stayingGuests();
  let rooms = assignGuest(createRooms(), 301, "eleanor");
  rooms = assignGuest(rooms, 302, "ruth");
  const synergies = getActiveAuraSynergies(rooms, guests);
  assert.equal(synergies[0]?.name, "MEDICAL WARD");
  const calculated = recalculateRoomEffects(rooms, guests);
  const overlapRoom = calculated.find((room) => room.roomNumber === 301)!;
  assert.equal(getInjuryRecovery(overlapRoom), 10);
});

test("체크인 시 ARRIVAL 단계가 한 번만 완료되고 로그 항목이 생성된다", () => {
  const guests = createGuests();
  const first = completeEventStage(guests, "eleanor", "ARRIVAL");
  const duplicate = completeEventStage(first.guests, "eleanor", "ARRIVAL");
  assert.equal(first.guests[0].eventChain[0].completed, true);
  assert.ok(first.entry?.message.includes("호텔 문 앞의 의사"));
  assert.equal(duplicate.entry, null);
});

test("숙박 마지막 밤까지 LIFE, CONFLICT, RESOLUTION 단계가 순서대로 완료된다", () => {
  let guests = stayingGuests();
  guests = completeEventStage(guests, "eleanor", "ARRIVAL").guests;
  const firstNight = advanceHotelStories(guests, 1);
  assert.equal(firstNight.guests[0].eventChain.find((event) => event.stage === "LIFE_AT_HOTEL")?.completed, true);
  firstNight.guests[0].remainingNights = 1;
  const lastNight = advanceHotelStories(firstNight.guests, 2, createRooms());
  assert.equal(lastNight.guests[0].eventChain.find((event) => event.stage === "CONFLICT")?.completed, true);
  assert.equal(lastNight.guests[0].eventChain.find((event) => event.stage === "RESOLUTION")?.completed, true);
  assert.ok(lastNight.entries.some((entry) => entry.message.includes("강도 80")));
});

test("MEDICAL WARD 객실의 투숙객은 야간 정산 때 Health를 10 회복한다", () => {
  const state = createInitialGameState();
  state.phase = "night";
  state.day = 5;
  state.guests = stayingGuests().map((guest) => guest.id === "eleanor" ? { ...guest, health: 70 } : guest);
  let rooms = assignGuest(state.rooms, 301, "eleanor");
  rooms = assignGuest(rooms, 302, "ruth");
  state.rooms = recalculateRoomEffects(rooms, state.guests);
  const resolved = resolveDay(state);
  assert.equal(resolved.guests.find((guest) => guest.id === "eleanor")?.health, 80);
});
