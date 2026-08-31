import test from "node:test";
import assert from "node:assert/strict";
import { createGuests } from "../game/guest-data.ts";
import { createNormalVisitor, NORMAL_VISITOR_JOBS } from "../game/normal-visitor-data.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import {
  advanceDailyVisitorQueue, getCurrentQueuedVisitor, getDailyVisitorCount, getEligibleMainVisitors, getMainVisitorChance,
  hasPendingDailyVisitors, prepareDailyVisitorQueue, recordVisitorDecision, selectMainVisitor,
} from "../game/visitor-queue-manager.ts";

const dayState = (day=1,seed=12345) => {
  const state=createInitialGameState();
  state.day=day; state.phase="desk"; state.visitorSeed=seed; state.visitorQueueDay=0; state.dailyVisitorQueue=[]; state.dailyVisitorIndex=0;
  return state;
};

test("20명 고유 인물은 MAIN·스토리 체류 계약을 공유한다",()=>{
  const guests=createGuests();
  assert.ok(guests.every((guest)=>guest.npcType==="MAIN"&&!guest.generated&&guest.storyLockedResident&&guest.residency==="STORY_LOCKED"));
  assert.ok(guests.every((guest)=>Object.values(guest.skills).every((value)=>value>=0&&value<=100)));
});

test("일반 방문자는 같은 세이브 시드·DAY·슬롯에서 완전히 동일하게 생성된다",()=>{
  assert.deepEqual(createNormalVisitor(991,7,2),createNormalVisitor(991,7,2));
  assert.notEqual(createNormalVisitor(991,7,2).id,createNormalVisitor(991,7,3).id);
});

test("일반 방문자의 연령과 핵심 직업 능력은 직업 데이터 하한을 지킨다",()=>{
  for (let slot=0;slot<80;slot+=1) {
    const guest=createNormalVisitor(3321,12,slot);
    const role=guest.role.replace(/^숙련 /,"");
    const profile=NORMAL_VISITOR_JOBS.find((entry)=>entry.role===role)!;
    assert.ok(profile,role);
    assert.ok(guest.age>=profile.minAge&&guest.age<=profile.maxAge,`${role} ${guest.age}`);
    assert.equal(guest.npcType,"NORMAL");
    assert.ok(guest.baseTraits.length>=1&&guest.baseTraits.length<=3);
    assert.ok(Object.values(guest.skills).every((value)=>value>=0&&value<=100));
  }
});

test("가중 일일 방문 수는 2~6명이며 3~4명이 가장 흔하다",()=>{
  const counts:number[]=[];
  for (let seed=1;seed<=300;seed+=1) counts.push(getDailyVisitorCount(dayState(5,seed)));
  assert.ok(counts.every((count)=>count>=2&&count<=6));
  const common=counts.filter((count)=>count===3||count===4).length;
  assert.ok(common>counts.length/2);
});

test("붕괴·평판·라디오는 방문을 늘리고 고위협·폭풍은 같은 계산에서 줄인다",()=>{
  const base=dayState(12,81);
  const baseCount=getDailyVisitorCount(base);
  const attractive={...base,worldState:"COLLAPSE" as const,reputations:{...base.reputations,community:50},flags:{...base.flags,lily_public_broadcast:true}};
  const hostile={...base,flags:{...base.flags,monster_threat:90,severe_storm:true}};
  assert.equal(getDailyVisitorCount(attractive),Math.min(6,baseCount+3));
  assert.equal(getDailyVisitorCount(hostile),Math.max(2,baseCount-2));
});

test("하루 큐는 일반 손님 슬롯과 최대 한 명의 MAIN 방문자로 구성된다",()=>{
  for (let seed=1;seed<=80;seed+=1) {
    const prepared=prepareDailyVisitorQueue(dayState(18,seed));
    assert.ok(prepared.dailyVisitorQueue.length>=2&&prepared.dailyVisitorQueue.length<=6);
    const queued=prepared.dailyVisitorQueue.map((id)=>prepared.guests.find((guest)=>guest.id===id)!);
    assert.ok(queued.every(Boolean));
    assert.ok(queued.filter((guest)=>guest.npcType==="MAIN").length<=1);
  }
});

test("준비된 당일 큐는 다시 호출하거나 저장 복원해도 순서와 생성 데이터가 바뀌지 않는다",()=>{
  const prepared=prepareDailyVisitorQueue(dayState(9,78211));
  const repeated=prepareDailyVisitorQueue({...prepared,visitorSeed:1});
  assert.deepEqual(repeated.dailyVisitorQueue,prepared.dailyVisitorQueue);
  const restored=restoreGameState(serializeGameState(prepared));
  assert.deepEqual(restored.dailyVisitorQueue,prepared.dailyVisitorQueue);
  assert.deepEqual(restored.dailyVisitorQueue.map((id)=>restored.guests.find((guest)=>guest.id===id)),prepared.dailyVisitorQueue.map((id)=>prepared.guests.find((guest)=>guest.id===id)));
});

