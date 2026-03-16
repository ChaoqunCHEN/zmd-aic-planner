import { getManualItemMapping } from "./manualMappings";

export function buildPlannerId(input: {
  subtype: "machine" | "terminal";
  sourceItemId: string;
}) {
  return `${input.subtype}.skland-${input.sourceItemId}`;
}

export function buildEnglishFallbackName(input: {
  sourceItemId: string;
  zhName: string;
}) {
  return (
    getManualItemMapping(input.sourceItemId)?.englishName ??
    `Skland Equipment ${input.sourceItemId}`
  );
}
