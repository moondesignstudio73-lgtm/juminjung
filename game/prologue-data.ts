export const FATHER_DEPARTURE_IMAGE = "/juminjung/assets/cutscenes/father-departure-v1.png";
export const EMPTY_FRONT_DESK_IMAGE = "/juminjung/assets/front-desk-night.png";
export const FATHER_DEPARTURE_ALT = "낡은 가방과 무전기를 들고 비 내리는 거리로 나가기 전 JUJU HOTEL 문턱에 멈춰 선 아버지의 뒷모습.";

export const PROLOGUE_BEATS = [
  { tag: "DAY 0 · 오후 5:16", speaker: "아버지", line: "“곧 돌아오마. 발전기 연료는 매일 확인하고, 해가 지면 문을 열어두지 마.”", image: FATHER_DEPARTURE_IMAGE, imageAlt: FATHER_DEPARTURE_ALT },
  { tag: "DAY 0 · 오후 5:19", speaker: "나", line: "“대체 어디 가는 건데?”", image: FATHER_DEPARTURE_IMAGE, imageAlt: FATHER_DEPARTURE_ALT },
  { tag: "DAY 0 · 오후 5:20", speaker: "아버지", line: "“하나만 기억해. 사람처럼 보인다고 해서 전부 들이지는 마.”", image: FATHER_DEPARTURE_IMAGE, imageAlt: FATHER_DEPARTURE_ALT },
  { tag: "DAY 0 · 오후 8:47", speaker: "라디오 91.3", line: "…긴급 통행금지는 계속됩니다. 해가 진 뒤 밖에서 들리는 목소리에 응답하지 마십시오…", image: EMPTY_FRONT_DESK_IMAGE, imageAlt: "아버지가 떠난 뒤 비어 있는 어두운 JUJU HOTEL 프런트." },
] as const;

export function normalizePrologueIndex(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(PROLOGUE_BEATS.length - 1, Math.trunc(numeric))) : 0;
}
