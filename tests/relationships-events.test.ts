import { createEstablishedHotel } from './established-hotel.ts';
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
  const rooms = createRooms({ restored: true });
  const guests = stayingGuests();
  const eleanor = guests.find((guest) => guest.id === "eleanor")!;
  const ruth = guests.find((guest) => guest.id === "ruth")!;
  assert.equal(getRelationshipDistanceMultiplier(rooms, eleanor, ruth), 2);
  assert.equal(getRelationshipDistanceMultiplier(rooms, eleanor, { ...ruth, currentRoomNumber: 310 }), 1.5);
  assert.equal(getRelationshipDistanceMultiplier(rooms, eleanor, { ...ruth, currentRoomNumber: 110 }), 1);
});

test("같이 투숙 중인 NPC 관계만 활성 관계 목록에 포함된다", () => {
  const relationships = getActiveRelationships(createRooms({ restored: true }), stayingGuests());
  assert.ok(relationships.some((relation) => relation.sourceId === "eleanor" && relation.targetId === "ruth" && relation.distanceMultiplier === 2 && relation.weightedValue === 80));
});

test("Eleanor와 Ruth의 Aura가 겹치면 MEDICAL WARD가 활성화된다", () => {
  const guests = stayingGuests();
  let rooms = assignGuest(createRooms({ restored: true }), 301, "eleanor");
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

test("숙박 마지막 밤의 선택형 CONFLICT와 RESOLUTION은 야간 자동 진행이 건너뛴다", () => {
  let guests = stayingGuests();
  guests = completeEventStage(guests, "ruth", "ARRIVAL").guests;
  const firstNight = advanceHotelStories(guests, 1);
  const ruth = firstNight.guests.find((guest) => guest.id === "ruth")!;
  assert.equal(ruth.eventChain.find((event) => event.stage === "LIFE_AT_HOTEL")?.completed, true);
  ruth.remainingNights = 1;
  const lastNight = advanceHotelStories(firstNight.guests, 2, createRooms({ restored: true }));
  const resolvedRuth = lastNight.guests.find((guest) => guest.id === "ruth")!;
  assert.equal(resolvedRuth.eventChain.find((event) => event.stage === "CONFLICT")?.completed, false);
  assert.equal(resolvedRuth.eventChain.find((event) => event.stage === "RESOLUTION")?.completed, false);
  assert.equal(lastNight.entries.some((entry) => entry.message.includes("붕대 아래의 긁힌 자국")), false);
});

test("MEDICAL WARD 객실의 투숙객은 야간 정산 때 Health를 10 회복한다", () => {
  const state = createEstablishedHotel();
  state.phase = "night";
  state.day = 5;
  state.guests = stayingGuests().map((guest) => guest.id === "eleanor" ? { ...guest, health: 70 } : guest);
  let rooms = assignGuest(state.rooms, 301, "eleanor");
  rooms = assignGuest(rooms, 302, "ruth");
  state.rooms = recalculateRoomEffects(rooms, state.guests);
  const resolved = resolveDay(state);
  assert.equal(resolved.guests.find((guest) => guest.id === "eleanor")?.health, 80);
});