test("큐 진행 위치는 한 명씩 전진하고 마지막 방문자 뒤에만 종료된다",()=>{
  let state=prepareDailyVisitorQueue(dayState(4,77));
  const first=getCurrentQueuedVisitor(state)!;
  assert.equal(first.id,state.dailyVisitorQueue[0]);
  for (let index=0;index<state.dailyVisitorQueue.length;index+=1) {
    assert.equal(hasPendingDailyVisitors(state),true);
    state=advanceDailyVisitorQueue(state);
    assert.equal(state.dailyVisitorIndex,index+1);
  }
  assert.equal(hasPendingDailyVisitors(state),false);
  assert.equal(getCurrentQueuedVisitor(state),null);
});

test("Visitor History는 수용·거절·객실·지급 물자·최종 상태를 방문자별로 누적한다",()=>{
  let state=prepareDailyVisitorQueue(dayState(3,818));
  const guest=getCurrentQueuedVisitor(state)!;
  state=recordVisitorDecision(state,guest.id,"ACCEPTED",204,{food:3,parts:1});
  state.day=10;
  state=recordVisitorDecision(state,guest.id,"REFUSED",null);
  const history=state.visitorHistory.find((entry)=>entry.visitorId===guest.id)!;
  assert.deepEqual({first:history.firstVisitDay,last:history.lastVisitDay,accepted:history.acceptedCount,refused:history.refusedCount,rooms:history.roomsStayed,paid:history.itemsPaid,final:history.finalState},{first:3,last:10,accepted:1,refused:1,rooms:[204],paid:{food:3,parts:1},final:"REFUSED"});
  assert.equal(history.events.length,2);
});

test("메인 NPC 출현 보정은 조건 충족 후 대기할수록 증가하며 하루 선택은 한 명뿐이다",()=>{
  const early=dayState(1,4);
  const late=dayState(20,4);
  assert.ok(getMainVisitorChance(late)>getMainVisitorChance(early));
  let selected=null;
  for (let seed=1;seed<200&&!selected;seed+=1) selected=selectMainVisitor(dayState(20,seed));
  assert.ok(selected);
  assert.equal(selected?.npcType,"MAIN");
});

test("Daniel과 Hayes의 MAIN 후보 조건은 선행 인물이 실제로 등장해야 열린다",()=>{
  const state=dayState(20,9);
  assert.equal(getEligibleMainVisitors(state).some((guest)=>guest.id==="daniel"||guest.id==="hayes"),false);
  state.guests=state.guests.map((guest)=>guest.id==="mia"||guest.id==="owen"?{...guest,status:"REFUSED" as const}:guest);
  const ids=getEligibleMainVisitors(state).map((guest)=>guest.id);
  assert.ok(ids.includes("daniel")); assert.ok(ids.includes("hayes"));
});

test("재방문 가능한 일반 손님은 쿨다운 이후 새 일반 슬롯을 확률적으로 대체한다",()=>{
  const returning=createNormalVisitor(7,1,0);
  returning.status="CHECKED_OUT"; returning.checkedInDay=1; returning.storyFlags.next_revisit_day=8;
  let found=false;
  for (let seed=1;seed<=200&&!found;seed+=1) {
    const state=dayState(8,seed); state.guests=[...state.guests,returning];
    found=prepareDailyVisitorQueue(state).dailyVisitorQueue.includes(returning.id);
  }
  assert.equal(found,true);
});

test("이전 저장에서 복원된 거절 손님도 명시적 재방문 날짜가 없어도 다시 후보가 된다",()=>{
  const returning=createNormalVisitor(19,1,0);
  returning.status="REFUSED";
  returning.storyFlags.last_revisit_refused_day=2;
  let found=false;
  for (let seed=1;seed<=300&&!found;seed+=1) {
    const state=dayState(6,seed); state.guests=[...state.guests,returning];
    found=prepareDailyVisitorQueue(state).dailyVisitorQueue.includes(returning.id);
  }
  assert.equal(found,true);
});

test("v10 저장은 v11 큐 기본값으로 이관되고 이후 생성된 큐를 저장한다",()=>{
  const raw=JSON.parse(serializeGameState(dayState(6,456)));
  raw.version=10; delete raw.visitorQueueDay; delete raw.dailyVisitorQueue; delete raw.dailyVisitorIndex; delete raw.visitorHistory;
  raw.guests[0].status="REFUSED"; raw.guests[0].storyFlags.last_revisit_refused_day=2;
  const migrated=restoreGameState(JSON.stringify(raw));
  assert.equal(migrated.version,11); assert.deepEqual(migrated.dailyVisitorQueue,[]);
  assert.equal(migrated.visitorHistory.find((entry)=>entry.visitorId==="eleanor")?.finalState,"REFUSED");
  const prepared=prepareDailyVisitorQueue(migrated);
  assert.equal(restoreGameState(serializeGameState(prepared)).dailyVisitorQueue.length,prepared.dailyVisitorQueue.length);
});
