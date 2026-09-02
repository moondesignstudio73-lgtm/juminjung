import test from "node:test";
import assert from "node:assert/strict";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { applyStoryChoice } from "../game/story-choice-manager.ts";
import { STORY_CHOICE_EVENTS } from "../game/story-choice-data.ts";
import { prepareDailyVisitorQueue, recordVisitorDecision } from "../game/visitor-queue-manager.ts";
import { STORY_VISITOR_ARRIVALS } from "../game/story-visitor-arrival-data.ts";

function samuelResolutionState() {
  const state=createInitialGameState();
  state.day=12;
  state.phase="desk";
  state.visitorSeed=97;
  state.worldState="COLLAPSE";
  state.reputations.community=50;
  state.guests=state.guests.map((guest)=>guest.id==="samuel"?{
    ...guest,status:"STAYING" as const,currentRoomNumber:301,checkedInDay:5,remainingNights:1,
    eventChain:guest.eventChain.map((event)=>event.stage==="CONFLICT"?{...event,completed:true}:event),
  }:{...guest,arrivalDay:999,arrivalDayRange:[999,999] as [number,number]});
  return state;
}

function familyResolutionState(guestId: "mia" | "daniel") {
  const state=createInitialGameState();
  state.day=12;
  state.phase="desk";
  state.visitorSeed=173;
  state.worldState="COLLAPSE";
  state.reputations.community=50;
  state.guests=state.guests.map((guest)=>guest.id===guestId?{
    ...guest,status:"STAYING" as const,currentRoomNumber:301,checkedInDay:5,remainingNights:1,
    eventChain:guest.eventChain.map((event)=>event.stage==="CONFLICT"?{...event,completed:true}:event),
  }:{...guest,arrivalDay:999,arrivalDayRange:[999,999] as [number,number]});
  return state;
}

test("가족 이동로를 만드는 두 실제 결말은 저장 후 같은 단일 프런트 방문을 연다",()=>{
  const producers=[
    {guestId:"mia" as const,eventId:"mia-family",choiceId:"reunite"},
    {guestId:"daniel" as const,eventId:"daniel-family",choiceId:"let_choose"},
  ];
  const declared=STORY_CHOICE_EVENTS.flatMap((event)=>event.choices
    .filter((choice)=>choice.effect.flags?.family_routes_complete===true)
    .map((choice)=>({eventId:event.id,choiceId:choice.id,arrivalId:choice.effect.scheduledVisitorArrival?.id})));
  assert.deepEqual(declared,producers.map(({eventId,choiceId})=>({eventId,choiceId,arrivalId:"family_route_survivor"})));

  for(const producer of producers){
    const current=prepareDailyVisitorQueue(familyResolutionState(producer.guestId));
    const currentQueue=[...current.dailyVisitorQueue];
    const resolved=applyStoryChoice(current,producer.eventId,producer.choiceId).state;
    assert.deepEqual(resolved.dailyVisitorQueue,currentQueue);
    assert.equal(resolved.flags.family_route_survivor_due_day,13);
    assert.equal(resolved.flags.family_route_survivor_arrived,false);

    const restored=restoreGameState(serializeGameState(resolved));
    const next=prepareDailyVisitorQueue({...restored,day:13});
    const routed=next.dailyVisitorQueue.map((id)=>next.guests.find((guest)=>guest.id===id)!).filter((guest)=>guest.storyFlags.family_route_survivor===true);
    assert.equal(routed.length,1,`${producer.eventId}:${producer.choiceId}`);
    assert.equal(routed[0].npcType,"NORMAL");
    assert.equal(routed[0].generated,true);
    assert.equal(routed[0].faction,"REFUGEE");
    assert.match(routed[0].conditionLabel,/가족 이동로 안내/);
    assert.match(routed[0].introDialogue,/미아와 다니엘/);
    assert.equal(routed[0].questions[0].label,"누구를 찾고 있습니까?");
    assert.match(routed[0].offeredItems[0].id,/family_route_survivor-item$/);
    assert.equal(routed[0].offeredItems[0].name,"겹쳐 그린 가족 이동 지도");
    assert.equal(next.flags.family_route_survivor_arrived,true);
    assert.equal(next.flags.family_route_survivor_arrived_day,13);
    assert.match(next.eventHistory.at(-1)?.message??"",/가족 이동로 · 실종 가족을 찾는 생존자 도착/);

    const recorded=recordVisitorDecision(next,routed[0].id,"ACCEPTED",205,{food:1});
    const history=recorded.visitorHistory.find((entry)=>entry.visitorId===routed[0].id)!;
    assert.match(history.events[0],/미아와 다니엘의 가족 이동로를 따라 도착/);
    assert.match(history.events[1],/CHECK IN · 205호/);
  }
});

