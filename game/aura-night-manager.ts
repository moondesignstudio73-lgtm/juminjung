import { getDiseaseChance } from "./aura-effect-manager.ts";
import type { AuraMetric, EventFlags, Guest, Room, WorldState } from "./types.ts";

export type AuraNightResolution = {
  guests:Guest[];
  foodDemand:number;
  waterDemand:number;
  securityDelta:number;
  hotelConditionDelta:number;
  mutualAidConditionRepair:number;
  crimeDelta:number;
  threatDelta:number;
  tradeBonus:{food:number;parts:number};
  sickGuestIds:string[];
  clinicPreventedGuestIds:string[];
  perimeterAlarmThreatReduction:number;
  pathfinderThreatReduction:number;
  communityKitchenFoodSaving:number;
  civilGuardSecurityGain:number;
  civilGuardCrimeReduction:number;
  careTeamGuestIds:string[];
  nurseryGuestIds:string[];
  householdWaterSaving:number;
};

const clamp = (value:number,min=0,max=100) => Math.max(min,Math.min(max,value));
const effectsFor = (room:Room|undefined, metric:AuraMetric) => room ? [...room.permanentEffects,...room.temporaryEffects].filter((effect)=>effect.metric===metric) : [];
const additiveValue = (room:Room|undefined, metric:AuraMetric) => effectsFor(room,metric).reduce((sum,effect)=>sum+effect.value,0);
const diseaseBaseChance:Record<WorldState,number> = {STABLE:2,UNREST:6,COLLAPSE:12,CRITICAL:20,END_STAGE:28};
const stableGuestSeed = (guestId:string) => [...guestId].reduce((seed,character)=>(seed*31+character.charCodeAt(0))%100,0);
export const ELEANOR_CLINIC_DISEASE_REDUCTION = 5;
export const PERIMETER_ALARM_THREAT_REDUCTION = 3;
export const COMMUNITY_KITCHEN_FOOD_SAVING = 1;
export const CIVIL_GUARD_SECURITY_GAIN = 2;
export const CIVIL_GUARD_CRIME_REDUCTION = 2;
export const CARE_TEAM_HEALTH_RECOVERY = 3;
export const CARE_TEAM_STRESS_RELIEF = 4;
export const HOUSEHOLD_NETWORK_WATER_SAVING = 1;
export const PATHFINDER_THREAT_REDUCTION = 1;
export const NURSERY_STRESS_RELIEF = 3;
export const MUTUAL_AID_CONDITION_REPAIR = 1;

export function isCareTeamEligible(guest:Guest):boolean {
  return guest.age<18||guest.age>=65||guest.health<80||guest.infectionState!=="HEALTHY"||guest.baseTraits.includes("Pregnant");
}

export function isNurseryEligible(guest:Guest):boolean {
  return guest.age<18||guest.baseTraits.includes("Pregnant");
}

export function getNightFoodDemand(rooms:Room[], guests:Guest[], flags:EventFlags={}):{demand:number;saving:number} {
  const staying = guests.filter((guest)=>guest.status==="STAYING"&&guest.currentRoomNumber!==null);
  const foodUnits = staying.reduce((total,guest)=>{
    const room = rooms.find((candidate)=>candidate.roomNumber===guest.currentRoomNumber);
    return total+Math.max(.25,1+additiveValue(room,"foodUse")/100);
  },0);
  const demandBeforeKitchen = Math.ceil(foodUnits);
  const saving = flags.noah_community_kitchen===true&&staying.length>=2 ? Math.min(COMMUNITY_KITCHEN_FOOD_SAVING,demandBeforeKitchen) : 0;
  return {demand:demandBeforeKitchen-saving,saving};
}

export function getNightWaterDemand(guests:Guest[], flags:EventFlags={}):{demand:number;saving:number} {
  const residentCount = guests.filter((guest)=>guest.status==="STAYING"&&guest.currentRoomNumber!==null).length;
  const saving = flags.rosa_household_network===true&&residentCount>=2 ? Math.min(HOUSEHOLD_NETWORK_WATER_SAVING,residentCount) : 0;
  return {demand:residentCount-saving,saving};
}

