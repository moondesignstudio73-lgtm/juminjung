import type { Resources } from "./types.ts";

export function createResources(): Resources {
  return { food: 48, water: 54, medicine: 18, fuel: 62, parts: 6, security: 35 };
}