test("가족 이동로의 두 번째 생산자는 완료된 후속 방문을 다시 예약하지 않는다",()=>{
  const miaResolved=applyStoryChoice(familyResolutionState("mia"),"mia-family","reunite").state;
  const arrived=prepareDailyVisitorQueue({...miaResolved,day:13});
  assert.equal(arrived.flags.family_route_survivor_arrived,true);
  const arrivedGuestId=arrived.dailyVisitorQueue.find((id)=>arrived.guests.find((guest)=>guest.id===id)?.storyFlags.family_route_survivor===true)!;

  const withDaniel={...arrived,day:14,guests:arrived.guests.map((guest)=>guest.id==="daniel"?{
    ...guest,status:"STAYING" as const,currentRoomNumber:302,checkedInDay:10,remainingNights:1,
    eventChain:guest.eventChain.map((event)=>event.stage==="CONFLICT"?{...event,completed:true}:event),
  }:guest)};
  const danielResolved=applyStoryChoice(withDaniel,"daniel-family","let_choose").state;
  assert.equal(danielResolved.flags.family_route_survivor_arrived,true);
  assert.equal(danielResolved.flags.family_route_survivor_arrived_day,13);
  assert.equal(danielResolved.flags.family_route_survivor_due_day,13);
  const following=prepareDailyVisitorQueue({...danielResolved,day:15});
  assert.ok(!following.dailyVisitorQueue.includes(arrivedGuestId));
  assert.ok(following.dailyVisitorQueue.every((id)=>following.guests.find((guest)=>guest.id===id)?.storyFlags.family_route_survivor!==true));
});

test("동시에 예약된 스토리 방문은 우선순위대로 하루에 하나씩 도착한다",()=>{
  const state=samuelResolutionState();
  Object.assign(state.flags,{
    samuel_rescue_patrol:true,samuel_rescue_survivor_due_day:12,samuel_rescue_survivor_arrived:false,
    family_routes_complete:true,family_route_survivor_due_day:12,family_route_survivor_arrived:false,
  });
  const first=prepareDailyVisitorQueue(state);
  const firstStory=first.dailyVisitorQueue.map((id)=>first.guests.find((guest)=>guest.id===id)!).filter((guest)=>guest.storyFlags.story_visitor_arrival_id);
  assert.deepEqual(firstStory.map((guest)=>guest.storyFlags.story_visitor_arrival_id),["samuel_rescue_survivor"]);
  assert.equal(first.flags.samuel_rescue_survivor_arrived,true);
  assert.equal(first.flags.family_route_survivor_arrived,false);

  const second=prepareDailyVisitorQueue({...first,day:13});
  const secondStory=second.dailyVisitorQueue.map((id)=>second.guests.find((guest)=>guest.id===id)!).filter((guest)=>guest.storyFlags.story_visitor_arrival_id);
  assert.deepEqual(secondStory.map((guest)=>guest.storyFlags.story_visitor_arrival_id),["family_route_survivor"]);
  assert.equal(second.flags.family_route_survivor_arrived,true);
  assert.deepEqual(STORY_VISITOR_ARRIVALS.map((arrival)=>arrival.id),["samuel_rescue_survivor","family_route_survivor"]);
});

test("실제 Samuel 결말은 오늘 큐를 보존하고 다음 DAY 신규 NORMAL 한 명만 구조 생존자로 표시한다",()=>{
  const current=prepareDailyVisitorQueue(samuelResolutionState());
  const currentQueue=current.dailyVisitorQueue.map((id)=>current.guests.find((guest)=>guest.id===id));
  const resolved=applyStoryChoice(current,"samuel-duty","search").state;
  assert.deepEqual(resolved.dailyVisitorQueue.map((id)=>resolved.guests.find((guest)=>guest.id===id)),currentQueue);
  assert.ok(currentQueue.every((guest)=>guest?.storyFlags.samuel_rescue_survivor!==true));

  const next=prepareDailyVisitorQueue({...resolved,day:13});
  const queued=next.dailyVisitorQueue.map((id)=>next.guests.find((guest)=>guest.id===id)!);
  const rescued=queued.filter((guest)=>guest.storyFlags.samuel_rescue_survivor===true);
  assert.equal(rescued.length,1);
  assert.equal(rescued[0].npcType,"NORMAL");
  assert.equal(rescued[0].generated,true);
  assert.equal(rescued[0].faction,"REFUGEE");
  assert.match(rescued[0].conditionLabel,/사무엘 구조대 동행/);
  assert.match(rescued[0].introDialogue,/검문선 명단/);
  assert.equal(rescued[0].offeredItems[0].name,"찢긴 검문선 명단");
  assert.equal(next.flags.samuel_rescue_survivor_arrived,true);
  assert.equal(next.flags.samuel_rescue_survivor_arrived_day,13);
  assert.match(next.eventHistory.at(-1)?.message??"",/사무엘 구조대 · 검문선 명단 생존자 도착/);
});

