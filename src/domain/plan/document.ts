import type { DatasetBundle, PlaceableItem } from "../types";

export type Rotation = 0 | 90 | 180 | 270;

export type GridPoint = {
  x: number;
  y: number;
};

export type GridSize = {
  width: number;
  height: number;
};

export type PlanMetadata = {
  name: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
};

export type SiteConfig = {
  sitePresetId: string;
  externalInputCaps: Record<string, number>;
};

export type PlanNodeKind = "machine" | "logistics" | "io";

export type PlanNode = {
  id: string;
  catalogId: string;
  kind: PlanNodeKind;
  position: GridPoint;
  footprint: GridSize;
  rotation: Rotation;
  modeId?: string;
  settings: Record<string, unknown>;
};

export type PlanEdge = {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
};

export type PlanDocument = {
  formatVersion: string;
  datasetVersion: string;
  metadata: PlanMetadata;
  siteConfig: SiteConfig;
  nodes: Record<string, PlanNode>;
  edges: Record<string, PlanEdge>;
};

export type CreatePlanOptions = {
  sitePresetId: string;
  projectName?: string;
  now?: string;
};

export const PLAN_FORMAT_VERSION = "1";

function inferNodeKind(item: PlaceableItem): PlanNodeKind {
  if (item.subtype === "machine") {
    return "machine";
  }

  if (item.subtype === "terminal") {
    return "io";
  }

  return "logistics";
}

export function createPlanNode(
  nodeId: string,
  item: PlaceableItem,
  position: GridPoint,
  rotation: Rotation
): PlanNode {
  return {
    id: nodeId,
    catalogId: item.id,
    kind: inferNodeKind(item),
    position,
    footprint: { ...item.footprint },
    rotation,
    modeId: item.defaultModeId,
    settings: {}
  };
}

export function createPlan(dataset: DatasetBundle, options: CreatePlanOptions): PlanDocument {
  const now = options.now ?? new Date().toISOString();

  if (!dataset.sitePresets[options.sitePresetId]) {
    throw new Error(`Unknown site preset "${options.sitePresetId}"`);
  }

  return {
    formatVersion: PLAN_FORMAT_VERSION,
    datasetVersion: dataset.version,
    metadata: {
      name: options.projectName ?? "Untitled project",
      createdAt: now,
      updatedAt: now
    },
    siteConfig: {
      sitePresetId: options.sitePresetId,
      externalInputCaps: {}
    },
    nodes: {},
    edges: {}
  };
}
