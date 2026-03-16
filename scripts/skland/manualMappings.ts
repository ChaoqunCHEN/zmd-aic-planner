export type ManualItemMapping = {
  englishName?: string;
  subtype?: "machine" | "terminal";
};

const itemMappings: Record<string, ManualItemMapping> = {
  "12345": {
    englishName: "Extractor Pump",
    subtype: "machine"
  }
};

export function getManualItemMapping(sourceItemId: string): ManualItemMapping | undefined {
  return itemMappings[sourceItemId];
}

export function resolveSubtype(sourceItemId: string): "machine" | "terminal" {
  return getManualItemMapping(sourceItemId)?.subtype ?? "machine";
}
