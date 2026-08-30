import type { Guest } from "./types.ts";

export type GuestExpression = "neutral" | "happy" | "sad" | "angry" | "afraid" | "suspicious" | "injured";
export type GuestVisualModifier = "WET" | "EXHAUSTED" | "BANDAGED" | "BLOODIED" | "INFECTED";

export type GuestVisualState = {
  asset: string | null;
  expression: GuestExpression;
  modifiers: GuestVisualModifier[];
  label: string;
};

export function getGuestVisualState(guest: Guest): GuestVisualState {
  const modifiers: GuestVisualModifier[] = [];
  const infected = guest.infectionState === "INFECTED" || guest.infectionState === "INFECTED_SUSPECTED";
  const injured = guest.infectionState === "INJURED" || guest.health <= 45;
  const exhausted = guest.stress >= 70 || guest.health < 65;

  if (guest.status === "WAITING") modifiers.push("WET");
  if (exhausted) modifiers.push("EXHAUSTED");
  if (guest.infectionState === "INJURED") modifiers.push("BANDAGED");
  if (guest.infectionState === "INJURED" || guest.health <= 30) modifiers.push("BLOODIED");
  if (infected) modifiers.push("INFECTED");

  let expression: GuestExpression = "neutral";
  if (injured || infected) expression = "injured";
  else if (guest.stress >= 80) expression = "afraid";
  else if (guest.riskLevel >= 70 || guest.trust <= 10) expression = "suspicious";
  else if (guest.trust >= 75 && guest.stress <= 35) expression = "happy";
  else if (guest.stress >= 60) expression = "sad";

  const labels: Record<GuestVisualModifier, string> = {
    WET: "젖은 옷",
    EXHAUSTED: "탈진",
    BANDAGED: "붕대",
    BLOODIED: "출혈 흔적",
    INFECTED: "감염 징후",
  };

  return {
    asset: guest.portrait || null,
    expression,
    modifiers,
    label: modifiers.map((modifier) => labels[modifier]).join(" · ") || "외관 이상 없음",
  };
}
