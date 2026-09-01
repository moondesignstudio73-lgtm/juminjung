import { EVIDENCE_CATALOG, INVESTIGATION_CASES } from "./investigation-data.ts";
import { applyMonsterKnowledgeSource } from "./monster-codex-manager.ts";
import type {
  EvidenceAssessment, EvidenceId, EventFlags, GameState, HotelStats, InvestigationCaseDefinition,
  InvestigationCaseId, InvestigationCaseState, InvestigationConclusionId, InvestigationPointId,
  Reputations,
} from "./types.ts";

const clamp = (value:number) => Math.max(0,Math.min(100,value));
const numeric = (value:unknown,fallback=0) => Number.isFinite(Number(value))?Number(value):fallback;
const validDay = (value: unknown, fallback: number) => {
  const resolved = Number.isFinite(Number(value))
    ? Number(value)
    : Number.isFinite(Number(fallback))
      ? Number(fallback)
      : 0;
  return Math.max(0, Math.trunc(resolved));
};
const caseDefinition = (caseId:InvestigationCaseId) => INVESTIGATION_CASES.find((entry)=>entry.id===caseId)??null;
const activeStatus = (status:InvestigationCaseState["status"]) => status==="OPEN"||status==="INVESTIGATING";
const mergeNumbers = <T extends Record<string,number>>(current:T,changes:Partial<T>|undefined):T => !changes?current:Object.fromEntries(Object.entries(current).map(([key,value])=>[key,clamp(value+Number(changes[key]??0))])) as T;

export function getInvestigationCaseDefinition(caseId:InvestigationCaseId):InvestigationCaseDefinition|null {
  return caseDefinition(caseId);
}

export function getInvestigationCaseState(state:Pick<GameState,"investigationCases">,caseId:InvestigationCaseId):InvestigationCaseState|null {
  return state.investigationCases.find((entry)=>entry.caseId===caseId)??null;
}

export function getOpenInvestigationCases(state:Pick<GameState,"investigationCases">):InvestigationCaseState[] {
  return state.investigationCases.filter((entry)=>activeStatus(entry.status));
}

export function getEvidenceDefinition(evidenceId:EvidenceId) {
  return EVIDENCE_CATALOG.find((entry)=>entry.id===evidenceId)??null;
}

export function getInvestigationEvidenceFlags(cases:InvestigationCaseState[]):EventFlags {
  return Object.fromEntries(cases.flatMap((caseState)=>caseState.collectedEvidenceIds.flatMap((evidenceId)=>{const evidence=getEvidenceDefinition(evidenceId);return evidence?[[evidence.storyFlag,true]]:[]})));
}

export function assessInvestigationConclusion(caseState:InvestigationCaseState,caseId:InvestigationCaseId,conclusionId:InvestigationConclusionId):EvidenceAssessment {
  if (caseState.caseId!==caseId) return "UNKNOWN";
  const conclusion=caseDefinition(caseId)?.conclusions.find((entry)=>entry.id===conclusionId);
  if (!conclusion) return "UNKNOWN";
  const collected=new Set(caseState.collectedEvidenceIds);
  if (conclusion.contradictedBy.some((id)=>collected.has(id))) return "CONTRADICTED";
  const support=conclusion.supportedBy.filter((id)=>collected.has(id)).length;
  return support>=conclusion.minimumSupport?"SUPPORTED":"UNKNOWN";
}

export function normalizeInvestigationCases(value:unknown,flags:EventFlags,currentDay:number):InvestigationCaseState[] {
  const raw=Array.isArray(value)?value:[];
  const normalized:InvestigationCaseState[]=[];
  for (const definition of INVESTIGATION_CASES) {
    const saved=raw.find((entry)=>entry&&typeof entry==="object"&&(entry as Partial<InvestigationCaseState>).caseId===definition.id) as Partial<InvestigationCaseState>|undefined;
    if (!saved) continue;
    const pointIds=new Set(definition.points.map((point)=>point.id));
    const conclusionIds=new Set(definition.conclusions.map((conclusion)=>conclusion.id));
    const inspectedPointIds=[...new Set(Array.isArray(saved.inspectedPointIds)?saved.inspectedPointIds:[])].filter((id)=>pointIds.has(id));
    const inspectedSet=new Set(inspectedPointIds);
    const collectedEvidenceIds=definition.points.filter((point)=>inspectedSet.has(point.id)).map((point)=>point.evidenceId);
    const conclusionId=saved.conclusionId&&conclusionIds.has(saved.conclusionId)&&collectedEvidenceIds.length>=definition.minimumEvidenceToConclude?saved.conclusionId:null;
    const status:InvestigationCaseState["status"]=conclusionId?(conclusionId==="UNRESOLVED"?"UNRESOLVED":"SOLVED"):(collectedEvidenceIds.length?"INVESTIGATING":"OPEN");
    normalized.push({caseId:definition.id,status,openedDay:validDay(saved.openedDay,currentDay),inspectedPointIds,collectedEvidenceIds,conclusionId,resolvedDay:conclusionId?validDay(saved.resolvedDay,currentDay):null});
  }
  if (flags.room_207_investigated===true&&!normalized.some((entry)=>entry.caseId==="ROOM_207")) {
    normalized.push({caseId:"ROOM_207",status:"OPEN",openedDay:Math.max(0,currentDay),inspectedPointIds:[],collectedEvidenceIds:[],conclusionId:null,resolvedDay:null});
  }
  return normalized;
}

