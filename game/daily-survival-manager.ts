import type { DailyObjective, FoodRationPolicy, GameState, Guest, PowerCircuitId } from "./types.ts";
import { getInvestigationCaseDefinition, getOpenInvestigationCases } from "./investigation-manager.ts";
import { isVulnerableResident } from "./resident-vulnerability.ts";

export const POWER_CIRCUITS: ReadonlyArray<{ id: PowerCircuitId; name: string; description: string }> = [
  { id: "SECURITY", name: "방호 회로", description: "바리케이드 조명과 감시 장비를 유지합니다." },
  { id: "CLINIC", name: "진료 회로", description: "부상자와 환자의 야간 처치를 유지합니다." },
  { id: "KITCHEN", name: "주방 회로", description: "조리와 보관 설비의 식량 손실을 막습니다." },
];

export const PRIORITY_RATION_LIMITED_STRESS_DELTA = 2;
export const PRIORITY_RATION_SEVERE_STRESS_DELTA = 8;
export const VULNERABLE_RATION_PROTECTION_DESCRIPTION = `취약 주민은 제한 배급 Stress +${PRIORITY_RATION_LIMITED_STRESS_DELTA}, 극단 절약 Stress +${PRIORITY_RATION_SEVERE_STRESS_DELTA} · Health 보호`;

export const RATION_POLICIES: ReadonlyArray<{ id: FoodRationPolicy; name: string; description: string }> = [
  { id: "NORMAL", name: "정상 배급", description: "개인별 기본 수요 지급 · Stress -5" },
  { id: "LIMITED", name: "제한 배급", description: `식량 30% 절약 · Stress +5 · 보호 원칙 활성 시 취약 주민 +${PRIORITY_RATION_LIMITED_STRESS_DELTA}` },
  { id: "SEVERE", name: "극단 절약", description: `식량 60% 절약 · Stress +15 · Health -3 · 보호 원칙 활성 시 취약 주민 +${PRIORITY_RATION_SEVERE_STRESS_DELTA} · Health 보호` },
];

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export function getPowerCapacity(fuel: number, microgridActive = false): number {
  if (microgridActive) return POWER_CIRCUITS.length;
  if (fuel >= 20) return 3;
  if (fuel >= 8) return 2;
  if (fuel > 0) return 1;
  return 0;
}

export function getActivePowerCircuits(state: Pick<GameState, "resources" | "flags" | "powerAllocation"> & Partial<Pick<GameState, 'day'>>): PowerCircuitId[] {
  if (state.day !== undefined && state.flags.generator_outage_day === state.day) return [];
  const capacity = getPowerCapacity(state.resources.fuel, state.flags.generator_network_stable === true);
  return POWER_CIRCUITS.map(({ id }) => id).filter((id) => state.powerAllocation.includes(id)).slice(0, capacity);
}

export function configurePowerCircuit(state: GameState, circuitId: PowerCircuitId, enabled: boolean): { state: GameState; ok: boolean; message: string } {
  const selected = state.powerAllocation.includes(circuitId);
  if (selected === enabled) return { state, ok: true, message: "전력 배분이 이미 적용되어 있습니다." };
  if (!enabled) return { state: { ...state, powerAllocation: state.powerAllocation.filter((id) => id !== circuitId) }, ok: true, message: `${circuitId} 회로 대기` };
  const capacity = getPowerCapacity(state.resources.fuel, state.flags.generator_network_stable === true);
  if (state.powerAllocation.length >= capacity) return { state, ok: false, message: "현재 연료로 가동할 수 있는 회로 수를 초과합니다." };
  return { state: { ...state, powerAllocation: [...state.powerAllocation, circuitId] }, ok: true, message: `${circuitId} 회로 가동 예약` };
}

export function configureFoodRation(state: GameState, policy: FoodRationPolicy): GameState {
  return { ...state, foodRationPolicy: policy };
}

export function getRationPlan(baseFoodDemand: number, policy: FoodRationPolicy): { foodDemand: number; stressDelta: number; healthDelta: number } {
  if (baseFoodDemand <= 0) return { foodDemand: 0, stressDelta: 0, healthDelta: 0 };
  const round1 = (value:number) => Math.round(value*10)/10;
  if (policy === "LIMITED") return { foodDemand: Math.max(.1, round1(baseFoodDemand * .7)), stressDelta: 5, healthDelta: 0 };
  if (policy === "SEVERE") return { foodDemand: Math.max(.1, round1(baseFoodDemand * .4)), stressDelta: 15, healthDelta: -3 };
  return { foodDemand: round1(baseFoodDemand), stressDelta: -5, healthDelta: 0 };
}

export function getResidentRationEffects(
  guest: Guest,
  ration: ReturnType<typeof getRationPlan>,
  vulnerableProtectionActive = false,
): { stressDelta: number; healthDelta: number; protected: boolean } {
  if (!vulnerableProtectionActive || !isVulnerableResident(guest) || ration.stressDelta <= 0) {
    return { stressDelta: ration.stressDelta, healthDelta: ration.healthDelta, protected: false };
  }
  if (ration.healthDelta < 0) {
    return { stressDelta: PRIORITY_RATION_SEVERE_STRESS_DELTA, healthDelta: 0, protected: true };
  }
  return { stressDelta: PRIORITY_RATION_LIMITED_STRESS_DELTA, healthDelta: ration.healthDelta, protected: true };
}

