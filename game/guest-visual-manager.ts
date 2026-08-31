import type { Guest, GuestExpression } from "./types.ts";

export type GuestVisualModifier = "WET" | "EXHAUSTED" | "BANDAGED" | "BLOODIED" | "INFECTED";

export type GuestVisualState = {
  asset: string | null;
  expression: GuestExpression;
  modifiers: GuestVisualModifier[];
  label: string;
};

export type NightEventPortrait = { guestId: string; expression?: GuestExpression };

const NIGHT_EVENT_PORTRAITS: Partial<Record<string, [NightEventPortrait, NightEventPortrait]>> = {
  medical_shift: [{ guestId: "eleanor" }, { guestId: "ruth" }],
  owen_hayes_standoff: [{ guestId: "owen", expression: "angry" }, { guestId: "hayes", expression: "angry" }],
  lily_vale_breakthrough: [{ guestId: "lily", expression: "happy" }, { guestId: "vale", expression: "suspicious" }],
};

const STORY_EVENT_EXPRESSIONS: Partial<Record<string, GuestExpression>> = {
  "mia-daniel": "afraid",
  "mia-family": "happy",
  "claire-pursuer": "afraid",
  "claire-future": "happy",
  "walter-father-lie": "suspicious",
  "walter-key": "happy",
  "daniel-proof": "suspicious",
  "daniel-family": "happy",
  "samuel-ledger": "sad",
  "samuel-duty": "happy",
  "jack-double-deal": "suspicious",
  "jack-market": "happy",
  "grace-sermon": "suspicious",
  "grace-faith": "happy",
  "noah-cellar": "sad",
  "noah-table": "happy",
  "victor-contract": "suspicious",
  "victor-crown": "happy",
  "rosa-ration": "angry",
  "rosa-family": "happy",
  "eli-theft": "suspicious",
  "eli-keyring": "happy",
  "hazel-hunt": "angry",
  "hazel-watch": "happy",
};

export function getNightEventPortraits(eventId: string): [NightEventPortrait, NightEventPortrait] | null {
  return NIGHT_EVENT_PORTRAITS[eventId] ?? null;
}

export function getStoryEventExpression(eventId: string): GuestExpression | undefined {
  return STORY_EVENT_EXPRESSIONS[eventId];
}

export function getGuestVisualState(guest: Guest, expressionOverride?: GuestExpression): GuestVisualState {
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
  if (expressionOverride) expression = expressionOverride;

  const labels: Record<GuestVisualModifier, string> = {
    WET: "젖은 옷",
    EXHAUSTED: "탈진",
    BANDAGED: "붕대",
    BLOODIED: "출혈 흔적",
    INFECTED: "감염 징후",
  };

  return {
    asset: (guest.portraitVariants?.[expression] ?? guest.portrait) || null,
    expression,
    modifiers,
    label: modifiers.map((modifier) => labels[modifier]).join(" · ") || "외관 이상 없음",
  };
}
