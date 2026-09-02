import type {
  GameState, Guest, GuestSkills, Resources, ScavengeMissionId, ScavengeOutcome,
  ScavengeReport, StaffAssignments, StaffDutyId, StaffDutyResult,
} from "./types.ts";

type StaffDutyDefinition = {
  id: StaffDutyId;
  name: string;
  description: string;
  skill: keyof GuestSkills;
  skillLabel: string;
};

type ScavengeMissionDefinition = {
  id: ScavengeMissionId;
  name: string;
  description: string;
  difficulty: number;
  cost: Partial<Resources>;
  rewards: Partial<Resources>;
  setbackHealth: number;
  exposure: number;
};

export type ScavengeRouteModifiers = {
  active: boolean;
  chanceBonus: number;
  exposureReduction: number;
};

export type ScavengeChanceBreakdown = ScavengeRouteModifiers & {
  baseChance: number;
  appliedChanceBonus: number;
  chance: number;
};

const RESOURCE_LABELS: Record<keyof Resources, string> = {
  food: "식량",
  water: "물",
  medicine: "의약품",
  fuel: "연료",
  parts: "부품",
  security: "보안 물자",
};

export const STAFF_DUTIES: ReadonlyArray<StaffDutyDefinition> = [
  { id: "MAINTENANCE", name: "시설 정비", description: "수리 능력으로 호텔 상태를 회복합니다.", skill: "repair", skillLabel: "수리" },
  { id: "SECURITY", name: "야간 경비", description: "전투 능력으로 Security를 높이고 위협을 낮춥니다.", skill: "combat", skillLabel: "전투" },
  { id: "MEDICAL", name: "야간 진료", description: "의료 능력으로 가장 위급한 투숙객을 치료합니다.", skill: "medical", skillLabel: "의료" },
  { id: "KITCHEN", name: "배급 관리", description: "작업 능력으로 야간 식량 수요를 줄입니다.", skill: "work", skillLabel: "작업" },
  { id: "SCAVENGE", name: "외부 정찰", description: "탐색 능력으로 낮 탐색 임무의 성공률을 결정합니다.", skill: "scavenge", skillLabel: "탐색" },
];

export const SCAVENGE_MISSIONS: ReadonlyArray<ScavengeMissionDefinition> = [
  { id: "NEARBY_BLOCK", name: "인근 상가 수색", description: "가까운 폐상가에서 기본 생필품을 찾습니다.", difficulty: 35, cost: {}, rewards: { food: 3, water: 3, parts: 1 }, setbackHealth: 4, exposure: 1 },
  { id: "ABANDONED_PHARMACY", name: "버려진 약국", description: "감염 흔적이 남은 약국에서 의약품을 회수합니다.", difficulty: 55, cost: { fuel: 1 }, rewards: { medicine: 4, food: 1 }, setbackHealth: 8, exposure: 2 },
  { id: "FUEL_DEPOT", name: "외곽 연료 저장소", description: "괴물 이동로 너머 저장소에서 연료와 부품을 회수합니다.", difficulty: 72, cost: { security: 2 }, rewards: { fuel: 7, parts: 3 }, setbackHealth: 12, exposure: 4 },
];

export const SAFE_ROUTE_SCAVENGE_CHANCE_BONUS = 10;
export const SAFE_ROUTE_SCAVENGE_EXPOSURE_REDUCTION = 2;

