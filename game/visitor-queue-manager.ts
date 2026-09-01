import { createNormalVisitor } from "./normal-visitor-data.ts";
import type { EventFlags, GameState, Guest, Resources, VisitorDecision, VisitorHistoryRecord, WorldState } from "./types.ts";
import { getNextRevisitDay, REVISIT_REFUSAL_DELAY_DAYS } from "./visitor-manager.ts";
import { getActiveVisitorRadioExposureSources, type VisitorRadioExposureSource } from "./visitor-queue-data.ts";
import { applyVisitorArrivalMedicalSupport, getArrivalMedicalSupportHistoryEvent } from "./visitor-health-manager.ts";

export const VISITOR_COUNT_WEIGHTS = [
  { count:2, weight:15 },
  { count:3, weight:30 },
  { count:4, weight:30 },
  { count:5, weight:15 },
  { count:6, weight:10 },
] as const;
export const BASE_MAIN_VISITOR_CHANCE = 10;
export const NORMAL_REVISIT_CHANCE = .2;

const clamp = (value:number,min:number,max:number) => Math.max(min,Math.min(max,value));
const hash = (value:string) => {
  let result = 2166136261;
  for (let index=0;index<value.length;index+=1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result,16777619);
  }
  return result >>> 0;
};
const seeded = (input:number) => {
  let value=input>>>0;
  return () => {
    value += 0x6d2b79f5;
    let mixed=value;
    mixed=Math.imul(mixed^(mixed>>>15),mixed|1);
    mixed^=mixed+Math.imul(mixed^(mixed>>>7),mixed|61);
    return ((mixed^(mixed>>>14))>>>0)/4294967296;
  };
};
const weightedIndex = (weights:number[],random:()=>number) => {
  const total=weights.reduce((sum,weight)=>sum+Math.max(0,weight),0);
  if (total<=0) return -1;
  let roll=random()*total;
  for (let index=0;index<weights.length;index+=1) {
    roll-=Math.max(0,weights[index]);
    if (roll<0) return index;
  }
  return weights.length-1;
};
const meetsArrivalConditions = (guest:Guest,appeared:Set<string>,flags:EventFlags) => guest.arrivalConditions.every((condition)=>condition.type==="GUEST_APPEARED"?appeared.has(condition.key):flags[condition.key]===(condition.value??true));
const finiteDay = (value:unknown,fallback:number) => {
  const numeric=Number(value);
  return Number.isFinite(numeric)&&numeric>=0?numeric:fallback;
};
const returnReadyDay = (guest:Guest) => {
  const refusalDay=finiteDay(guest.storyFlags.last_revisit_refused_day,guest.arrivalDay);
  const fallback=guest.status==="REFUSED"
    ? refusalDay+REVISIT_REFUSAL_DELAY_DAYS+1
    : guest.checkedInDay===null?guest.arrivalDay:getNextRevisitDay(guest.checkedInDay);
  const scheduled=finiteDay(guest.storyFlags.next_revisit_day,fallback);
  return Math.max(scheduled,finiteDay(guest.storyFlags.revisit_refused_until,0));
};
const isReturnReady = (guest:Guest,day:number) => guest.alive&&guest.revisitPolicy!=="NEVER"&&(guest.status==="CHECKED_OUT"||guest.status==="REFUSED")&&day>=returnReadyDay(guest)+(guest.revisitPolicy==="CONDITIONAL"?3:0)&&day>=Number(guest.storyFlags.revisit_refused_until??0);

type VisitorCountState = Pick<GameState,"visitorSeed"|"day"|"worldState"|"reputations"|"flags">;
export type DailyVisitorCountBreakdown = {
  baseCount:number;
  worldBonus:number;
  reputationBonus:number;
  radioBonus:number;
  radioAppliedBonus:number;
  radioSources:VisitorRadioExposureSource[];
  threatPenalty:number;
  stormPenalty:number;
  total:number;
};