test("구조 방문은 기본 큐 ID와 MAIN·재방문 위치를 바꾸지 않고 신규 슬롯 하나의 표현만 바꾼다",()=>{
  let pair:null|{base:ReturnType<typeof prepareDailyVisitorQueue>;rescue:ReturnType<typeof prepareDailyVisitorQueue>}=null;
  for(let seed=1;seed<=1000&&!pair;seed+=1){
    const base=samuelResolutionState();
    base.day=20;
    base.visitorSeed=seed;
    base.visitorQueueDay=0;
    base.dailyVisitorQueue=[];
    const returning={...base.guests.find((guest)=>guest.id==="samuel")!,id:"returning-normal",npcType:"NORMAL" as const,generated:true,status:"CHECKED_OUT" as const,currentRoomNumber:null,checkedInDay:1,revisitPolicy:"ALWAYS" as const,storyFlags:{next_revisit_day:2},arrivalDay:1,arrivalDayRange:[1,1] as [number,number]};
    base.guests=[...base.guests.map((guest)=>guest.id==="samuel"?{...guest,status:"WAITING" as const,currentRoomNumber:null,arrivalDay:1,arrivalDayRange:[1,1] as [number,number]}:guest),returning];
    const without=prepareDailyVisitorQueue({...base,flags:{...base.flags,samuel_rescue_patrol:false}});
    const withRescue=prepareDailyVisitorQueue({...base,flags:{...base.flags,samuel_rescue_patrol:true,samuel_rescue_survivor_due_day:19,samuel_rescue_survivor_arrived:false}});
    if(without.dailyVisitorQueue.includes("returning-normal")&&without.dailyVisitorQueue.some((id)=>without.guests.find((guest)=>guest.id===id)?.npcType==="MAIN")) pair={base:without,rescue:withRescue};
  }
  assert.ok(pair,"MAIN과 재방문이 함께 있는 결정적 큐를 찾지 못했습니다.");
  assert.deepEqual(pair.rescue.dailyVisitorQueue,pair.base.dailyVisitorQueue);
  const baseKinds=pair.base.dailyVisitorQueue.map((id)=>pair!.base.guests.find((guest)=>guest.id===id)?.npcType);
  const rescueKinds=pair.rescue.dailyVisitorQueue.map((id)=>pair!.rescue.guests.find((guest)=>guest.id===id)?.npcType);
  assert.deepEqual(rescueKinds,baseKinds);
  assert.equal(pair.rescue.dailyVisitorQueue.filter((id)=>pair!.rescue.guests.find((guest)=>guest.id===id)?.storyFlags.samuel_rescue_survivor===true).length,1);
});

test("신규 NORMAL 슬롯이 없는 날에는 구조 방문을 소비하지 않고 다음 DAY로 연기한다",()=>{
  let deferred:ReturnType<typeof prepareDailyVisitorQueue>|null=null;
  for(let seed=1;seed<=5000&&!deferred;seed+=1){
    const state=samuelResolutionState();
    state.day=20;
    state.visitorSeed=seed;
    state.visitorQueueDay=0;
    state.worldState="STABLE";
    state.reputations.community=0;
    state.flags={...state.flags,samuel_rescue_patrol:true,samuel_rescue_survivor_due_day:19,samuel_rescue_survivor_arrived:false};
    const returning={...state.guests.find((guest)=>guest.id==="samuel")!,id:"returning-only",npcType:"NORMAL" as const,generated:true,status:"CHECKED_OUT" as const,currentRoomNumber:null,checkedInDay:1,revisitPolicy:"ALWAYS" as const,storyFlags:{next_revisit_day:2},arrivalDay:1,arrivalDayRange:[1,1] as [number,number]};
    state.guests=[...state.guests.map((guest)=>guest.id==="samuel"?{...guest,status:"WAITING" as const,currentRoomNumber:null,arrivalDay:1,arrivalDayRange:[1,1] as [number,number]}:guest),returning];
    const prepared=prepareDailyVisitorQueue(state);
    const queued=prepared.dailyVisitorQueue.map((id)=>prepared.guests.find((guest)=>guest.id===id)!);
    if(queued.length===2&&queued.some((guest)=>guest.npcType==="MAIN")&&queued.some((guest)=>guest.id==="returning-only")) deferred=prepared;
  }
  assert.ok(deferred,"NORMAL 슬롯이 없는 결정적 큐를 찾지 못했습니다.");
  assert.equal(deferred.flags.samuel_rescue_survivor_arrived,false);
  assert.ok(deferred.dailyVisitorQueue.every((id)=>deferred.guests.find((guest)=>guest.id===id)?.storyFlags.samuel_rescue_survivor!==true));
  const following=prepareDailyVisitorQueue({...deferred,day:21});
  assert.equal(following.dailyVisitorQueue.filter((id)=>following.guests.find((guest)=>guest.id===id)?.storyFlags.samuel_rescue_survivor===true).length,1);
});

