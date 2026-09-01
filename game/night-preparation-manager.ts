import { getActivePowerCircuits, calculatePowerPlan } from "./daily-survival-manager.ts";
import { DEFAULT_NIGHT_PREPARATION, NIGHT_PREPARATION_OPTIONS } from "./night-preparation-data.ts";
import { hasMonsterCountermeasure } from "./monster-codex-manager.ts";
import type { GameState, NightPreparationCategory, NightPreparationConfig, NightPreparationOptionDefinition, NightPreparationOptionId } from "./types.ts";

export const CODEX_EXTERIOR_LIGHT_THREAT_REDUCTION = 2;

const optionById = new Map(NIGHT_PREPARATION_OPTIONS.map((option) => [option.id, option]));

export function getNightPreparationOption(id: NightPreparationOptionId): NightPreparationOptionDefinition | undefined {
  return optionById.get(id);
}

export function normalizeNightPreparation(value: unknown): NightPreparationConfig {
  const saved = value && typeof value === "object" ? value as Partial<Record<NightPreparationCategory, unknown>> : {};
  return Object.fromEntries((Object.keys(DEFAULT_NIGHT_PREPARATION) as NightPreparationCategory[]).map((category) => {
    const id = saved[category];
    const option = typeof id === "string" ? optionById.get(id as NightPreparationOptionId) : undefined;
    return [category, option?.category === category ? option.id : DEFAULT_NIGHT_PREPARATION[category]];
  })) as NightPreparationConfig;
}

export function configureNightPreparation(state: GameState, category: NightPreparationCategory, optionId: NightPreparationOptionId): { state: GameState; ok: boolean; message: string } {
  const option = optionById.get(optionId);
  if (!option || option.category !== category) return { state, ok: false, message: "선택한 야간 준비 정책이 해당 구역과 일치하지 않습니다." };
  if (state.nightPreparation[category] === optionId) return { state, ok: true, message: `${option.name} 정책이 이미 적용되어 있습니다.` };
  return { state: { ...state, nightPreparation: { ...state.nightPreparation, [category]: optionId } }, ok: true, message: `${option.name} 정책 예약` };
}

type NightPreparationPowerContext = Pick<ReturnType<typeof calculatePowerPlan>, "activeCircuits" | "fuelDemand">;

export function getNightPreparationPlan(state: GameState, powerContext?: NightPreparationPowerContext) {
  const selected = (Object.keys(DEFAULT_NIGHT_PREPARATION) as NightPreparationCategory[]).map((category) => optionById.get(state.nightPreparation[category])!).filter(Boolean);
  const calculatedPower = powerContext ?? calculatePowerPlan(state, state.guests.filter((guest) => guest.status === "STAYING").length);
  const activeCircuits = powerContext?.activeCircuits ?? getActivePowerCircuits(state);
  const baseFuelDemand = calculatedPower.fuelDemand;
  const warnings: string[] = [];
  let reservedFuel = 0;
  const active: NightPreparationOptionDefinition[] = [];
  for (const option of selected) {
    if (option.requiresPowerCircuit && !activeCircuits.includes(option.requiresPowerCircuit)) {
      warnings.push(`${option.name} 중단 · ${option.requiresPowerCircuit} 회로가 필요합니다.`);
      continue;
    }
    const fuelCost = option.effect.fuelCost ?? 0;
    if (baseFuelDemand + reservedFuel + fuelCost > state.resources.fuel) {
      warnings.push(`${option.name} 중단 · 발전기와 준비에 필요한 연료가 부족합니다.`);
      continue;
    }
    reservedFuel += fuelCost;
    active.push(option);
  }
  const codexApplied = active.some((option) => option.id === "EXTERIOR_LIGHTS") && hasMonsterCountermeasure(state, "MIMIC_STALKER");
  return {
    selected,
    active,
    warnings,
    fuelCost: reservedFuel,
    securityDelta: active.reduce((sum, option) => sum + Number(option.effect.hotelStats?.security ?? 0), 0),
    crimeDelta: active.reduce((sum, option) => sum + Number(option.effect.hotelStats?.crime ?? 0), 0),
    hotelConditionDelta: active.reduce((sum, option) => sum + Number(option.effect.hotelStats?.hotelCondition ?? 0), 0),
    threatDelta: active.reduce((sum, option) => sum + Number(option.effect.threat ?? 0), 0) - (codexApplied ? CODEX_EXTERIOR_LIGHT_THREAT_REDUCTION : 0),
    guestStressDelta: active.reduce((sum, option) => sum + Number(option.effect.allGuestStress ?? 0), 0),
    diseaseChanceDelta: active.reduce((sum, option) => sum + Number(option.effect.diseaseChance ?? 0), 0),
    codexApplied,
  };
}
