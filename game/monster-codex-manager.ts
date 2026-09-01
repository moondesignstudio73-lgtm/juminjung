import { MONSTER_CERTAINTY_WEIGHTS, MONSTER_CODEX, MONSTER_KNOWLEDGE_SOURCES, VISITOR_STATEMENTS } from "./monster-codex-data.ts";
import type {
  EventFlags,
  GameState,
  MonsterCodexEntryId,
  MonsterCodexEntryState,
  MonsterKnowledgeSourceId,
  VisitorStatementId,
  VisitorStatementRecord,
} from "./types.ts";

const validDay = (value: unknown, fallback: number, ceiling = fallback) => {
  const safeFallback = typeof fallback === "number" && Number.isFinite(fallback) ? Math.max(0, Math.trunc(fallback)) : 0;
  const safeCeiling = typeof ceiling === "number" && Number.isFinite(ceiling) ? Math.max(0, Math.trunc(ceiling)) : safeFallback;
  const resolved = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : safeFallback;
  return Math.min(safeCeiling, Math.max(0, resolved));
};

export function getVisitorStatementDefinition(statementId: VisitorStatementId) {
  return VISITOR_STATEMENTS.find((entry) => entry.id === statementId) ?? null;
}

export function getMonsterCodexDefinition(entryId: MonsterCodexEntryId) {
  return MONSTER_CODEX.find((entry) => entry.id === entryId) ?? null;
}

export function getMonsterKnowledgeSourceDefinition(sourceId: MonsterKnowledgeSourceId) {
  return MONSTER_KNOWLEDGE_SOURCES.find((entry) => entry.id === sourceId) ?? null;
}

export function getMonsterSourceWeight(sourceId: MonsterKnowledgeSourceId): number {
  const source = getMonsterKnowledgeSourceDefinition(sourceId);
  return source ? MONSTER_CERTAINTY_WEIGHTS[source.certainty] : 0;
}

export function getMonsterCodexState(state: Pick<GameState, "monsterCodex">, entryId: MonsterCodexEntryId) {
  return state.monsterCodex.find((entry) => entry.entryId === entryId) ?? null;
}

export function normalizeVisitorStatements(value: unknown, currentDay: number): VisitorStatementRecord[] {
  if (!Array.isArray(value)) return [];
  const records: VisitorStatementRecord[] = [];
  for (const definition of VISITOR_STATEMENTS) {
    const saved = value.find((entry) => entry && typeof entry === "object" && (entry as Partial<VisitorStatementRecord>).statementId === definition.id) as Partial<VisitorStatementRecord> | undefined;
    if (!saved) continue;
    records.push({
      statementId: definition.id,
      guestId: definition.guestId,
      questionId: definition.questionId,
      recordedDay: validDay(saved.recordedDay, currentDay, currentDay),
      assessment: definition.assessment,
    });
  }
  return records;
}

function sourceIdsFromStatements(statements: VisitorStatementRecord[]): MonsterKnowledgeSourceId[] {
  return statements.flatMap((record) => {
    const definition = getVisitorStatementDefinition(record.statementId);
    return definition ? [definition.knowledgeSourceId] : [];
  });
}

export function normalizeMonsterCodex(value: unknown, statements: VisitorStatementRecord[], flags: EventFlags, currentDay: number): MonsterCodexEntryState[] {
  const raw = Array.isArray(value) ? value : [];
  const migratedSources: MonsterKnowledgeSourceId[] = [
    ...(flags.room_207_case_correctly_solved === true ? ["ROOM_207_MONSTER_CONCLUSION" as const] : []),
    ...(flags.survivor_testimonies_verified === true ? ["RADIO_SURVIVOR_CHORUS" as const] : []),
    ...(flags.father_signal_traced === true ? ["FATHER_RELAY_TRACE" as const] : []),
  ];
  const savedSources = raw.flatMap((entry) => entry && typeof entry === "object" && Array.isArray((entry as Partial<MonsterCodexEntryState>).sourceIds) ? (entry as Partial<MonsterCodexEntryState>).sourceIds! : []);
  const validSources = MONSTER_KNOWLEDGE_SOURCES.filter((source) => getMonsterCodexDefinition(source.entryId)?.insights.some((insight) => insight.id === source.insightId));
  const knownSources = new Set(validSources.map((source) => source.id));
  const sourceIds = [...new Set([...savedSources, ...sourceIdsFromStatements(statements), ...migratedSources])].filter((id): id is MonsterKnowledgeSourceId => knownSources.has(id));
  return MONSTER_CODEX.flatMap((definition) => {
    const entrySources = sourceIds.filter((sourceId) => validSources.find((source) => source.id === sourceId)?.entryId === definition.id);
    if (!entrySources.length) return [];
    const insightIds = [...new Set(entrySources.flatMap((sourceId) => {
      const source = validSources.find((candidate) => candidate.id === sourceId);
      return source ? [source.insightId] : [];
    }))];
    const savedEntries = raw.filter((entry) => entry && typeof entry === "object" && (entry as Partial<MonsterCodexEntryState>).entryId === definition.id);
    const savedDays = savedEntries.map((entry) => validDay((entry as Partial<MonsterCodexEntryState>).updatedDay, 0, currentDay));
    const statementDays = statements.filter((record) => {
      const sourceId = getVisitorStatementDefinition(record.statementId)?.knowledgeSourceId;
      return Boolean(sourceId && entrySources.includes(sourceId));
    }).map((record) => record.recordedDay);
    const updatedDay = Math.max(0, ...statementDays, ...savedDays, savedEntries.length || statementDays.length ? 0 : validDay(undefined, currentDay, currentDay));
    return [{ entryId: definition.id, sourceIds: entrySources, insightIds, updatedDay }];
  });
}