const clamp = (value:number,min=0,max=100) => Math.max(min,Math.min(max,value));
const isActiveStaff = (guest:Guest|null|undefined) => Boolean(guest?.alive&&guest.status==="STAYING"&&guest.currentRoomNumber!==null);
const hash = (value:string) => {
  let result=2166136261;
  for (let index=0;index<value.length;index+=1) { result^=value.charCodeAt(index); result=Math.imul(result,16777619); }
  return result>>>0;
};
const randomRoll = (seed:number,key:string) => {
  let value=(seed^hash(key))>>>0;
  value+=0x6d2b79f5;
  let mixed=value;
  mixed=Math.imul(mixed^(mixed>>>15),mixed|1);
  mixed^=mixed+Math.imul(mixed^(mixed>>>7),mixed|61);
  return Math.floor((((mixed^(mixed>>>14))>>>0)/4294967296)*100)+1;
};
const canAfford = (resources:Resources,cost:Partial<Resources>) => Object.entries(cost).every(([key,value])=>resources[key as keyof Resources]>=Number(value));
const changeResources = (resources:Resources,changes:Partial<Resources>) => Object.fromEntries(Object.entries(resources).map(([key,value])=>[key,Math.max(0,value+Number(changes[key as keyof Resources]??0))])) as Resources;

export function pruneStaffAssignments(assignments:StaffAssignments,guests:Guest[]):StaffAssignments {
  const activeIds=new Set(guests.filter(isActiveStaff).map((guest)=>guest.id));
  const used=new Set<string>();
  const result:StaffAssignments={};
  for (const duty of STAFF_DUTIES) {
    const guestId=assignments[duty.id];
    if (guestId&&activeIds.has(guestId)&&!used.has(guestId)) { result[duty.id]=guestId; used.add(guestId); }
  }
  return result;
}

export function assignStaffDuty(state:GameState,dutyId:StaffDutyId,guestId:string|null):{state:GameState;ok:boolean;message:string} {
  const duty=STAFF_DUTIES.find((entry)=>entry.id===dutyId);
  if (!duty) return {state,ok:false,message:"존재하지 않는 근무입니다."};
  const guest=guestId?state.guests.find((entry)=>entry.id===guestId):null;
  if (guestId&&!isActiveStaff(guest)) return {state,ok:false,message:"현재 투숙 중인 생존자만 근무에 배치할 수 있습니다."};
  const next=Object.fromEntries(Object.entries(state.staffAssignments).filter(([key,value])=>key!==dutyId&&value!==guestId)) as StaffAssignments;
  if (guestId) next[dutyId]=guestId;
  const message=guest?`${duty.name} · ${guest.name} 배치`:`${duty.name} · 미배치`;
  if ((state.staffAssignments[dutyId]??null)===guestId) return {state,ok:true,message:"이미 같은 근무 배치입니다."};
  return {ok:true,message,state:{...state,staffAssignments:next,eventHistory:[...state.eventHistory,{day:state.day,type:"EVENT",message:`근무 배치 · ${message}`}]}};
}

export function getAssignedStaff(state:Pick<GameState,"staffAssignments"|"guests">,dutyId:StaffDutyId):Guest|null {
  const guest=state.guests.find((entry)=>entry.id===state.staffAssignments[dutyId]);
  return isActiveStaff(guest)?guest??null:null;
}

export function getScavengeRouteModifiers(missionId:ScavengeMissionId,safeRoutesMapped:boolean):ScavengeRouteModifiers {
  const mission=SCAVENGE_MISSIONS.find((entry)=>entry.id===missionId);
  if (!mission||!safeRoutesMapped) return {active:false,chanceBonus:0,exposureReduction:0};
  return {
    active:true,
    chanceBonus:SAFE_ROUTE_SCAVENGE_CHANCE_BONUS,
    exposureReduction:Math.min(SAFE_ROUTE_SCAVENGE_EXPOSURE_REDUCTION,mission.exposure),
  };
}

export function getScavengeChanceBreakdown(guest:Guest,missionId:ScavengeMissionId,safeRoutesMapped=false):ScavengeChanceBreakdown {
  const mission=SCAVENGE_MISSIONS.find((entry)=>entry.id===missionId);
  if (!mission) return {active:false,chanceBonus:0,exposureReduction:0,baseChance:0,appliedChanceBonus:0,chance:0};
  const fieldScore=guest.skills.scavenge*.65+guest.skills.work*.2+guest.skills.combat*.15;
  const route=getScavengeRouteModifiers(missionId,safeRoutesMapped);
  const baseChance=clamp(Math.round(55+fieldScore-mission.difficulty),15,95);
  const chance=clamp(baseChance+route.chanceBonus,15,95);
  return {...route,baseChance,appliedChanceBonus:chance-baseChance,chance};
}

