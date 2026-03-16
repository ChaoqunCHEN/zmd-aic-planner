import { rawDatasetFilesSchema } from "./schemas";
import { errorResult, validateDataset } from "./validateDataset";
import type {
  CatalogEntity,
  DatasetBundle,
  LoadDatasetResult,
  RawDatasetFiles
} from "../types";

function formatSchemaPath(path: PropertyKey[]) {
  return path.length === 0 ? "(root)" : path.join(".");
}

function toFrozenRecord<T extends CatalogEntity>(items: T[]): Readonly<Record<string, T>> {
  const normalized = Object.fromEntries(items.map((item) => [item.id, Object.freeze(item)]));
  return Object.freeze(normalized);
}

function deepFreezeBundle(raw: RawDatasetFiles): DatasetBundle {
  return Object.freeze({
    version: raw.manifest.version,
    manifest: Object.freeze(raw.manifest),
    placeableItems: toFrozenRecord(raw.placeableItems),
    resources: toFrozenRecord(raw.resources),
    recipes: toFrozenRecord(raw.recipes),
    machineModes: toFrozenRecord(raw.machineModes),
    sitePresets: toFrozenRecord(raw.sitePresets),
    siteFixtures: toFrozenRecord(raw.siteFixtures),
    ruleFragments: toFrozenRecord(raw.ruleFragments)
  });
}

export function loadDataset(input: unknown): LoadDatasetResult {
  const parsed = rawDatasetFilesSchema.safeParse(input);

  if (!parsed.success) {
    return errorResult(
      parsed.error.issues.map((issue) => `${formatSchemaPath(issue.path)}: ${issue.message}`)
    );
  }

  const validationErrors = validateDataset(parsed.data);

  if (validationErrors.length > 0) {
    return errorResult(validationErrors);
  }

  return {
    ok: true,
    data: deepFreezeBundle(parsed.data)
  };
}
