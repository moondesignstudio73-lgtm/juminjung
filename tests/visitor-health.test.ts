import test from "node:test";
import assert from "node:assert/strict";
import { createNormalVisitor } from "../game/normal-visitor-data.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { applyStoryChoice } from "../game/story-choice-manager.ts";
import { STORY_CHOICE_EVENTS } from "../game/story-choice-data.ts";
import { prepareDailyVisitorQueue, recordVisitorDecision } from "../game/visitor-queue-manager.ts";
import { RUTH_FIELD_NURSE_NETWORK } from "../game/visitor-health-data.ts";
import { applyVisitorArrivalMedicalSupport, getArrivalMedicalSupportHistoryEvent } from "../game/visitor-health-manager.ts";

function ruthResolutionState() {
  const state=createInitialGameState();
  state.day=12;
  state.phase="desk";
  state.visitorSeed=77;
  state.worldState="COLLAPSE";
  state.reputations.community=50;
  state.flags.thomas_radio_grid=true;
  state.guests=state.guests.map((guest)=>guest.id==="ruth"?{
    ...guest,status:"STAYING" as const,currentRoomNumber:301,checkedInDay:5,remainingNights:1,
    eventChain:guest.eventChain.map((event)=>event.stage==="CONFLICT"?{...event,completed:true}:event),
  }:{...guest,arrivalDay:999,arrivalDayRange:[999,999] as [number,number]});
  return state;
}

const supported = (infectionState:"HEALTHY"|"INJURED"|"SICK"|"INFECTED_SUSPECTED") => {
  const guest={...createNormalVisitor(77,13,3),infectionState,health:70,conditionLabel:infectionState};
  return applyVisitorArrivalMedicalSupport(guest,{ruth_field_nurse:true},13);
};

test("루스 순회 간호대는 SICK 발열과 Health만 안정시키고 처치 출처를 남긴다",()=>{
  const guest=supported("SICK");
  assert.equal(guest.infectionState,"HEALTHY");
  assert.equal(guest.health,70+RUTH_FIELD_NURSE_NETWORK.healthBonus);
  assert.equal(guest.conditionLabel,`${RUTH_FIELD_NURSE_NETWORK.stabilizedLabel} · ${RUTH_FIELD_NURSE_NETWORK.shortLabel}`);
  assert.deepEqual({treated:guest.storyFlags.ruth_field_nurse_treated,day:guest.storyFlags.ruth_field_nurse_treated_day,recovered:guest.storyFlags.ruth_field_nurse_health_recovered,stabilized:guest.storyFlags.ruth_field_nurse_sickness_stabilized},{treated:true,day:13,recovered:8,stabilized:true});
  assert.equal(getArrivalMedicalSupportHistoryEvent(guest,13),`DAY 13 · ${RUTH_FIELD_NURSE_NETWORK.historyLabel} · Health +8 · ${RUTH_FIELD_NURSE_NETWORK.stabilizedLabel}`);
});

test("순회 간호대는 INJURED와 INFECTED_SUSPECTED의 분류를 유지하며 Health를 회복하고 중복 처치하지 않는다",()=>{
  for(const infectionState of ["INJURED","INFECTED_SUSPECTED"] as const){
    const guest=supported(infectionState);
    assert.equal(guest.infectionState,infectionState);
    assert.equal(guest.health,78);
    assert.match(guest.conditionLabel,new RegExp(infectionState));
    assert.match(guest.conditionLabel,new RegExp(RUTH_FIELD_NURSE_NETWORK.shortLabel));
    assert.deepEqual(applyVisitorArrivalMedicalSupport(guest,{ruth_field_nurse:true},13),guest);
  }
});

test("Ruth 전용 플래그 없이는 공유 medical_network_active만으로 신규 방문자를 바꾸지 않는다",()=>{
  const guest=createNormalVisitor(77,13,3);
  assert.deepEqual(applyVisitorArrivalMedicalSupport(guest,{medical_network_active:true},13),guest);
  assert.deepEqual(applyVisitorArrivalMedicalSupport(guest,{ruth_care_team:true},13),guest);
});