export function getScavengeChance(guest:Guest,missionId:ScavengeMissionId,safeRoutesMapped=false):number {
  return getScavengeChanceBreakdown(guest,missionId,safeRoutesMapped).chance;
}

export function canRunScavengeMission(state:GameState,missionId:ScavengeMissionId):boolean {
  const mission=SCAVENGE_MISSIONS.find((entry)=>entry.id===missionId);
  const scout=getAssignedStaff(state,"SCAVENGE");
  return Boolean(mission&&scout&&scout.health>=35&&scout.infectionState!=="INFECTED"&&state.actionPoints>0&&state.lastScavengeDay!==state.day&&canAfford(state.resources,mission.cost));
}

export function runScavengeMission(state:GameState,missionId:ScavengeMissionId):{state:GameState;ok:boolean;message:string;report:ScavengeReport|null} {
  const mission=SCAVENGE_MISSIONS.find((entry)=>entry.id===missionId);
  const scout=getAssignedStaff(state,"SCAVENGE");
  if (!mission) return {state,ok:false,message:"존재하지 않는 탐색 임무입니다.",report:null};
  if (!scout) return {state,ok:false,message:"외부 정찰 담당자를 먼저 배치하십시오.",report:null};
  if (state.lastScavengeDay===state.day) return {state,ok:false,message:"오늘의 탐색 임무는 이미 끝났습니다.",report:null};
  if (state.actionPoints<1) return {state,ok:false,message:"오늘 사용할 행동 포인트가 없습니다.",report:null};
  if (scout.health<35||scout.infectionState==="INFECTED") return {state,ok:false,message:"정찰 담당자의 상태가 외부 임무를 감당할 수 없습니다.",report:null};
  if (!canAfford(state.resources,mission.cost)) return {state,ok:false,message:"탐색 준비 자원이 부족합니다.",report:null};
  const route=getScavengeChanceBreakdown(scout,mission.id,state.flags.safe_routes_mapped===true);
  const chance=route.chance;
  const roll=randomRoll(state.visitorSeed,`${state.day}:${mission.id}:${scout.id}:${scout.storyFlags.visit_count??0}`);
  const outcome:ScavengeOutcome=roll<=Math.max(10,chance-30)?"CLEAN_SUCCESS":roll<=chance?"SUCCESS":"SETBACK";
  const rewardMultiplier=outcome==="CLEAN_SUCCESS"?1.5:outcome==="SUCCESS"?1:0;
  const rewards=Object.fromEntries(Object.entries(mission.rewards).map(([key,value])=>[key,Math.ceil(Number(value)*rewardMultiplier)]).filter(([,value])=>Number(value)>0)) as Partial<Resources>;
  const healthDelta=outcome==="SETBACK"?-mission.setbackHealth:0;
  const stressDelta=outcome==="CLEAN_SUCCESS"?3:outcome==="SUCCESS"?6:12;
  const exposure=Math.max(0,mission.exposure-route.exposureReduction);
  const threatDelta=outcome==="CLEAN_SUCCESS"?Math.max(0,exposure-2):outcome==="SUCCESS"?exposure:exposure+3;
  const outcomeLabel=outcome==="CLEAN_SUCCESS"?"완전 성공":outcome==="SUCCESS"?"성공":"철수";
  const rewardText=Object.entries(rewards)
    .map(([key,value])=>`${RESOURCE_LABELS[key as keyof Resources]} +${value}`)
    .join(" · ")||"회수품 없음";
  const routeText=route.active?` · 안전 통로 ${route.appliedChanceBonus?`성공 +${route.appliedChanceBonus}%`:"성공률 상한"} · 노출 -${route.exposureReduction}`:"";
  const message=`탐색 ${outcomeLabel} · ${mission.name} · ${scout.name}${routeText} · ${rewardText}${healthDelta?` · 체력 ${healthDelta}`:""} · 괴물 위협 +${threatDelta}`;
  const report:ScavengeReport={day:state.day,missionId:mission.id,missionName:mission.name,guestId:scout.id,guestName:scout.name,chance,roll,outcome,resources:rewards,threatDelta,healthDelta,routeChanceBonus:route.appliedChanceBonus,routeExposureReduction:route.exposureReduction,message};
  const spent=changeResources(state.resources,Object.fromEntries(Object.entries(mission.cost).map(([key,value])=>[key,-Number(value)])) as Partial<Resources>);
  const resources=changeResources(spent,rewards);
  const guests=state.guests.map((guest)=>guest.id===scout.id?{...guest,health:clamp(guest.health+healthDelta),stress:clamp(guest.stress+stressDelta)}:guest);
  const visitorHistory=state.visitorHistory.map((entry)=>entry.visitorId===scout.id?{...entry,events:[...entry.events,`DAY ${state.day} · ${message}`]}:entry);
  return {ok:true,message,report,state:{...state,actionPoints:state.actionPoints-1,resources,guests,visitorHistory,lastScavengeDay:state.day,lastScavengeReport:report,flags:{...state.flags,monster_threat:clamp(Number(state.flags.monster_threat??0)+threatDelta)},reputations:{...state.reputations,community:clamp(state.reputations.community+(outcome==="CLEAN_SUCCESS"?2:outcome==="SUCCESS"?1:0))},eventHistory:[...state.eventHistory,{day:state.day,type:"RESOURCE",message}]}};
}

