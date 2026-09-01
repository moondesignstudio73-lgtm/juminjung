import { getActivePowerCircuits, calculatePowerPlan } from "./daily-survival-manager.ts";
import { MONSTER_CODEX } from "./monster-codex-data.ts";
import { DEFAULT_NIGHT_PREPARATION, NIGHT_PREPARATION_OPTIONS } from "./night-preparation-data.ts";
import { hasMonsterCountermeasure } from "./monster-codex-manager.ts";
import type { GameState, NightPreparationCategory, NightPreparationConfig, NightPreparationEffect, NightPreparationOptionDefinition, NightPreparationOptionId } from "./types.ts";

export const CODEX_EXTERIOR_LIGHT_THREAT_REDUCTION = Math.abs(MONSTER_CODEX.find((entry) => entry.id === "MIMIC_STALKER")?.preparationCountermeasure?.effect.threat ?? 0);

const optionById = new Map(NIGHT_PREPARATION_OPTIONS.map((option) => [option.id, option]));

function combineNightPreparationEffects(effects: ReadonlyArray<NightPreparationEffect>) {
  return effects.reduce((total, effect) => ({
    securityDelta: total.securityDelta + Number(effect.hotelStats?.security ?? 0),
    crimeDelta: total.crimeDelta + Number(effect.hotelStats?.crime ?? 0),
    hotelConditionDelta: total.hotelConditionDelta + Number(effect.hotelStats?.hotelCondition ?? 0),
    threatDelta: total.threatDelta + Number(effect.threat ?? 0),
    guestStressDelta: total.guestStressDelta + Number(effect.allGuestStress ?? 0),
    diseaseChanceDelta: total.diseaseChanceDelta + Number(effect.diseaseChance ?? 0),
  }), { securityDelta: 0, crimeDelta: 0, hotelConditionDelta: 0, threatDelta: 0, guestStressDelta: 0, diseaseChanceDelta: 0 });
}

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
  const activeOptionIds = new Set(active.map((option) => option.id));
  const codexCountermeasures = MONSTER_CODEX.filter((definition) => {
    const response = definition.preparationCountermeasure;
    return Boolean(response && activeOptionIds.has(response.optionId) && hasMonsterCountermeasure(state, definition.id));
  });
  const codexEffects = codexCountermeasures.map((definition) => definition.preparationCountermeasure!.effect);
  const combinedEffects = combineNightPreparationEffects([...active.map((option) => option.effect), ...codexEffects]);
  return {
    selected,
    active,
    warnings,
    fuelCost: reservedFuel,
    ...combinedEffects,
    codexApplied: codexCountermeasures.length > 0,
    codexAppliedEntryIds: codexCountermeasures.map((definition) => definition.id),
    codexAppliedNames: codexCountermeasures.map((definition) => definition.name),
  };
}