test("구조 방문의 출처는 Visitor History에 결정 앞에 기록되고 저장 후 반복되지 않는다",()=>{
  const resolved=applyStoryChoice(prepareDailyVisitorQueue(samuelResolutionState()),"samuel-duty","search").state;
  const prepared=prepareDailyVisitorQueue({...resolved,day:13});
  const rescued=prepared.guests.find((guest)=>guest.storyFlags.samuel_rescue_survivor===true)!;
  const recorded=recordVisitorDecision(prepared,rescued.id,"ACCEPTED",204,{food:1});
  const history=recorded.visitorHistory.find((entry)=>entry.visitorId===rescued.id)!;
  assert.match(history.events[0],/사무엘 구조대가 검문선 명단에서 구조/);
  assert.match(history.events[1],/CHECK IN · 204호/);
  const restored=restoreGameState(serializeGameState(recorded));
  assert.equal(restored.flags.samuel_rescue_survivor_arrived,true);
  assert.deepEqual(restored.visitorHistory.find((entry)=>entry.visitorId===rescued.id)?.events,history.events);
  const next=prepareDailyVisitorQueue({...restored,day:14});
  assert.ok(next.dailyVisitorQueue.every((id)=>next.guests.find((guest)=>guest.id===id)?.storyFlags.samuel_rescue_survivor!==true));
});

test("구조 생존자도 루스 순회 간호대 사전 처치를 받고 두 출처가 Visitor History에 순서대로 남는다",()=>{
  const resolved=applyStoryChoice(prepareDailyVisitorQueue(samuelResolutionState()),"samuel-duty","search").state;
  const prepared=prepareDailyVisitorQueue({...resolved,day:13,flags:{...resolved.flags,ruth_field_nurse:true}});
  const rescued=prepared.guests.find((guest)=>guest.storyFlags.samuel_rescue_survivor===true)!;
  assert.equal(rescued.storyFlags.ruth_field_nurse_treated,true);
  assert.match(rescued.conditionLabel,/사무엘 구조대 동행/);
  assert.match(rescued.conditionLabel,/순회 응급처치/);
  const recorded=recordVisitorDecision(prepared,rescued.id,"REFUSED",null);
  const events=recorded.visitorHistory.find((entry)=>entry.visitorId===rescued.id)!.events;
  assert.match(events[0],/사무엘 구조대가 검문선 명단에서 구조/);
  assert.match(events[1],/루스 순회 간호대 사전 처치/);
  assert.match(events[2],/REFUSED/);
});

test("Samuel 결말은 전용 플래그만 교체하고 공유 호텔 방위대 기록을 지우지 않는다",()=>{
  const watchState=samuelResolutionState();
  watchState.flags.samuel_rescue_patrol=true;
  const watch=applyStoryChoice(watchState,"samuel-duty","watch").state;
  assert.deepEqual({watch:watch.flags.samuel_civil_guard,rescue:watch.flags.samuel_rescue_patrol,defense:watch.flags.hotel_defense_force},{watch:true,rescue:false,defense:true});

  const searchState=samuelResolutionState();
  Object.assign(searchState.flags,{samuel_civil_guard:true,hotel_defense_force:true});
  const search=applyStoryChoice(searchState,"samuel-duty","search").state;
  assert.deepEqual({watch:search.flags.samuel_civil_guard,rescue:search.flags.samuel_rescue_patrol,defense:search.flags.hotel_defense_force},{watch:false,rescue:true,defense:true});
});

test("Samuel 결말 문구는 양쪽의 지속 효과·큐 경계·포기 비용을 모두 공개한다",()=>{
  const event=STORY_CHOICE_EVENTS.find((candidate)=>candidate.id==="samuel-duty")!;
  const watch=event.choices.find((choice)=>choice.id==="watch")!;
  const search=event.choices.find((choice)=>choice.id==="search")!;
  for(const term of ["Trust +10","Security +8","community 평판 +5","매일 밤 Security","Crime","다음 DAY","Monster Threat +4","되돌릴 수 없습니다"]) assert.ok(watch.description.includes(term),term);
  for(const term of ["Trust +7","Monster Threat +4","refugee 평판 +8","오늘의 방문자 큐는 바뀌지 않으며","다음 DAY","신규 NORMAL 슬롯","사무엘 구조대 동행","MAIN과 재방문 손님은 밀어내지 않고","저장·불러오기 뒤에도 중복 도착하지 않습니다","Security +8","Crime -2","되돌릴 수 없습니다"]) assert.ok(search.description.includes(term),term);
});
