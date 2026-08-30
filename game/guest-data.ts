import type { Guest } from "./types.ts";

export const ELEANOR_ID = "eleanor";

export function createGuests(): Guest[] {
  return [{
    id: ELEANOR_ID,
    name: "엘리너 리드",
    role: "의사",
    currentRoomNumber: null,
    aura: {
      id: "medical-care-zone",
      name: "Medical Care Zone",
      description: "엘리너와 인접한 객실의 일반 질병 발생률을 0%로 만듭니다.",
      metric: "diseaseChance",
      diseaseType: "NORMAL_DISEASE",
      operation: "SET",
      value: 0,
      radius: 1,
      distance: "CHEBYSHEV",
    },
  }];
}
