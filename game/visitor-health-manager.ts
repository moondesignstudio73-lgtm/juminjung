import { RUTH_FIELD_NURSE_NETWORK } from "./visitor-health-data.ts";
import type { EventFlags, Guest } from "./types.ts";

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

export function applyVisitorArrivalMedicalSupport(guest: Guest, flags: EventFlags, day: number): Guest {
  const network = RUTH_FIELD_NURSE_NETWORK;
  if (
    flags[network.sourceFlag] !== true ||
    guest.npcType !== "NORMAL" ||
    !guest.generated ||
    guest.status !== "WAITING" ||
    guest.storyFlags.ruth_field_nurse_treated === true
  ) return guest;

  const health = clamp(guest.health + network.healthBonus);
  const healthRecovered = health - guest.health;
  const stabilized = guest.infectionState === network.stabilizedState;
  return {
    ...guest,
    health,
    infectionState: stabilized ? "HEALTHY" : guest.infectionState,
    conditionLabel: `${stabilized ? network.stabilizedLabel : guest.conditionLabel} · ${network.shortLabel}`,
    storyFlags: {
      ...guest.storyFlags,
      ruth_field_nurse_treated: true,
      ruth_field_nurse_treated_day: day,
      ruth_field_nurse_health_recovered: healthRecovered,
      ruth_field_nurse_sickness_stabilized: stabilized,
    },
  };
}

export function getArrivalMedicalSupportHistoryEvent(guest: Guest, day: number): string | null {
  if (guest.storyFlags.ruth_field_nurse_treated !== true || Number(guest.storyFlags.ruth_field_nurse_treated_day) !== day) return null;
  const recovered = Math.max(0, Number(guest.storyFlags.ruth_field_nurse_health_recovered ?? 0));
  const stabilized = guest.storyFlags.ruth_field_nurse_sickness_stabilized === true;
  return `DAY ${day} · ${RUTH_FIELD_NURSE_NETWORK.historyLabel} · Health +${recovered}${stabilized ? ` · ${RUTH_FIELD_NURSE_NETWORK.stabilizedLabel}` : ""}`;
}