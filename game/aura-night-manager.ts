import { getDiseaseChance } from "./aura-effect-manager.ts";
import type { AuraMetric, Guest, Room, WorldState } from "./types.ts";

export type AuraNightResolution = {
  guests:Guest[];
  foodDemand:number;
  securityDelta:number;
  hotelConditionDelta:number;
  crimeDelta:number;
  threatDelta:number;
  tradeBonus:{food:number;parts:number};
  sickGuestIds:string[];
};

const clamp = (value:number,min=0,max=100) => Math.max(min,Math.min(max,value));
const effectsFor = (room:Room|undefined, metric:AuraMetric) => room ? [...room.permanentEffects,...room.temporaryEffects].filter((effect)=>effect.metric===metric) : [];
const additiveValue = (room:Room|undefined, metric:AuraMetric) => effectsFor(room,metric).reduce((sum,effect)=>sum+effect.value,0);
const diseaseBaseChance:Record<WorldState,number> = {STABLE:2,UNREST:6,COLLAPSE:12,CRITICAL:20,END_STAGE:28};
const stableGuestSeed = (guestId:string) => [...guestId].reduce((seed,character)=>(seed*31+character.charCodeAt(0))%100,0);

export function resolveAuraNight(rooms:Room[], guests:Guest[], day:number, worldState:WorldState, baseDiseaseChance=diseaseBaseChance[worldState]):AuraNightResolution {
  const staying = guests.filter((guest)=>guest.status==="STAYING"&&guest.currentRoomNumber!==null);
  const guestById = new Map(guests.map((guest)=>[guest.id,guest]));
  let foodUnits = 0;
  let securityScore = 0;
  let breakdownScore = 0;
  let crimeScore = 0;
  let threatScore = 0;
  let tradeScore = 0;
  const sickGuestIds:string[] = [];

  const adjustedStats = new Map(staying.map((guest)=>{
    const room = rooms.find((candidate)=>candidate.roomNumber===guest.currentRoomNumber);
    return [guest.id,{
      stress:clamp(guest.stress+additiveValue(room,"stress")),
      trust:clamp(guest.trust+additiveValue(room,"trust")),
    }] as const;
  }));

  const updatedById = new Map(staying.map((guest)=>{
    const room = rooms.find((candidate)=>candidate.roomNumber===guest.currentRoomNumber);
    const foodUse = additiveValue(room,"foodUse");
    foodUnits += Math.max(.25,1+foodUse/100);
    securityScore += additiveValue(room,"security");
    breakdownScore += additiveValue(room,"breakdownRisk");
    threatScore += additiveValue(room,"monsterThreat")-additiveValue(room,"information")/2;
    tradeScore += additiveValue(room,"trade");
    crimeScore += effectsFor(room,"theftRisk").reduce((sum,effect)=>sum+(((adjustedStats.get(effect.sourceGuestId)?.trust??guestById.get(effect.sourceGuestId)?.trust??100)<50)?effect.value:0),0);

    const {stress,trust} = adjustedStats.get(guest.id)!;
    const chance = room ? clamp(getDiseaseChance(room,"NORMAL_DISEASE",baseDiseaseChance)) : baseDiseaseChance;
    const roll = (day*37+(guest.currentRoomNumber??0)*13+stableGuestSeed(guest.id))%100;
    const becomesSick = guest.infectionState==="HEALTHY"&&roll<chance;
    if (becomesSick) sickGuestIds.push(guest.id);
    return [guest.id,{...guest,stress,trust,health:becomesSick?clamp(guest.health-10):guest.health,infectionState:becomesSick?"SICK" as const:guest.infectionState}] as const;
  }));

  return {
    guests:guests.map((guest)=>updatedById.get(guest.id)??guest),
    foodDemand:Math.ceil(foodUnits),
    securityDelta:clamp(Math.round(securityScore/10),-10,10),
    hotelConditionDelta:clamp(Math.round(-breakdownScore/10),-10,10),
    crimeDelta:clamp(Math.round(crimeScore/10),0,10),
    threatDelta:clamp(Math.round(threatScore/10),-10,10),
    tradeBonus:{food:Math.floor(Math.max(0,tradeScore)/20),parts:Math.floor(Math.max(0,tradeScore)/40)},
    sickGuestIds,
  };
}
