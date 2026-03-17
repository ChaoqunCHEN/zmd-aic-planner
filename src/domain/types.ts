export type SourceConfidence = "verified" | "probable" | "partial" | "unknown";

export type SourceMeta = {
  sourceSystem: string;
  sourceConfidence: SourceConfidence;
  sourceNotes?: string[];
};

export type SourceRef = {
  endpoint?: string;
  path?: string;
  label?: string;
  rawValue?: unknown;
};

export type AssetRef = {
  kind: "icon" | "illustration" | "sprite" | "other";
  path?: string;
  url?: string;
  sourceUrl?: string;
  mimeType?: string;
  sha256?: string;
  alt?: string;
};

export type PlannerCategory = "machines" | "logistics" | "storage" | "utilities";
export type AvailabilityStatus = "validated" | "reference-only";
export type PlacementKind = "area" | "linear";
export type PlaceableSubtype =
  | "machine"
  | "terminal"
  | "storage"
  | "belt"
  | "pipe"
  | "logistics-building";
export type PortSide = "north" | "east" | "south" | "west" | "center";
export type PortMediumKind = "item" | "fluid" | "logistics";

export type CatalogEntity = {
  id: string;
  kind: string;
  name: string;
  nameZhHans: string;
  description?: string;
  icon?: AssetRef;
  illustration?: AssetRef;
  tags?: string[];
  source: SourceMeta;
  sourceRefs?: SourceRef[];
};

export type PortDefinition = {
  id: string;
  flow: "input" | "output";
  resourceIds: string[];
  side: PortSide;
  offset: number;
  mediumKind: PortMediumKind;
  maxLinks: number;
};

export type Footprint = {
  width: number;
  height: number;
};

export type PlaceableItem = CatalogEntity & {
  kind: "placeable";
  worldCategory: "placeable";
  plannerCategory: PlannerCategory;
  sourceCategoryLabel?: string;
  sourceSubCategoryLabel?: string;
  inGameTypeId?: string;
  inGameTypeLabel?: string;
  inGameRarityLabel?: string;
  inGameQualityLabel?: string;
  usageHints?: string[];
  availabilityStatus: AvailabilityStatus;
  placementKind: PlacementKind;
  placeableClass?: PlacementKind;
  subtype: PlaceableSubtype;
  footprint: Footprint;
  ports: PortDefinition[];
  recipeIds?: string[];
  supportedModeIds?: string[];
  defaultModeId?: string;
};

export type ResourceItem = CatalogEntity & {
  kind: "resource";
  referenceKind: "resource";
  unit: string;
};

export type RecipeIo = {
  resourceId: string;
  amount: number;
};

export type RecipeItem = CatalogEntity & {
  kind: "recipe";
  referenceKind: "recipe";
  machineId: string;
  durationSeconds: number;
  inputs: RecipeIo[];
  outputs: RecipeIo[];
};

export type MachineMode = CatalogEntity & {
  kind: "machine-mode";
  referenceKind: "machine-mode";
  machineId: string;
  throughputMultiplier: number;
  powerMultiplier: number;
};

export type RuleFragment = CatalogEntity & {
  kind: "rule-fragment";
  referenceKind: "rule-fragment";
  ruleType: "external-input-cap";
  resourceId: string;
  sitePresetIds: string[];
  defaultCap: number;
  unit: string;
};

export type SiteFixtureType = CatalogEntity & {
  kind: "site-fixture-type";
  referenceKind: "site-fixture-type";
  fixtureCategory: "resource-deposit" | "obstacle";
  resourceId?: string;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SiteFixturePlacement = {
  id: string;
  fixtureTypeId: string;
  x: number;
  y: number;
};

export type SitePreset = CatalogEntity & {
  kind: "site-preset";
  referenceKind: "site-preset";
  width: number;
  height: number;
  buildableZones: Rect[];
  blockedZones: Rect[];
  fixtures: SiteFixturePlacement[];
};

export type DatasetManifest = {
  version: string;
  files: {
    placeableItems: string;
    resources: string;
    recipes: string;
    machineModes: string;
    sitePresets: string;
    siteFixtures: string;
    ruleFragments: string;
  };
};

export type RawDatasetFiles = {
  manifest: DatasetManifest;
  placeableItems: PlaceableItem[];
  resources: ResourceItem[];
  recipes: RecipeItem[];
  machineModes: MachineMode[];
  sitePresets: SitePreset[];
  siteFixtures: SiteFixtureType[];
  ruleFragments: RuleFragment[];
};

export type DatasetBundle = {
  version: string;
  manifest: DatasetManifest;
  placeableItems: Readonly<Record<string, PlaceableItem>>;
  resources: Readonly<Record<string, ResourceItem>>;
  recipes: Readonly<Record<string, RecipeItem>>;
  machineModes: Readonly<Record<string, MachineMode>>;
  sitePresets: Readonly<Record<string, SitePreset>>;
  siteFixtures: Readonly<Record<string, SiteFixtureType>>;
  ruleFragments: Readonly<Record<string, RuleFragment>>;
};

export type LoadDatasetResult =
  | { ok: true; data: DatasetBundle }
  | { ok: false; errors: string[] };