export function applySurvivalGuestEffects(guest: Guest, ration: ReturnType<typeof getRationPlan>, clinicPowered: boolean, vulnerableProtectionActive = false): Guest {
  const needsClinic = guest.infectionState !== "HEALTHY" || guest.health < 80;
  const residentRation = getResidentRationEffects(guest, ration, vulnerableProtectionActive);
  return {
    ...guest,
    stress: clamp(guest.stress + residentRation.stressDelta),
    health: clamp(guest.health + residentRation.healthDelta + (!clinicPowered && needsClinic ? -3 : 0)),
  };
}

export function calculatePowerPlan(state: GameState, occupiedGuests: number) {
  const microgridActive = state.flags.generator_network_stable === true;
  const capacity = state.flags.generator_outage_day === state.day ? 0 : getPowerCapacity(state.resources.fuel, microgridActive);
  const activeCircuits = getActivePowerCircuits(state);
  const securityPowered = activeCircuits.includes("SECURITY");
  const clinicPowered = activeCircuits.includes("CLINIC");
  const kitchenPowered = activeCircuits.includes("KITCHEN");
  const warnings = [
    ...(!securityPowered ? ["방호 회로 정지 · Security -4 · Monster Threat +3"] : []),
    ...(!clinicPowered && occupiedGuests ? ["진료 회로 정지 · 부상자와 환자 Health -3"] : []),
    ...(!kitchenPowered && occupiedGuests ? ["주방 회로 정지 · 식량 수요 +1"] : []),
  ];
  return {
    capacity,
    activeCircuits,
    fuelDemand: microgridActive || activeCircuits.length === 0 ? 0 : 1,
    securityDelta: securityPowered ? 0 : -4,
    threatDelta: securityPowered ? 0 : 3,
    extraFoodDemand: kitchenPowered || occupiedGuests === 0 ? 0 : 1,
    clinicPowered,
    warnings,
  };
}

export function getDailyObjectives(state: GameState): DailyObjective[] {
  const staying = state.guests.filter((guest) => guest.status === "STAYING").length;
  const damagedRooms = state.rooms.filter((room) => room.status === "DAMAGED" || room.status === "LOCKED").length;
  const threat = Number(state.flags.monster_threat ?? 0);
  const capacity = getPowerCapacity(state.resources.fuel, state.flags.generator_network_stable === true);
  const issues: DailyObjective[] = [];
  if (state.resources.food <= Math.max(6, staying * 3)) issues.push({ id: "food_shortage", priority: "URGENT", title: "식량 부족 대응", description: `식량 ${state.resources.food} · 투숙객 ${staying}명`, actionHint: "배급을 조정하거나 교역 원정을 준비하십시오." });
  if (capacity < 3) issues.push({ id: "power_shortage", priority: capacity <= 1 ? "URGENT" : "RECOMMENDED", title: "제한 전력 배분", description: `현재 ${capacity}/3 회로 가동 가능 · 연료 ${state.resources.fuel}`, actionHint: "오늘 탭의 전력 배분에서 반드시 필요한 회로만 선택하세요." });
  if (threat >= 25) issues.push({ id: "monster_threat", priority: threat >= 45 ? "URGENT" : "RECOMMENDED", title: "외곽 위협 상승", description: `괴물 위협 ${threat}`, actionHint: "시설 탭의 경계 순찰을 실행하거나 오늘 탭에서 방호 회로를 켜세요." });
  if (state.hotelStats.hotelCondition <= 50 || damagedRooms) issues.push({ id: "hotel_damage", priority: state.hotelStats.hotelCondition <= 35 ? "URGENT" : "RECOMMENDED", title: "호텔 손상 복구", description: `상태 ${state.hotelStats.hotelCondition} · 손상/봉쇄 객실 ${damagedRooms}`, actionHint: "시설 탭에서 부품 2와 AP 1을 사용해 호텔 보수를 실행하세요." });
  if (state.resources.medicine <= 3 && state.guests.some((guest) => guest.status === "STAYING" && guest.infectionState !== "HEALTHY")) issues.push({ id: "medicine_shortage", priority: "URGENT", title: "의약품 고갈 임박", description: `의약품 ${state.resources.medicine}`, actionHint: "진료 회로를 유지하고 교역 경로를 찾으십시오." });
  const openCase=getOpenInvestigationCases(state)[0];
  if (openCase) {
    const definition=getInvestigationCaseDefinition(openCase.caseId)!;
    issues.push({id:`investigation_${openCase.caseId.toLowerCase()}`,priority:"RECOMMENDED",title:`조사 미완료 · ${definition.title}`,description:`증거 ${openCase.collectedEvidenceIds.length}/${definition.points.length} · 결론에 필요한 증거 ${definition.minimumEvidenceToConclude}`,actionHint:"기록 탭에서 AP를 사용해 현장을 조사하고 직접 결론을 선택하세요."});
  }
  if (staying > 0 && !state.staffAssignments.SCAVENGE) issues.push({ id: "scout_unassigned", priority: "RECOMMENDED", title: "외부 정찰 담당자 없음", description: "탐색 능력이 있는 투숙객이 아직 외부 임무에 배치되지 않았습니다.", actionHint: "인력 탭 → 외부 정찰 담당자에서 탐색 수치가 높은 투숙객을 선택하세요." });
  if (!issues.length) issues.push({ id: "stable_operations", priority: "OPTIONAL", title: "호텔 운영 안정화", description: `행동 포인트 ${state.actionPoints}/${state.maxActionPoints}`, actionHint: "시설을 강화하거나 공동체 신뢰를 쌓으십시오." });
  const order = { URGENT: 0, RECOMMENDED: 1, OPTIONAL: 2 } as const;
  return issues.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 5);
}
