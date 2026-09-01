import type {
  MonsterCodexEntryDefinition,
  MonsterKnowledgeCertainty,
  MonsterKnowledgeSourceDefinition,
  VisitorStatementDefinition,
} from "./types.ts";

export const MONSTER_CERTAINTY_WEIGHTS: Readonly<Record<MonsterKnowledgeCertainty, number>> = {
  RUMOR: 0.5,
  CORROBORATED: 1,
  VERIFIED: 1.5,
};

export const VISITOR_STATEMENTS: ReadonlyArray<VisitorStatementDefinition> = [
  {
    id: "RUTH_SCRATCH_CLAIM",
    guestId: "ruth",
    questionId: "ruth-scratch",
    claim: "목의 상처는 철망에 긁혀 생겼다.",
    finding: "붕대의 세 갈래 검은 자국은 철망 간격과 맞지 않습니다. Ruth의 설명과 상처 형태가 모순됩니다.",
    assessment: "CONTRADICTED",
    requiredInspectedItemId: "bandage",
    knowledgeSourceId: "RUTH_SCRATCH_CONTRADICTION",
  },
  {
    id: "HAZEL_TRACKS_TESTIMONY",
    guestId: "hazel",
    questionId: "hazel-tracks",
    claim: "괴물은 들어올 때 네 발로 움직이고, 돌아갈 때 두 발로 걸어 사람의 보폭을 흉내 낸다.",
    finding: "덫에 새긴 보폭 눈금이 Hazel의 이동 순서와 일치합니다. 낮은 접근로를 먼저 막아야 합니다.",
    assessment: "CORROBORATED",
    requiredInspectedItemId: "traps",
    knowledgeSourceId: "HAZEL_TRACKS_TESTIMONY",
  },
  {
    id: "WHITE_FALSE_VOICE_WARNING",
    guestId: "white",
    questionId: "white-origin",
    claim: "문밖에서 들리는 목소리 중 하나는 사람의 기억을 빌린 거짓말이다.",
    finding: "화이트는 근거를 제시하지 않았습니다. 사실 여부는 알 수 없지만 반복되는 호출에 대한 경고로 보존합니다.",
    assessment: "RECORDED",
    knowledgeSourceId: "WHITE_FALSE_VOICE_WARNING",
  },
];

export const MONSTER_CODEX: ReadonlyArray<MonsterCodexEntryDefinition> = [
  {
    id: "MIMIC_STALKER",
    name: "문턱 추적자",
    classification: "MIMIC STALKER · 행동형 미확인 개체",
    description: "낮은 자세로 건물에 접근한 뒤 사람의 움직임을 흉내 내며 문과 창문 사이의 내부 경로를 탐색합니다.",
    tacticalThreshold: 2,
    minimumSources: 2,
    countermeasure: "지면 가까이에 철선을 설치하고 외부등을 낮게 비추면 동쪽 철문 접근로를 적은 부품으로 차단할 수 있습니다.",
    preparationCountermeasure: { optionId: "EXTERIOR_LIGHTS", effect: { threat: -2 } },
    insights: [
      { id: "TRIPLE_CLAW_PATTERN", name: "세 갈래 공격 흔적", description: "사람 손톱보다 넓은 세 줄의 검은 자국이 남습니다." },
      { id: "SHIFTING_GAIT", name: "바뀌는 보행", description: "접근할 때는 네 발, 이탈할 때는 두 발로 움직여 사람의 보폭을 흉내 냅니다." },
      { id: "INTERIOR_EXIT_ROUTE", name: "실내 이탈 경로", description: "잠긴 문을 우회해 창문과 빗물받이를 출입 경로로 사용합니다." },
    ],
  },
  {
    id: "SIGNAL_PARASITE",
    name: "신호 잠식체",
    classification: "SIGNAL PARASITE · 전파 의존형 미확인 개체",
    description: "라디오와 기억 속 목소리를 복제해 서로 떨어진 송신소에서 같은 호출을 반복하고, 응답이 돌아온 위치를 추적합니다.",
    tacticalThreshold: 2,
    minimumSources: 2,
    countermeasure: "일상 송신을 멈추고 짧은 무응답 구간을 섞은 정숙 규약을 사용하면 호텔 위치를 되짚는 신호를 끊을 수 있습니다.",
    preparationCountermeasure: { optionId: "SILENCE_PROTOCOL", effect: { threat: -3, allGuestStress: -2 } },
    insights: [
      { id: "BORROWED_VOICE", name: "빌린 목소리", description: "직접 본 적 없는 사람의 기억과 호출명을 사용해 문밖이나 수신기에서 대답을 유도합니다." },
      { id: "SYNCHRONIZED_CALLS", name: "동시 호출", description: "서로 만난 적 없는 생존자들이 다른 지역에서 같은 문장과 실종 순서를 듣습니다." },
      { id: "RELAY_ECHO", name: "중계기 역행", description: "세 중계기의 지연 시간이 같아 자연 송신이 아니라 응답 위치를 향해 역으로 좁혀지는 패턴을 보입니다." },
    ],
  },
];

export const MONSTER_KNOWLEDGE_SOURCES: ReadonlyArray<MonsterKnowledgeSourceDefinition> = [
  { id: "RUTH_SCRATCH_CONTRADICTION", entryId: "MIMIC_STALKER", insightId: "TRIPLE_CLAW_PATTERN", name: "Ruth의 붕대 흔적", certainty: "CORROBORATED" },
  { id: "HAZEL_TRACKS_TESTIMONY", entryId: "MIMIC_STALKER", insightId: "SHIFTING_GAIT", name: "Hazel의 덫 기록", certainty: "CORROBORATED" },
  { id: "ROOM_207_MONSTER_CONCLUSION", entryId: "MIMIC_STALKER", insightId: "INTERIOR_EXIT_ROUTE", name: "207호 현장 결론", certainty: "VERIFIED" },
  { id: "WHITE_FALSE_VOICE_WARNING", entryId: "SIGNAL_PARASITE", insightId: "BORROWED_VOICE", name: "White의 거짓 목소리 경고", certainty: "RUMOR" },
  { id: "RADIO_SURVIVOR_CHORUS", entryId: "SIGNAL_PARASITE", insightId: "SYNCHRONIZED_CALLS", name: "원격 생존자 교차 증언", certainty: "CORROBORATED" },
  { id: "FATHER_RELAY_TRACE", entryId: "SIGNAL_PARASITE", insightId: "RELAY_ECHO", name: "91.3 MHz 중계기 역추적", certainty: "VERIFIED" },
];