export function resolveAuraNight(rooms:Room[], guests:Guest[], day:number, worldState:WorldState, baseDiseaseChance=diseaseBaseChance[worldState], flags:EventFlags={}):AuraNightResolution {
  const staying = guests.filter((guest)=>guest.status==="STAYING"&&guest.currentRoomNumber!==null);
  const guestById = new Map(guests.map((guest)=>[guest.id,guest]));
  const food = getNightFoodDemand(rooms,guests,flags);
  const water = getNightWaterDemand(guests,flags);
  let securityScore = 0;
  let breakdownScore = 0;
  let crimeScore = 0;
  let threatScore = 0;
  let tradeScore = 0;
  const sickGuestIds:string[] = [];
  const clinicPreventedGuestIds:string[] = [];
  const careTeamGuestIds:string[] = [];
  const nurseryGuestIds:string[] = [];
  const clinicActive = flags.eleanor_clinic_established === true;
  const perimeterAlarmActive = flags.perimeter_alarm === true;
  const pathfinderActive = flags.eli_pathfinder === true;
  const civilGuardActive = flags.samuel_civil_guard === true;
  const careTeamActive = flags.ruth_care_team === true;
  const nurseryActive = flags.claire_nursery === true;
  const mutualAidActive = flags.grace_mutual_aid === true;

  const adjustedStats = new Map(staying.map((guest)=>{
    const room = rooms.find((candidate)=>candidate.roomNumber===guest.currentRoomNumber);
    const auraStress = clamp(guest.stress+additiveValue(room,"stress"));
    const careTeamEligible = careTeamActive&&isCareTeamEligible(guest);
    const careTeamStress = careTeamEligible?clamp(auraStress-CARE_TEAM_STRESS_RELIEF):auraStress;
    const nurseryEligible = nurseryActive&&isNurseryEligible(guest);
    const stress = nurseryEligible?clamp(careTeamStress-NURSERY_STRESS_RELIEF):careTeamStress;
    const health = careTeamEligible?clamp(guest.health+CARE_TEAM_HEALTH_RECOVERY):guest.health;
    if (health>guest.health||careTeamStress<auraStress) careTeamGuestIds.push(guest.id);
    if (stress<careTeamStress) nurseryGuestIds.push(guest.id);
    return [guest.id,{
      stress,
      trust:clamp(guest.trust+additiveValue(room,"trust")),
      health,
    }] as const;
  }));

  const updatedById = new Map(staying.map((guest)=>{
    const room = rooms.find((candidate)=>candidate.roomNumber===guest.currentRoomNumber);
    securityScore += additiveValue(room,"security");
    breakdownScore += additiveValue(room,"breakdownRisk");
    threatScore += additiveValue(room,"monsterThreat")-additiveValue(room,"information")/2;
    tradeScore += additiveValue(room,"trade");
    crimeScore += effectsFor(room,"theftRisk").reduce((sum,effect)=>sum+(((adjustedStats.get(effect.sourceGuestId)?.trust??guestById.get(effect.sourceGuestId)?.trust??100)<50)?effect.value:0),0);

    const {stress,trust,health} = adjustedStats.get(guest.id)!;
    const unprotectedChance = room ? clamp(getDiseaseChance(room,"NORMAL_DISEASE",baseDiseaseChance)) : clamp(baseDiseaseChance);
    const clinicBaseChance = clinicActive ? clamp(baseDiseaseChance-ELEANOR_CLINIC_DISEASE_REDUCTION) : clamp(baseDiseaseChance);
    const chance = room ? clamp(getDiseaseChance(room,"NORMAL_DISEASE",clinicBaseChance)) : clinicBaseChance;
    const roll = (day*37+(guest.currentRoomNumber??0)*13+stableGuestSeed(guest.id))%100;
    const becomesSick = guest.infectionState==="HEALTHY"&&roll<chance;
    const preventedByClinic = guest.infectionState==="HEALTHY"&&clinicActive&&roll>=chance&&roll<unprotectedChance;
    if (becomesSick) sickGuestIds.push(guest.id);
    if (preventedByClinic) clinicPreventedGuestIds.push(guest.id);
    return [guest.id,{...guest,stress,trust,health:becomesSick?clamp(health-10):health,infectionState:becomesSick?"SICK" as const:guest.infectionState}] as const;
  }));

  const threatWithoutAlarm = clamp(Math.round(threatScore/10),-10,10);
  const threatAfterAlarm = clamp(threatWithoutAlarm-(perimeterAlarmActive?PERIMETER_ALARM_THREAT_REDUCTION:0),-10,10);
  const threatDelta = clamp(threatAfterAlarm-(pathfinderActive?PATHFINDER_THREAT_REDUCTION:0),-10,10);
  const securityWithoutCivilGuard = clamp(Math.round(securityScore/10),-10,10);
  const securityDelta = clamp(securityWithoutCivilGuard+(civilGuardActive?CIVIL_GUARD_SECURITY_GAIN:0),-10,10);
  const civilGuardSecurityGain = securityDelta-securityWithoutCivilGuard;
  const crimeWithoutCivilGuard = clamp(Math.round(crimeScore/10),0,10);
  const crimeDelta = clamp(crimeWithoutCivilGuard-(civilGuardActive?CIVIL_GUARD_CRIME_REDUCTION:0),-10,10);
  const civilGuardCrimeReduction = crimeWithoutCivilGuard-crimeDelta;
  const conditionWithoutMutualAid = clamp(Math.round(-breakdownScore/10),-10,10);
  const hotelConditionDelta = clamp(conditionWithoutMutualAid+(mutualAidActive?MUTUAL_AID_CONDITION_REPAIR:0),-10,10);
  return {
    guests:guests.map((guest)=>updatedById.get(guest.id)??guest),
    foodDemand:food.demand,
    waterDemand:water.demand,
    securityDelta,
    hotelConditionDelta,
    mutualAidConditionRepair:hotelConditionDelta-conditionWithoutMutualAid,
    crimeDelta,
    threatDelta,
    tradeBonus:{food:Math.floor(Math.max(0,tradeScore)/20),parts:Math.floor(Math.max(0,tradeScore)/40)},
    sickGuestIds,
    clinicPreventedGuestIds,
    perimeterAlarmThreatReduction:threatWithoutAlarm-threatAfterAlarm,
    pathfinderThreatReduction:threatAfterAlarm-threatDelta,
    communityKitchenFoodSaving:food.saving,
    civilGuardSecurityGain,
    civilGuardCrimeReduction,
    careTeamGuestIds,
    nurseryGuestIds,
    householdWaterSaving:water.saving,
  };
}
