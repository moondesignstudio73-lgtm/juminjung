import test from "node:test";
import assert from "node:assert/strict";
import { EVIDENCE_CATALOG, INVESTIGATION_CASES } from "../game/investigation-data.ts";
import {
  assessInvestigationConclusion, canConcludeInvestigationCase, canInvestigateCasePoint,
  concludeInvestigationCase, getInvestigationCaseState, investigateCasePoint, openInvestigationCase,
} from "../game/investigation-manager.ts";
import { getDailyObjectives } from "../game/daily-survival-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";

function openRoom207Case() {
  const state=createInitialGameState();
  state.day=12;
  state.phase="management";
  state.flags.room_207_investigated=true;
  return openInvestigationCase(state,"ROOM_207");
}

function collectMonsterEvidence() {
  let state=openRoom207Case();
  state=investigateCasePoint(state,"ROOM_207","ROOM_207_DOOR").state;
  state=investigateCasePoint(state,"ROOM_207","ROOM_207_WINDOW").state;
  state=investigateCasePoint(state,"ROOM_207","ROOM_207_FLOOR").state;
  return state;
}

test("207호 사건 데이터는 네 조사 지점과 고유 증거를 하나의 사건 정의에서 연결한다",()=>{
  const definition=INVESTIGATION_CASES.find((entry)=>entry.id==="ROOM_207")!;
  assert.equal(definition.points.length,4);
  assert.equal(new Set(definition.points.map((point)=>point.evidenceId)).size,4);
  assert.deepEqual(new Set(definition.points.map((point)=>point.evidenceId)),new Set(EVIDENCE_CATALOG.map((evidence)=>evidence.id)));
  assert.equal(definition.correctConclusionId,"MONSTER_ENTRY");
});

test("207호 야간 조사 이후 사건 파일은 한 번만 열리고 개시 기록을 남긴다",()=>{
  const state=openRoom207Case();
  const reopened=openInvestigationCase(state,"ROOM_207");
  assert.equal(state.investigationCases.length,1);
  assert.equal(reopened,state);
  assert.match(state.eventHistory.at(-1)!.message,/조사 사건 개시 · 207호/);
});

test("현장 조사에는 1 AP가 들고 증거·스토리 플래그·호텔 기록이 함께 남는다",()=>{
  const state=openRoom207Case();
  const result=investigateCasePoint(state,"ROOM_207","ROOM_207_DOOR");
  assert.equal(result.ok,true);
  assert.equal(result.state.actionPoints,state.actionPoints-1);
  assert.deepEqual(getInvestigationCaseState(result.state,"ROOM_207")?.collectedEvidenceIds,["ROOM_207_INTERIOR_KEY"]);
  assert.equal(result.state.flags.evidence_room_207_interior_key,true);
  assert.match(result.state.eventHistory.at(-1)!.message,/문 안쪽의 황동 열쇠/);
});

test("같은 지점은 중복 조사할 수 없고 AP가 없으면 새 지점도 조사할 수 없다",()=>{
  let state=openRoom207Case();
  state=investigateCasePoint(state,"ROOM_207","ROOM_207_DOOR").state;
  assert.equal(canInvestigateCasePoint(state,"ROOM_207","ROOM_207_DOOR"),false);
  assert.equal(investigateCasePoint(state,"ROOM_207","ROOM_207_DOOR").ok,false);
  state={...state,actionPoints:0};
  assert.equal(canInvestigateCasePoint(state,"ROOM_207","ROOM_207_WINDOW"),false);
  assert.equal(investigateCasePoint(state,"ROOM_207","ROOM_207_WINDOW").ok,false);
});

test("증거 세 개 전에는 결론을 내릴 수 없고 핵심 세 증거는 괴물 침입 결론을 지지한다",()=>{
  let state=openRoom207Case();
  state=investigateCasePoint(state,"ROOM_207","ROOM_207_DOOR").state;
  state=investigateCasePoint(state,"ROOM_207","ROOM_207_WINDOW").state;
  assert.equal(canConcludeInvestigationCase(state,"ROOM_207"),false);
  assert.equal(concludeInvestigationCase(state,"ROOM_207","MONSTER_ENTRY").ok,false);
  state={...state,actionPoints:1};
  state=investigateCasePoint(state,"ROOM_207","ROOM_207_FLOOR").state;
  const caseState=getInvestigationCaseState(state,"ROOM_207")!;
  assert.equal(canConcludeInvestigationCase(state,"ROOM_207"),true);
  assert.equal(assessInvestigationConclusion(caseState,"ROOM_207","MONSTER_ENTRY"),"SUPPORTED");
  assert.equal(assessInvestigationConclusion(caseState,"ROOM_207","HUMAN_ATTACK"),"CONTRADICTED");
});