export function getNightStaffPlan(state:Pick<GameState,"staffAssignments"|"guests">):{
  foodSaving:number; conditionDelta:number; securityDelta:number; threatDelta:number;
  healingGuestId:string|null; healing:number; results:StaffDutyResult[];
} {
  const assignments=pruneStaffAssignments(state.staffAssignments,state.guests);
  const assigned=(dutyId:StaffDutyId)=>state.guests.find((guest)=>guest.id===assignments[dutyId])??null;
  const maintenance=assigned("MAINTENANCE");
  const security=assigned("SECURITY");
  const medic=assigned("MEDICAL");
  const kitchen=assigned("KITCHEN");
  const staying=state.guests.filter(isActiveStaff);
  const conditionDelta=maintenance?(maintenance.skills.repair>=80?3:maintenance.skills.repair>=50?2:1):0;
  const securityDelta=security?(security.skills.combat>=75?2:1):0;
  const threatDelta=security?(security.skills.combat>=75?-2:-1):0;
  const foodSaving=kitchen&&staying.length>=2?(kitchen.skills.work>=75?2:1):0;
  const patient=medic?[...staying].filter((guest)=>guest.health<100||guest.infectionState!=="HEALTHY").sort((a,b)=>a.health-b.health||a.id.localeCompare(b.id))[0]??null:null;
  const healing=patient&&medic?(medic.skills.medical>=80?6:medic.skills.medical>=50?4:2):0;
  const results:StaffDutyResult[]=[];
  if (maintenance&&conditionDelta) results.push({dutyId:"MAINTENANCE",guestId:maintenance.id,guestName:maintenance.name,effect:`Hotel Condition +${conditionDelta}`});
  if (security) results.push({dutyId:"SECURITY",guestId:security.id,guestName:security.name,effect:`Security +${securityDelta} · Monster Threat ${threatDelta}`});
  if (medic&&patient&&healing) results.push({dutyId:"MEDICAL",guestId:medic.id,guestName:medic.name,effect:`${patient.name} Health +${healing}`});
  if (kitchen&&foodSaving) results.push({dutyId:"KITCHEN",guestId:kitchen.id,guestName:kitchen.name,effect:`식량 수요 -${foodSaving}`});
  return {foodSaving,conditionDelta,securityDelta,threatDelta,healingGuestId:patient?.id??null,healing,results};
}
