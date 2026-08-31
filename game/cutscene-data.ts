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
    id: "guest_attacked",
    triggerEventId: "perimeter_breach",
    triggerChoiceId: "fight",
    priority: 150,
    kicker: "BREACH · FRONT LOBBY",
    title: "쓰러진 사람, 남겨진 열쇠",
    body: "철문이 안쪽으로 꺾이자 투숙객 한 명이 무너진 현관 쪽으로 뛰어들었다. 한 번의 충돌 뒤 그는 피와 빗물을 끌며 프런트 뒤로 돌아왔고, 다른 생존자가 그의 어깨를 붙잡아 카운터 아래로 끌어내렸다. 깨진 유리 너머의 형체는 쓰러진 사람을 쫓지 않았다. 기울어진 고개는 카운터의 황동 열쇠들을 향하고 있었다.",
    quote: "문을 막은 건 사람이었지만, 저것이 찾은 건 사람이 아니었다.",
    image: "/juminjung/assets/cutscenes/hotel-breach-guest-attack-v1.png",
    imageAlt: "파손된 호텔 로비에서 한 생존자가 프런트 카운터 뒤의 부상자를 끌어내고, 폭우 속 괴물 형체가 무너진 바리케이드 너머에 서 있는 장면.",
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
  {
    id: "refugees_sheltered",
    triggerEventId: "refugee_wave",
    triggerChoiceId: "shelter",
    priority: 80,
    minimumCompletedDay: 8,
    kicker: "THE TURNING KEY · EAST GATE",
    title: "철문을 여는 손",
    body: "젖은 얼굴들이 철창 너머에서 대답을 기다렸다. 아이의 기침이 다시 들리자 당신은 바리케이드의 빗장을 풀고 황동 열쇠를 돌렸다. 문이 열리는 몇 분 동안 바깥의 그림자도 호텔을 보았지만, 오늘 밤 JUJU HOTEL은 다시 사람이 사는 곳이 될 것이다.",
    quote: "방은 없어도, 지붕은 나눌 수 있다.",
    image: "/juminjung/assets/cutscenes/refugees-at-gate-v1.png",
    imageAlt: "차가운 폭우 속에서 아이를 안은 보호자와 노인 등 피난민들이 JUJU HOTEL 철문 앞에 모여 도움을 청하는 장면.",
  },
  {
    id: "refugees_denied",
    triggerEventId: "refugee_wave",
    triggerChoiceId: "deny",
    priority: 80,
    minimumCompletedDay: 8,
    kicker: "THE CLOSED GATE · EAST GATE",
    title: "철문 밖에 남은 발자국",
    body: "램프를 끄자 바깥의 얼굴들이 하나씩 어둠에 잠겼다. 아이의 기침 소리는 빗소리에 묻힐 때까지 오래 남았다. 새벽이 왔을 때 철문 앞에는 작은 신발 자국과, 호텔 쪽을 향해 눌린 손바닥 자국만 남아 있었다.",
    quote: "문을 지켰다. 그러나 무엇을 지킨 것인지는 장부에 적히지 않았다.",
    image: "/juminjung/assets/cutscenes/refugees-at-gate-v1.png",
    imageAlt: "차가운 폭우 속에서 아이를 안은 보호자와 노인 등 피난민들이 JUJU HOTEL 철문 앞에 모여 도움을 청하는 장면.",
  },
];

export function getCutscene(id: string | null): CutsceneDefinition | null {
  return CUTSCENES.find((cutscene) => cutscene.id === id) ?? null;
}
