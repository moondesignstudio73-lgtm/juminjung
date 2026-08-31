import type { CutsceneDefinition } from "./types.ts";

export const CUTSCENES: CutsceneDefinition[] = [
  {
    id: "first_monster_sighting",
    triggerEventId: "perimeter_breach",
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