export function openInvestigationCase(state:GameState,caseId:InvestigationCaseId):GameState {
  const definition=caseDefinition(caseId);
  if (!definition||state.investigationCases.some((entry)=>entry.caseId===caseId)) return state;
  const caseState:InvestigationCaseState={caseId,status:"OPEN",openedDay:state.day,inspectedPointIds:[],collectedEvidenceIds:[],conclusionId:null,resolvedDay:null};
  return {...state,investigationCases:[...state.investigationCases,caseState],eventHistory:[...state.eventHistory,{day:state.day,type:"EVENT",message:`조사 사건 개시 · ${definition.title}`}]};
}

export function canInvestigateCasePoint(state:GameState,caseId:InvestigationCaseId,pointId:InvestigationPointId):boolean {
  const definition=caseDefinition(caseId);
  const caseState=getInvestigationCaseState(state,caseId);
  const point=definition?.points.find((entry)=>entry.id===pointId);
  return Boolean(point&&getEvidenceDefinition(point.evidenceId)&&caseState&&activeStatus(caseState.status)&&!caseState.inspectedPointIds.includes(pointId)&&state.actionPoints>=point.actionCost);
}

export function investigateCasePoint(state:GameState,caseId:InvestigationCaseId,pointId:InvestigationPointId):{state:GameState;ok:boolean;message:string} {
  const definition=caseDefinition(caseId);
  const caseState=getInvestigationCaseState(state,caseId);
  const point=definition?.points.find((entry)=>entry.id===pointId);
  if (!definition||!caseState||!point) return {state,ok:false,message:"조사할 수 없는 사건 지점입니다."};
  if (!activeStatus(caseState.status)) return {state,ok:false,message:"이미 결론이 내려진 사건입니다."};
  if (caseState.inspectedPointIds.includes(pointId)) return {state,ok:false,message:"이미 조사한 지점입니다."};
  if (state.actionPoints<point.actionCost) return {state,ok:false,message:"조사에 필요한 행동 포인트가 없습니다."};
  const evidence=getEvidenceDefinition(point.evidenceId);
  if (!evidence) return {state,ok:false,message:"조사 지점에 연결된 증거 정의가 없습니다."};
  const nextCase:InvestigationCaseState={...caseState,status:"INVESTIGATING",inspectedPointIds:[...caseState.inspectedPointIds,pointId],collectedEvidenceIds:[...new Set([...caseState.collectedEvidenceIds,point.evidenceId])]};
  const message=`증거 확보 · ${definition.title} · ${evidence.name}`;
  return {ok:true,message,state:{...state,actionPoints:state.actionPoints-point.actionCost,flags:{...state.flags,[evidence.storyFlag]:true},investigationCases:state.investigationCases.map((entry)=>entry.caseId===caseId?nextCase:entry),eventHistory:[...state.eventHistory,{day:state.day,type:"EVENT",message}]}};
}

export function canConcludeInvestigationCase(state:GameState,caseId:InvestigationCaseId):boolean {
  const definition=caseDefinition(caseId);
  const caseState=getInvestigationCaseState(state,caseId);
  return Boolean(definition&&caseState&&activeStatus(caseState.status)&&caseState.collectedEvidenceIds.length>=definition.minimumEvidenceToConclude);
}

export function concludeInvestigationCase(state:GameState,caseId:InvestigationCaseId,conclusionId:InvestigationConclusionId):{state:GameState;ok:boolean;message:string} {
  const definition=caseDefinition(caseId);
  const caseState=getInvestigationCaseState(state,caseId);
  const conclusion=definition?.conclusions.find((entry)=>entry.id===conclusionId);
  if (!definition||!caseState||!conclusion) return {state,ok:false,message:"선택할 수 없는 사건 결론입니다."};
  if (!canConcludeInvestigationCase(state,caseId)) return {state,ok:false,message:`결론을 내리려면 증거 ${definition.minimumEvidenceToConclude}개가 필요합니다.`};
  const assessment=assessInvestigationConclusion(caseState,caseId,conclusionId);
  const supportedOnly=new Set(conclusion.supportedOnlyFlags??[]);
  const appliedFlags=Object.fromEntries(Object.entries(conclusion.effect.flags).filter(([key])=>assessment==="SUPPORTED"||!supportedOnly.has(key)));
  if (conclusion.id===definition.correctConclusionId&&assessment==="SUPPORTED") appliedFlags[definition.correctFlag]=true;
  const nextCase:InvestigationCaseState={...caseState,status:conclusionId==="UNRESOLVED"?"UNRESOLVED":"SOLVED",conclusionId,resolvedDay:state.day};
  const assessmentLabel={UNKNOWN:"미확인",SUPPORTED:"증거 지지",CONTRADICTED:"증거 모순"} as const;
  const message=`사건 결론 · ${definition.title} · ${conclusion.label} · ${assessmentLabel[assessment]}`;
  const resolved:GameState={...state,hotelStats:mergeNumbers<HotelStats>(state.hotelStats,conclusion.effect.hotelStats),reputations:mergeNumbers<Reputations>(state.reputations,conclusion.effect.reputations),flags:{...state.flags,...appliedFlags,monster_threat:clamp(numeric(state.flags.monster_threat)+conclusion.effect.threat)},investigationCases:state.investigationCases.map((entry)=>entry.caseId===caseId?nextCase:entry),eventHistory:[...state.eventHistory,{day:state.day,type:"EVENT",message}]};
  const withKnowledge=conclusion.id===definition.correctConclusionId&&assessment==="SUPPORTED"?applyMonsterKnowledgeSource(resolved,"ROOM_207_MONSTER_CONCLUSION"):resolved;
  return {ok:true,message,state:withKnowledge};
}
