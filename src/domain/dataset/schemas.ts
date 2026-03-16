import { z } from "zod";

export const sourceMetaSchema = z.object({
  sourceSystem: z.string().min(1),
  sourceConfidence: z.enum(["verified", "probable", "partial", "unknown"]),
  sourceNotes: z.array(z.string()).optional()
});

export const sourceRefSchema = z.object({
  endpoint: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  rawValue: z.unknown().optional()
});

export const assetRefSchema = z.object({
  kind: z.enum(["icon", "illustration", "sprite", "other"]),
  path: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
  sourceUrl: z.string().min(1).optional(),
  mimeType: z.string().min(1).optional(),
  sha256: z.string().min(1).optional(),
  alt: z.string().min(1).optional()
});

export const catalogEntitySchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  name: z.string().min(1),
  nameZhHans: z.string().min(1),
  description: z.string().optional(),
  icon: assetRefSchema.optional(),
  illustration: assetRefSchema.optional(),
  tags: z.array(z.string()).optional(),
  source: sourceMetaSchema,
  sourceRefs: z.array(sourceRefSchema).optional()
});

export const portDefinitionSchema = z.object({
  id: z.string().min(1),
  flow: z.enum(["input", "output"]),
  resourceIds: z.array(z.string().min(1)).min(1)
});

export const footprintSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive()
});

export const placeableItemSchema = catalogEntitySchema.extend({
  kind: z.literal("placeable"),
  worldCategory: z.literal("placeable"),
  placeableClass: z.literal("area"),
  subtype: z.enum(["machine", "terminal"]),
  footprint: footprintSchema,
  ports: z.array(portDefinitionSchema),
  recipeIds: z.array(z.string().min(1)).optional(),
  supportedModeIds: z.array(z.string().min(1)).optional(),
  defaultModeId: z.string().min(1).optional()
});

export const resourceItemSchema = catalogEntitySchema.extend({
  kind: z.literal("resource"),
  referenceKind: z.literal("resource"),
  unit: z.string().min(1)
});

export const recipeIoSchema = z.object({
  resourceId: z.string().min(1),
  amount: z.number().positive()
});

export const recipeItemSchema = catalogEntitySchema.extend({
  kind: z.literal("recipe"),
  referenceKind: z.literal("recipe"),
  machineId: z.string().min(1),
  durationSeconds: z.number().positive(),
  inputs: z.array(recipeIoSchema).min(1),
  outputs: z.array(recipeIoSchema).min(1)
});

export const machineModeSchema = catalogEntitySchema.extend({
  kind: z.literal("machine-mode"),
  referenceKind: z.literal("machine-mode"),
  machineId: z.string().min(1),
  throughputMultiplier: z.number().positive(),
  powerMultiplier: z.number().positive()
});

export const ruleFragmentSchema = catalogEntitySchema.extend({
  kind: z.literal("rule-fragment"),
  referenceKind: z.literal("rule-fragment"),
  ruleType: z.literal("external-input-cap"),
  resourceId: z.string().min(1),
  sitePresetIds: z.array(z.string().min(1)).min(1),
  defaultCap: z.number().positive(),
  unit: z.string().min(1)
});

export const siteFixtureTypeSchema = catalogEntitySchema.extend({
  kind: z.literal("site-fixture-type"),
  referenceKind: z.literal("site-fixture-type"),
  fixtureCategory: z.enum(["resource-deposit", "obstacle"]),
  resourceId: z.string().min(1).optional()
});

export const rectSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive()
});

export const siteFixturePlacementSchema = z.object({
  id: z.string().min(1),
  fixtureTypeId: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative()
});

export const sitePresetSchema = catalogEntitySchema.extend({
  kind: z.literal("site-preset"),
  referenceKind: z.literal("site-preset"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  buildableZones: z.array(rectSchema).min(1),
  blockedZones: z.array(rectSchema),
  fixtures: z.array(siteFixturePlacementSchema)
});

export const datasetManifestSchema = z.object({
  version: z.string().min(1),
  files: z.object({
    placeableItems: z.string().min(1),
    resources: z.string().min(1),
    recipes: z.string().min(1),
    machineModes: z.string().min(1),
    sitePresets: z.string().min(1),
    siteFixtures: z.string().min(1),
    ruleFragments: z.string().min(1)
  })
});

export const rawDatasetFilesSchema = z.object({
  manifest: datasetManifestSchema,
  placeableItems: z.array(placeableItemSchema),
  resources: z.array(resourceItemSchema),
  recipes: z.array(recipeItemSchema),
  machineModes: z.array(machineModeSchema),
  sitePresets: z.array(sitePresetSchema),
  siteFixtures: z.array(siteFixtureTypeSchema),
  ruleFragments: z.array(ruleFragmentSchema)
});
