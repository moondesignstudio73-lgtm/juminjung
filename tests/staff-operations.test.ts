import test from "node:test";
import assert from "node:assert/strict";
import { recalculateRoomEffects } from "../game/aura-effect-manager.ts";
import { resolveDay } from "../game/day-manager.ts";
import { assignGuest } from "../game/room-manager.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import {
  assignStaffDuty, canRunScavengeMission, getNightStaffPlan, getScavengeChance,
  pruneStaffAssignments, runScavengeMission,
} from "../game/staff-operation-manager.ts";
import type { GameState } from "../game/types.ts";

const activate = (ids:string[],day=5):GameState => {
  const state=createInitialGameState();
  state.day=day; state.phase="management"; state.visitorSeed=7123;
  state.guests=state.guests.map((guest)=>ids.includes(guest.id)?{...guest,status:"STAYING" as const,currentRoomNumber:101+ids.indexOf(guest.id),remainingNights:5,checkedInDay:1}:guest);
  state.rooms=ids.reduce((rooms,id,index)=>assignGuest(rooms,101+index,id),state.rooms);
  state.rooms=recalculateRoomEffects(state.rooms,state.guests);
  return state;
};

test("근무 배치는 투숙 중인 생존자만 허용하고 한 사람을 두 역할에 중복 배치하지 않는다",()=>{
  let state=activate(["walter","samuel"]);
  state=assignStaffDuty(state,"MAINTENANCE","walter").state;
  state=assignStaffDuty(state,"SECURITY","walter").state;
  assert.deepEqual(state.staffAssignments,{SECURITY:"walter"});
  const invalid=assignStaffDuty(state,"MEDICAL","eleanor");
  assert.equal(invalid.ok,false);
  assert.equal(invalid.state,state);
});

test("손상 저장의 중복·퇴실 근무 배치는 역할 순서에 따라 하나만 복구한다",()=>{
  const state=activate(["walter"]);
  const assignments=pruneStaffAssignments({MAINTENANCE:"walter",SECURITY:"walter",MEDICAL:"eleanor"},state.guests);
  assert.deepEqual(assignments,{MAINTENANCE:"walter"});
});

test("탐색 성공률은 담당자의 탐색·작업·전투 능력과 임무 난이도를 함께 사용한다",()=>{
  const state=activate(["mia","hazel"]);
  const mia=state.guests.find((guest)=>guest.id==="mia")!;
  const hazel=state.guests.find((guest)=>guest.id==="hazel")!;
  assert.ok(getScavengeChance(hazel,"NEARBY_BLOCK")>getScavengeChance(mia,"NEARBY_BLOCK"));
  assert.ok(getScavengeChance(hazel,"NEARBY_BLOCK")>getScavengeChance(hazel,"FUEL_DEPOT"));
});

test("탐색 결과는 같은 세이브 시드·DAY·임무·담당자에서 결정적이며 하루 한 번만 실행된다",()=>{
  let state=activate(["hazel"]);
  state=assignStaffDuty(state,"SCAVENGE","hazel").state;
  const snapshot=restoreGameState(serializeGameState(state));
  const first=runScavengeMission(state,"ABANDONED_PHARMACY");
  const repeated=runScavengeMission(snapshot,"ABANDONED_PHARMACY");
  assert.equal(first.ok,true);
  assert.deepEqual(first.report,repeated.report);
  assert.equal(first.state.actionPoints,state.actionPoints-1);
  assert.equal(first.state.lastScavengeDay,state.day);
  assert.match(first.report!.message,/(식량|의약품|회수품 없음)/);
  assert.match(first.report!.message,/괴물 위협 \+\d+/);
  assert.doesNotMatch(first.report!.message,/\b(food|water|medicine|fuel|parts|security|Health|Threat)\b/);
  assert.equal(canRunScavengeMission(first.state,"NEARBY_BLOCK"),false);
  assert.equal(runScavengeMission(first.state,"NEARBY_BLOCK").ok,false);
});

test("위험한 탐색의 철수 결과는 정찰 담당자 부상과 Monster Threat 상승을 기록한다",()=>{
  let found:ReturnType<typeof runScavengeMission>|null=null;
  for (let seed=1;seed<=200&&!found;seed+=1) {
    let state=activate(["mia"]); state.visitorSeed=seed;
    const beforeHealth=state.guests.find((guest)=>guest.id==="mia")!.health;
    state=assignStaffDuty(state,"SCAVENGE","mia").state;
    const result=runScavengeMission(state,"FUEL_DEPOT");
    if (result.report?.outcome==="SETBACK") { assert.equal(result.state.guests.find((guest)=>guest.id==="mia")!.health,beforeHealth-12); found=result; }
  }
  assert.ok(found?.report);
  assert.equal(found!.report!.healthDelta,-12);
  assert.ok(Number(found!.state.flags.monster_threat)>0);
});