export function getDailyVisitorCountBreakdown(state:VisitorCountState):DailyVisitorCountBreakdown {
  const random=seeded(hash(`${state.visitorSeed}:count:${state.day}`));
  const baseCount=VISITOR_COUNT_WEIGHTS[weightedIndex(VISITOR_COUNT_WEIGHTS.map((entry)=>entry.weight),random)].count;
  const worldBonus:Partial<Record<WorldState,number>>={COLLAPSE:1,CRITICAL:1,END_STAGE:1};
  const activeWorldBonus=Number(worldBonus[state.worldState]??0);
  const reputationBonus=state.reputations.community>=40||state.reputations.refugee>=40?1:0;
  const radioSources=getActiveVisitorRadioExposureSources(state.flags);
  const radioBonus=radioSources.length>0?1:0;
  const threatPenalty=Number(state.flags.monster_threat??0)>=75?1:0;
  const stormPenalty=state.flags.severe_storm===true?1:0;
  const totalWithoutRadio=clamp(baseCount+activeWorldBonus+reputationBonus-threatPenalty-stormPenalty,2,6);
  const total=clamp(baseCount+activeWorldBonus+reputationBonus+radioBonus-threatPenalty-stormPenalty,2,6);
  return { baseCount, worldBonus:activeWorldBonus, reputationBonus, radioBonus, radioAppliedBonus:total-totalWithoutRadio, radioSources, threatPenalty, stormPenalty, total };
}

export const getDailyVisitorCount = (state:VisitorCountState):number => getDailyVisitorCountBreakdown(state).total;

export function getEligibleMainVisitors(state:Pick<GameState,"guests"|"day"|"flags">):Guest[] {
  const appeared=new Set(state.guests.filter((guest)=>guest.status!=="WAITING").map((guest)=>guest.id));
  return state.guests.filter((guest)=>guest.npcType==="MAIN"&&(
    guest.status==="WAITING"
      ? guest.arrivalDay<=state.day&&meetsArrivalConditions(guest,appeared,state.flags)
      : isReturnReady(guest,state.day)
  ));
}

export function getMainVisitorChance(state:Pick<GameState,"guests"|"day"|"flags">):number {
  const candidates=getEligibleMainVisitors(state);
  if (!candidates.length) return 0;
  const longestWait=Math.max(...candidates.map((guest)=>Math.max(0,state.day-(guest.status==="WAITING"?guest.arrivalDay:returnReadyDay(guest)))));
  return clamp(BASE_MAIN_VISITOR_CHANCE+longestWait*6,BASE_MAIN_VISITOR_CHANCE,95);
}

export function selectMainVisitor(state:Pick<GameState,"guests"|"day"|"flags"|"visitorSeed">):Guest|null {
  const candidates=getEligibleMainVisitors(state);
  if (!candidates.length) return null;
  const random=seeded(hash(`${state.visitorSeed}:main:${state.day}`));
  if (random()*100>=getMainVisitorChance(state)) return null;
  const weights=candidates.map((guest)=>{
    const anchor=guest.status==="WAITING"?guest.arrivalDay:returnReadyDay(guest);
    const overdue=Math.max(0,state.day-anchor);
    const windowBoost=state.day>guest.arrivalDayRange[1]?4:1;
    return (10+overdue*5)*windowBoost;
  });
  return candidates[weightedIndex(weights,random)]??null;
}

export function prepareDailyVisitorQueue(state:GameState):GameState {
  if (state.day<=0||state.visitorQueueDay===state.day) return state;
  const count=getDailyVisitorCount(state);
  const random=seeded(hash(`${state.visitorSeed}:queue:${state.day}`));
  const main=selectMainVisitor(state);
  const normalReturnCandidates=state.guests.filter((guest)=>guest.npcType==="NORMAL"&&isReturnReady(guest,state.day)).sort((a,b)=>returnReadyDay(a)-returnReadyDay(b)||a.id.localeCompare(b.id));
  const returningNormal=normalReturnCandidates.length&&random()<NORMAL_REVISIT_CHANCE?normalReturnCandidates[Math.floor(random()*normalReturnCandidates.length)]:null;
  const slots=Array.from({length:count},(_,index)=>index);
  const mainSlot=main?Math.floor(random()*count):-1;
  let returnSlot=returningNormal?Math.floor(random()*count):-1;
  if (returningNormal&&returnSlot===mainSlot) returnSlot=(returnSlot+1)%count;
  const generated:Guest[]=[];
  const queue=slots.map((slot)=>{
    if (slot===mainSlot) return main!.id;
    if (slot===returnSlot) return returningNormal!.id;
    const guest=applyVisitorArrivalMedicalSupport(createNormalVisitor(state.visitorSeed,state.day,slot),state.flags,state.day);
    generated.push(guest);
    return guest.id;
  });
  const medicallySupported=generated.filter((guest)=>guest.storyFlags.ruth_field_nurse_treated===true);
  const stabilizedCount=medicallySupported.filter((guest)=>guest.storyFlags.ruth_field_nurse_sickness_stabilized===true).length;
  return {
    ...state,
    guests:[...state.guests,...generated],
    visitorQueueDay:state.day,
    dailyVisitorQueue:queue,
    dailyVisitorIndex:0,
    asked:[],inspected:[],negotiated:false,held:false,decision:null,pendingVisitorReactionId:null,
    eventHistory:medicallySupported.length?[...state.eventHistory,{day:state.day,type:"EVENT",message:`루스 순회 간호대 · 새 방문자 ${medicallySupported.length}명 사전 처치${stabilizedCount?` · 발열 안정 ${stabilizedCount}명`:""}`}]:state.eventHistory,
  };
}

