import type { HotelLogEntry } from "./types.ts";

export type HotelLogFilter = "ALL" | HotelLogEntry["type"];

export function getHotelLogEntries(history: HotelLogEntry[], filter: HotelLogFilter = "ALL"): { entry: HotelLogEntry; index: number }[] {
  return history.map((entry, index) => ({ entry, index })).filter(({ entry }) => filter === "ALL" || entry.type === filter).reverse();
}