test("야간 근무 계획은 정비·경비·의료·주방 능력을 서로 다른 효과로 계산한다",()=>{
  const state=activate(["walter","samuel","eleanor","noah","mia"]);
  state.staffAssignments={MAINTENANCE:"walter",SECURITY:"samuel",MEDICAL:"eleanor",KITCHEN:"noah"};
  state.guests=state.guests.map((guest)=>guest.id==="mia"?{...guest,health:60,infectionState:"INJURED" as const}:guest);
  const plan=getNightStaffPlan(state);
  assert.deepEqual({food:plan.foodSaving,condition:plan.conditionDelta,security:plan.securityDelta,threat:plan.threatDelta,patient:plan.healingGuestId,healing:plan.healing},{food:2,condition:3,security:2,threat:-2,patient:"mia",healing:6});
  assert.equal(plan.results.length,4);
});

test("의료 담당자는 다른 환자가 없을 때 자신의 부상도 치료할 수 있다",()=>{
  const state=activate(["eleanor"]);
  state.staffAssignments={MEDICAL:"eleanor"};
  state.guests=state.guests.map((guest)=>guest.id==="eleanor"?{...guest,health:55,infectionState:"INJURED" as const}:guest);
  const plan=getNightStaffPlan(state);
  assert.deepEqual({patient:plan.healingGuestId,healing:plan.healing},{patient:"eleanor",healing:6});
});

test("야간 정산은 주방 절약과 근무 결과를 장부에 남기고 퇴실 담당자를 배치에서 제거한다",()=>{
  const state=activate(["walter","noah"]);
  state.phase="night";
  state.staffAssignments={MAINTENANCE:"walter",KITCHEN:"noah"};
  state.guests=state.guests.map((guest)=>guest.id==="walter"?{...guest,npcType:"NORMAL" as const,storyLockedResident:false,remainingNights:1}:guest);
  const resolved=resolveDay(state);
  assert.equal(resolved.lastDaySummary?.staffFoodSaving,2);
  assert.ok(resolved.lastDaySummary?.staffDutyResults?.some((result)=>result.dutyId==="MAINTENANCE"));
  assert.equal(resolved.staffAssignments.MAINTENANCE,undefined);
  assert.equal(resolved.staffAssignments.KITCHEN,"noah");
  assert.ok(resolved.eventHistory.some((entry)=>entry.message.includes("근무 정산")));
});

test("상태 상한·위협 하한에서는 적용되지 않은 근무 효과를 아침 장부에 기록하지 않는다",()=>{
  const state=activate(["walter","samuel"]);
  state.phase="night"; state.hotelStats.hotelCondition=100; state.hotelStats.security=100; state.flags.monster_threat=0;
  state.staffAssignments={MAINTENANCE:"walter",SECURITY:"samuel"};
  const resolved=resolveDay(state);
  assert.equal(resolved.lastDaySummary?.staffDutyResults?.some((result)=>result.dutyId==="MAINTENANCE"),false);
  assert.equal(resolved.lastDaySummary?.staffDutyResults?.some((result)=>result.dutyId==="SECURITY"),false);
  assert.equal(resolved.eventHistory.some((entry)=>entry.message.includes("근무 정산 · 월터")),false);
});

test("Save v14는 근무 배치와 마지막 탐색 보고서를 보존하고 v11에는 안전한 기본값을 준다",()=>{
  let state=activate(["hazel"]);
  state=assignStaffDuty(state,"SCAVENGE","hazel").state;
  state=runScavengeMission(state,"NEARBY_BLOCK").state;
  const restored=restoreGameState(serializeGameState(state));
  assert.equal(restored.version,14);
  assert.deepEqual(restored.staffAssignments,{SCAVENGE:"hazel"});
  assert.deepEqual(restored.lastScavengeReport,state.lastScavengeReport);
  const legacy=JSON.parse(serializeGameState(state)); legacy.version=11; delete legacy.staffAssignments; delete legacy.lastScavengeDay; delete legacy.lastScavengeReport;
  const migrated=restoreGameState(JSON.stringify(legacy));
  assert.deepEqual({version:migrated.version,assignments:migrated.staffAssignments,day:migrated.lastScavengeDay,report:migrated.lastScavengeReport},{version:14,assignments:{},day:0,report:null});
});