export function applyMonsterKnowledgeSource(state: GameState, sourceId: MonsterKnowledgeSourceId): GameState {
  const source = MONSTER_KNOWLEDGE_SOURCES.find((entry) => entry.id === sourceId);
  const definition = source ? getMonsterCodexDefinition(source.entryId) : null;
  const insight = source && definition ? definition.insights.find((entry) => entry.id === source.insightId) : null;
  if (!source || !definition || !insight) return state;
  const current = getMonsterCodexState(state, source.entryId);
  const alreadyHasSource = current?.sourceIds.includes(sourceId) ?? false;
  const alreadyHasInsight = current?.insightIds.includes(source.insightId) ?? false;
  if (alreadyHasSource && alreadyHasInsight) return state;
  const nextEntry: MonsterCodexEntryState = {
    entryId: source.entryId,
    sourceIds: alreadyHasSource ? current!.sourceIds : [...(current?.sourceIds ?? []), sourceId],
    insightIds: [...new Set([...(current?.insightIds ?? []), source.insightId])],
    updatedDay: state.day,
  };
  return {
    ...state,
    monsterCodex: [...state.monsterCodex.filter((entry) => entry.entryId !== source.entryId), nextEntry],
    eventHistory: alreadyHasSource ? state.eventHistory : [...state.eventHistory, { day: state.day, type: "EVENT", message: `MONSTER CODEX 갱신 · ${definition.name} · ${insight.name}` }],
  };
}

export function recordVisitorStatement(state: GameState, guestId: string, questionId: string, inspectedItemIds: string[]): { state: GameState; record: VisitorStatementRecord | null; message: string | null } {
  const definition = VISITOR_STATEMENTS.find((entry) => entry.guestId === guestId && entry.questionId === questionId);
  if (!definition || (definition.requiredInspectedItemId && !inspectedItemIds.includes(definition.requiredInspectedItemId))) return { state, record: null, message: null };
  const existing = state.visitorStatements.find((record) => record.statementId === definition.id);
  if (existing) return { state: applyMonsterKnowledgeSource(state, definition.knowledgeSourceId), record: existing, message: definition.finding };
  const record: VisitorStatementRecord = { statementId: definition.id, guestId, questionId, recordedDay: state.day, assessment: definition.assessment };
  const assessmentLabel = definition.assessment === "CONTRADICTED" ? "진술 모순" : definition.assessment === "CORROBORATED" ? "진술 확인" : "진술 기록";
  const withStatement: GameState = {
    ...state,
    visitorStatements: [...state.visitorStatements, record],
    eventHistory: [...state.eventHistory, { day: state.day, type: "EVENT", message: `${assessmentLabel} · ${definition.claim}` }],
  };
  return { state: applyMonsterKnowledgeSource(withStatement, definition.knowledgeSourceId), record, message: definition.finding };
}

export function hasMonsterCountermeasure(state: Pick<GameState, "monsterCodex">, entryId: MonsterCodexEntryId): boolean {
  const definition = getMonsterCodexDefinition(entryId);
  const entry = getMonsterCodexState(state, entryId);
  if (!definition || !entry) return false;
  const validSourceCount = entry.sourceIds.filter((sourceId) => getMonsterKnowledgeSourceDefinition(sourceId)?.entryId === entryId).length;
  return validSourceCount >= definition.minimumSources && getMonsterEvidenceScore(state, entryId) >= definition.tacticalThreshold;
}

export function getMonsterEvidenceScore(state: Pick<GameState, "monsterCodex">, entryId: MonsterCodexEntryId): number {
  const entry = getMonsterCodexState(state, entryId);
  if (!entry) return 0;
  return entry.sourceIds.reduce((score, sourceId) => {
    const source = getMonsterKnowledgeSourceDefinition(sourceId);
    return score + (source?.entryId === entryId ? getMonsterSourceWeight(sourceId) : 0);
  }, 0);
}