test("괴물 침입 결론은 실제 단서·평판·보안·위협과 사건 상태를 함께 갱신한다",()=>{
  const state=collectMonsterEvidence();
  const result=concludeInvestigationCase(state,"ROOM_207","MONSTER_ENTRY");
  assert.equal(result.ok,true);
  assert.equal(result.state.flags.monster_room_entry_clue,true);
  assert.equal(result.state.flags.room_207_monster_entry_concluded,true);
  assert.equal(result.state.flags.room_207_case_correctly_solved,true);
  assert.equal(result.state.hotelStats.security,state.hotelStats.security+2);
  assert.equal(result.state.reputations.community,state.reputations.community+3);
  assert.equal(result.state.flags.monster_threat,0);
  assert.deepEqual({status:getInvestigationCaseState(result.state,"ROOM_207")?.status,conclusion:getInvestigationCaseState(result.state,"ROOM_207")?.conclusionId},{status:"SOLVED",conclusion:"MONSTER_ENTRY"});
});

test("증거와 모순되는 내부 공격 결론은 괴물 단서를 만들지 않고 공동체 신뢰를 잃는다",()=>{
  const state=collectMonsterEvidence();
  state.reputations.community=10;
  const result=concludeInvestigationCase(state,"ROOM_207","HUMAN_ATTACK");
  assert.equal(result.ok,true);
  assert.equal(result.state.flags.monster_room_entry_clue,undefined);
  assert.equal(result.state.flags.room_207_human_attack_concluded,true);
  assert.equal(result.state.reputations.community,state.reputations.community-5);
  assert.match(result.message,/증거 모순/);
});

test("핵심 잔류물 없이 괴물 결론을 고르면 추정은 기록되지만 확정 단서는 열리지 않는다",()=>{
  let state=openRoom207Case();
  state=investigateCasePoint(state,"ROOM_207","ROOM_207_DOOR").state;
  state=investigateCasePoint(state,"ROOM_207","ROOM_207_WINDOW").state;
  state=investigateCasePoint(state,"ROOM_207","ROOM_207_LUGGAGE").state;
  const result=concludeInvestigationCase(state,"ROOM_207","MONSTER_ENTRY");
  assert.equal(result.ok,true);
  assert.equal(result.state.flags.room_207_monster_entry_concluded,true);
  assert.equal(result.state.flags.monster_room_entry_clue,undefined);
  assert.equal(result.state.flags.room_207_case_correctly_solved,undefined);
  assert.match(result.message,/미확인/);
});

test("Save v15는 조사 진척과 증거를 보존하고 결론 뒤 재조사를 막는다",()=>{
  let state=collectMonsterEvidence();
  state=concludeInvestigationCase(state,"ROOM_207","MONSTER_ENTRY").state;
  const restored=restoreGameState(serializeGameState(state));
  assert.equal(restored.version,15);
  assert.deepEqual(restored.investigationCases,state.investigationCases);
  assert.equal(canInvestigateCasePoint(restored,"ROOM_207","ROOM_207_LUGGAGE"),false);
});

test("v12의 기존 207호 조사 플래그는 증거를 날조하지 않고 열린 사건 파일로 이관된다",()=>{
  const legacy=JSON.parse(serializeGameState(createInitialGameState()));
  legacy.version=12;
  legacy.day=14;
  legacy.flags.room_207_investigated=true;
  delete legacy.investigationCases;
  const restored=restoreGameState(JSON.stringify(legacy));
  assert.equal(restored.version,15);
  assert.deepEqual(restored.investigationCases,[{caseId:"ROOM_207",status:"OPEN",openedDay:14,inspectedPointIds:[],collectedEvidenceIds:[],conclusionId:null,resolvedDay:null}]);
});

test("손상 저장은 조사하지 않은 증거·조기 결론을 제거하고 유효 증거 플래그를 복원한다",()=>{
  let state=openRoom207Case();
  state=investigateCasePoint(state,"ROOM_207","ROOM_207_DOOR").state;
  delete state.flags.evidence_room_207_interior_key;
  const damaged=JSON.parse(serializeGameState(state));
  damaged.investigationCases[0].collectedEvidenceIds=["ROOM_207_BLACK_RESIDUE","ROOM_207_WINDOW_TRACE","ROOM_207_GUEST_LEDGER"];
  damaged.investigationCases[0].conclusionId="MONSTER_ENTRY";
  damaged.investigationCases[0].openedDay="not-a-day";
  const restored=restoreGameState(JSON.stringify(damaged));
  assert.deepEqual(restored.investigationCases,[{caseId:"ROOM_207",status:"INVESTIGATING",openedDay:12,inspectedPointIds:["ROOM_207_DOOR"],collectedEvidenceIds:["ROOM_207_INTERIOR_KEY"],conclusionId:null,resolvedDay:null}]);
  assert.equal(restored.flags.evidence_room_207_interior_key,true);
});

test("열린 사건은 오늘의 추천 목표로 나타나고 결론 뒤에는 사라진다",()=>{
  let state=openRoom207Case();
  assert.ok(getDailyObjectives(state).some((objective)=>objective.id==="investigation_room_207"&&objective.description.includes("0/4")));
  state=collectMonsterEvidence();
  state=concludeInvestigationCase(state,"ROOM_207","MONSTER_ENTRY").state;
  assert.equal(getDailyObjectives(state).some((objective)=>objective.id==="investigation_room_207"),false);
});
