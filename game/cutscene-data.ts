import type { CutsceneDefinition } from "./types.ts";

export const CUTSCENES: CutsceneDefinition[] = [
  {
    id: "first_night",
    priority: 10,
    minimumCompletedDay: 1,
    maximumCompletedDay: 1,
    kicker: "FIRST NIGHT · 03:07 AM",
    title: "호텔이 숨을 죽인 시간",
    body: "마지막 순찰을 마치고 장부를 펼쳤지만, 적을 이름도 없이 식량과 연료만 셌다. 라디오는 같은 주파수를 맴돌았고 복도 끝의 문은 아까보다 조금 더 열려 있었다. 아버지가 없는 첫날 밤, 호텔의 모든 소리가 누군가의 발걸음처럼 들렸다.",
    quote: "아침까지 문을 지키는 것. 오늘 해야 할 일은 그것뿐이다.",
    image: "/juminjung/assets/cutscenes/first-night-v1.png",
    imageAlt: "낡은 JUJU HOTEL 프런트 장부와 라디오 너머로 비어 있는 어두운 복도가 길게 이어지는 첫날 밤.",
  },
  {
    id: "first_monster_sighting",
    triggerEventId: "perimeter_breach",
    priority: 100,
    kicker: "FIRST SIGHTING · EAST GATE",
    title: "철문 너머에 서 있던 것",
    body: "번개가 로비를 하얗게 가른 순간, 빗속의 형체가 사람보다 한 뼘 더 길게 몸을 폈다. 그것은 문을 두드리지 않았다. 손가락 하나로 휘어진 철문을 천천히 짚었고, 라디오에서는 아버지의 주파수와 같은 잡음이 흘렀다.",
    quote: "사람처럼 보인다고 해서 전부 들이지는 마.",
    image: "/juminjung/assets/cutscenes/first-monster-sighting-v1.png",
    imageAlt: "차가운 빗속에서 비정상적으로 긴 괴물이 JUJU HOTEL의 휘어진 철문 너머에 서 있는 첫 목격 장면.",
  },
];

export function getCutscene(id: string | null): CutsceneDefinition | null {
  return CUTSCENES.find((cutscene) => cutscene.id === id) ?? null;
}
