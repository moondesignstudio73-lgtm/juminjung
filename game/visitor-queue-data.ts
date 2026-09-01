import type { EventFlags } from "./types.ts";

export type VisitorRadioExposureSource = {
  id: "lily_truth_broadcast" | "thomas_radio_grid" | "survivor_testimonies_verified";
  label: string;
  flagKeys: readonly string[];
};

export const VISITOR_RADIO_EXPOSURE_SOURCES: readonly VisitorRadioExposureSource[] = [
  { id: "lily_truth_broadcast", label: "릴리의 진실 방송", flagKeys: ["lily_truth_broadcast", "lily_public_broadcast"] },
  { id: "thomas_radio_grid", label: "토머스의 라디오 중계망", flagKeys: ["thomas_radio_grid"] },
  { id: "survivor_testimonies_verified", label: "생존자 무전 증언", flagKeys: ["survivor_testimonies_verified", "radio_survivor_testimony"] },
] as const;

export const getActiveVisitorRadioExposureSources = (flags: EventFlags): VisitorRadioExposureSource[] =>
  VISITOR_RADIO_EXPOSURE_SOURCES.filter((source) => source.flagKeys.some((flag) => flags[flag] === true));