test("실제 Ruth 결말은 오늘 큐를 보존하고 다음 DAY 신규 NORMAL 방문자를 사전 처치한다",()=>{
  const current=prepareDailyVisitorQueue(ruthResolutionState());
  const currentQueueBefore=current.dailyVisitorQueue.map((id)=>current.guests.find((guest)=>guest.id===id));
  const resolved=applyStoryChoice(current,"ruth-home","field_nurse").state;
  assert.deepEqual(resolved.dailyVisitorQueue.map((id)=>resolved.guests.find((guest)=>guest.id===id)),currentQueueBefore);
  assert.ok(currentQueueBefore.every((guest)=>guest?.storyFlags.ruth_field_nurse_treated!==true));

  const nextBase={...resolved,day:13,flags:{...resolved.flags,ruth_field_nurse:false}};
  const baseline=prepareDailyVisitorQueue(nextBase);
  const withNetwork=prepareDailyVisitorQueue({...nextBase,flags:{...nextBase.flags,ruth_field_nurse:true}});
  assert.deepEqual(withNetwork.dailyVisitorQueue,baseline.dailyVisitorQueue);
  const baselineGuests=baseline.dailyVisitorQueue.map((id)=>baseline.guests.find((guest)=>guest.id===id)!);
  const treatedGuests=withNetwork.dailyVisitorQueue.map((id)=>withNetwork.guests.find((guest)=>guest.id===id)!);
  assert.deepEqual(baselineGuests.map((guest)=>guest.infectionState),["HEALTHY","INJURED","HEALTHY","SICK","HEALTHY","INFECTED_SUSPECTED"]);
  for(let index=0;index<treatedGuests.length;index+=1){
    const before=baselineGuests[index];
    const after=treatedGuests[index];
    assert.equal(after.health,Math.min(100,before.health+RUTH_FIELD_NURSE_NETWORK.healthBonus));
    assert.equal(after.infectionState,before.infectionState==="SICK"?"HEALTHY":before.infectionState);
    assert.equal(after.storyFlags.ruth_field_nurse_treated,true);
  }
  assert.match(withNetwork.eventHistory.at(-1)?.message??"",/루스 순회 간호대 · 새 방문자 6명 사전 처치 · 발열 안정 1명/);

  const first=treatedGuests[0];
  const recorded=recordVisitorDecision(withNetwork,first.id,"ACCEPTED",204,{food:1});
  const history=recorded.visitorHistory.find((entry)=>entry.visitorId===first.id)!;
  assert.match(history.events[0],/루스 순회 간호대 사전 처치/);
  assert.match(history.events[1],/CHECK IN · 204호/);
  const restored=restoreGameState(serializeGameState(recorded));
  assert.equal(restored.flags.ruth_field_nurse,true);
  assert.equal(restored.guests.find((guest)=>guest.id===first.id)?.storyFlags.ruth_field_nurse_treated,true);
  assert.deepEqual(restored.visitorHistory.find((entry)=>entry.visitorId===first.id)?.events,history.events);
});

test("Ruth의 두 결말은 전용 플래그만 교체하고 다른 주민의 공유 의료 상태를 보존한다",()=>{
  const shared={medical_network_active:true,vulnerable_survivors_protected:true};
  const careStart=ruthResolutionState();
  Object.assign(careStart.flags,shared,{ruth_field_nurse:true});
  const care=applyStoryChoice(careStart,"ruth-home","care_team").state;
  assert.deepEqual({care:care.flags.ruth_care_team,field:care.flags.ruth_field_nurse,medical:care.flags.medical_network_active,vulnerable:care.flags.vulnerable_survivors_protected},{care:true,field:false,medical:true,vulnerable:true});

  const fieldStart=ruthResolutionState();
  Object.assign(fieldStart.flags,shared,{ruth_care_team:true});
  const field=applyStoryChoice(fieldStart,"ruth-home","field_nurse").state;
  assert.deepEqual({care:field.flags.ruth_care_team,field:field.flags.ruth_field_nurse,medical:field.flags.medical_network_active,vulnerable:field.flags.vulnerable_survivors_protected},{care:false,field:true,medical:true,vulnerable:true});
});

test("Ruth 결말 선택 문구는 양쪽의 지속 효과와 포기 비용을 모두 공개한다",()=>{
  const event=STORY_CHOICE_EVENTS.find((candidate)=>candidate.id==="ruth-home")!;
  const care=event.choices.find((choice)=>choice.id==="care_team")!;
  const field=event.choices.find((choice)=>choice.id==="field_nurse")!;
  for(const term of ["Trust +15","Stress -10","Health +3","Stress -4","다음 DAY","Health +8","SICK 발열 안정","Monster Threat +5","되돌릴 수 없습니다"]) assert.ok(care.description.includes(term),term);
  for(const term of ["Trust +8","Monster Threat +5","refugee 평판 +8","다음 DAY","NORMAL","Health +8","SICK 상태는 HEALTHY","Visitor History","오늘의 방문자 큐는 바뀌지 않고","INJURED와 INFECTED_SUSPECTED도 Health +8 응급처치","상태 분류는 그대로","Health +3","Stress -4","되돌릴 수 없습니다"]) assert.ok(field.description.includes(term),term);
});