export function getCurrentQueuedVisitor(state:Pick<GameState,"dailyVisitorQueue"|"dailyVisitorIndex"|"guests">):Guest|null {
  const id=state.dailyVisitorQueue[state.dailyVisitorIndex];
  return id?state.guests.find((guest)=>guest.id===id)??null:null;
}

export const hasPendingDailyVisitors = (state:Pick<GameState,"dailyVisitorQueue"|"dailyVisitorIndex">) => state.dailyVisitorIndex<state.dailyVisitorQueue.length;

export function advanceDailyVisitorQueue(state:GameState):GameState {
  return {...state,dailyVisitorIndex:Math.min(state.dailyVisitorQueue.length,state.dailyVisitorIndex+1),asked:[],inspected:[],negotiated:false,held:false,decision:null,pendingVisitorReactionId:null};
}

const addResources = (base:Partial<Resources>,extra:Partial<Resources>) => {
  const result={...base};
  for (const [key,value] of Object.entries(extra)) result[key as keyof Resources]=Number(result[key as keyof Resources]??0)+Number(value??0);
  return result;
};

export function recordVisitorDecision(state:GameState,guestId:string,decision:VisitorDecision,roomNumber:number|null,itemsPaid:Partial<Resources>={}):GameState {
  const existing=state.visitorHistory.find((entry)=>entry.visitorId===guestId);
  const guest=state.guests.find((entry)=>entry.id===guestId);
  if (!guest) return state;
  const event=decision==="ACCEPTED"?`DAY ${state.day} · CHECK IN${roomNumber?` · ${roomNumber}호`:""}`:`DAY ${state.day} · REFUSED`;
  const medicalEvent=getArrivalMedicalSupportHistoryEvent(guest,state.day);
  const visitEvents=medicalEvent?[medicalEvent,event]:[event];
  const record:VisitorHistoryRecord=existing?{
    ...existing,lastVisitDay:state.day,
    acceptedCount:existing.acceptedCount+Number(decision==="ACCEPTED"),
    refusedCount:existing.refusedCount+Number(decision==="REFUSED"),
    roomsStayed:roomNumber?[...new Set([...existing.roomsStayed,roomNumber])]:existing.roomsStayed,
    itemsPaid:decision==="ACCEPTED"?addResources(existing.itemsPaid,itemsPaid):existing.itemsPaid,
    events:[...existing.events,...visitEvents.filter((entry)=>!existing.events.includes(entry))],finalState:decision==="ACCEPTED"?"STAYING":"REFUSED",
  }:{visitorId:guestId,firstVisitDay:state.day,lastVisitDay:state.day,acceptedCount:Number(decision==="ACCEPTED"),refusedCount:Number(decision==="REFUSED"),roomsStayed:roomNumber?[roomNumber]:[],itemsPaid:decision==="ACCEPTED"?{...itemsPaid}:{},events:visitEvents,finalState:decision==="ACCEPTED"?"STAYING":"REFUSED"};
  return {...state,visitorHistory:[...state.visitorHistory.filter((entry)=>entry.visitorId!==guestId),record]};
}

export function updateVisitorFinalState(history:VisitorHistoryRecord[],guestId:string,finalState:string,event:string):VisitorHistoryRecord[] {
  return history.map((entry)=>entry.visitorId===guestId?{...entry,finalState,events:[...entry.events,event]}:entry);
}
