import type {
  MonsterCodexEntryDefinition,
  MonsterKnowledgeSourceDefinition,
  VisitorStatementDefinition,
} from "./types.ts";

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
];

export const MONSTER_CODEX: ReadonlyArray<MonsterCodexEntryDefinition> = [
  {
    id: "MIMIC_STALKER",
    name: "문턱 추적자",
    classification: "MIMIC STALKER · 행동형 미확인 개체",
    description: "낮은 자세로 건물에 접근한 뒤 사람의 움직임을 흉내 내며 문과 창문 사이의 내부 경로를 탐색합니다.",
    tacticalThreshold: 2,
    countermeasure: "지면 가까이에 철선을 설치하고 외부등을 낮게 비추면 동쪽 철문 접근로를 적은 부품으로 차단할 수 있습니다.",
    insights: [
      { id: "TRIPLE_CLAW_PATTERN", name: "세 갈래 공격 흔적", description: "사람 손톱보다 넓은 세 줄의 검은 자국이 남습니다." },
      { id: "SHIFTING_GAIT", name: "바뀌는 보행", description: "접근할 때는 네 발, 이탈할 때는 두 발로 움직여 사람의 보폭을 흉내 냅니다." },
      { id: "INTERIOR_EXIT_ROUTE", name: "실내 이탈 경로", description: "잠긴 문을 우회해 창문과 빗물받이를 출입 경로로 사용합니다." },
    ],
  },
];

export const MONSTER_KNOWLEDGE_SOURCES: ReadonlyArray<MonsterKnowledgeSourceDefinition> = [
  { id: "RUTH_SCRATCH_CONTRADICTION", entryId: "MIMIC_STALKER", insightId: "TRIPLE_CLAW_PATTERN" },
  { id: "HAZEL_TRACKS_TESTIMONY", entryId: "MIMIC_STALKER", insightId: "SHIFTING_GAIT" },
  { id: "ROOM_207_MONSTER_CONCLUSION", entryId: "MIMIC_STALKER", insightId: "INTERIOR_EXIT_ROUTE" },
];
