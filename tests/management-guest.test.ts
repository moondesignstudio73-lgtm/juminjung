import assert from "node:assert/strict";
import test from "node:test";
import { createGuests } from "../game/guest-data.ts";
import { getManagedGuest, getStayingGuestsForManagement } from "../game/management-guest.ts";

function stayingGuest(index: number, roomNumber: number, checkedInDay: number) {
  return {
    ...createGuests()[index],
    status: "STAYING" as const,
    currentRoomNumber: roomNumber,
    checkedInDay,
  };
}

test("관리 목록은 최근 체크인 순으로 모든 현재 투숙객을 반환한다", () => {
  const earlier = stayingGuest(0, 202, 1);
  const later = stayingGuest(1, 205, 3);
  assert.deepEqual(getStayingGuestsForManagement([earlier, later]).map((guest) => guest.id), [later.id, earlier.id]);
});

test("사용자가 선택한 현재 투숙객을 관리 대상으로 유지한다", () => {
  const first = stayingGuest(0, 202, 1);
  const second = stayingGuest(1, 205, 2);
  assert.equal(getManagedGuest([first, second], first.id)?.id, first.id);
});

test("유효하지 않거나 체크아웃한 선택은 최근 투숙객으로 안전하게 대체한다", () => {
  const staying = stayingGuest(0, 202, 1);
  const checkedOut = { ...createGuests()[1], status: "CHECKED_OUT" as const, currentRoomNumber: null };
  assert.equal(getManagedGuest([staying, checkedOut], checkedOut.id)?.id, staying.id);
  assert.equal(getManagedGuest([staying, checkedOut], "missing")?.id, staying.id);
});

test("현재 투숙객이 없으면 관리 대상도 없다", () => {
  assert.equal(getManagedGuest(createGuests(), null), null);
});

test("같은 날 체크인한 투숙객은 객실 번호 순으로 안정적으로 정렬한다", () => {
  const highRoom = stayingGuest(0, 305, 2);
  const lowRoom = stayingGuest(1, 103, 2);
  assert.deepEqual(getStayingGuestsForManagement([highRoom, lowRoom]).map((guest) => guest.currentRoomNumber), [103, 305]);
});
