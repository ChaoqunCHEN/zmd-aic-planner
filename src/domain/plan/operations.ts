import type { DatasetBundle } from "../types";
import {
  createPlanNode,
  type GridPoint,
  type PlanDocument,
  type PlanNode,
  type Rotation
} from "./document";
import {
  findBlockedZoneOverlap,
  getNodeRect,
  isRectInBuildableZone,
  isRectWithinSite,
  normalizeRotation,
  rectsOverlap
} from "./geometry";

export type PlacementFailureCode =
  | "unknown-site-preset"
  | "unknown-catalog-item"
  | "out-of-bounds"
  | "outside-buildable-zone"
  | "blocked-zone"
  | "footprint-collision"
  | "unknown-node";

export type PlacementFailure = {
  code: PlacementFailureCode;
  message: string;
  conflictingNodeIds?: string[];
};

export type PlanMutationFailureCode =
  | "unknown-node"
  | "unknown-edge"
  | "unknown-resource";

export type PlanMutationFailure = {
  code: PlanMutationFailureCode;
  message: string;
};

export type PlanMutationResult =
  | { ok: true; plan: PlanDocument }
  | { ok: false; reason: PlanMutationFailure };

export type PlacementResult =
  | { ok: true; plan: PlanDocument; node: PlanNode }
  | { ok: false; reason: PlacementFailure };

export type PlaceNodeInput = {
  nodeId: string;
  catalogId: string;
  position: GridPoint;
  rotation?: Rotation;
};

export type MoveNodeInput = {
  nodeId: string;
  position: GridPoint;
  rotation?: Rotation;
};

function clonePlan(plan: PlanDocument): PlanDocument {
  return {
    ...plan,
    metadata: { ...plan.metadata },
    siteConfig: {
      ...plan.siteConfig,
      externalInputCaps: { ...plan.siteConfig.externalInputCaps }
    },
    nodes: { ...plan.nodes },
    edges: { ...plan.edges }
  };
}

function cloneResult(plan: PlanDocument): PlanMutationResult {
  return {
    ok: true,
    plan
  };
}

function failMutation(code: PlanMutationFailureCode, message: string): PlanMutationResult {
  return {
    ok: false,
    reason: {
      code,
      message
    }
  };
}

function fail(code: PlacementFailureCode, message: string, conflictingNodeIds?: string[]) {
  return {
    ok: false as const,
    reason: {
      code,
      message,
      conflictingNodeIds
    }
  };
}

function evaluatePlacement(
  plan: PlanDocument,
  dataset: DatasetBundle,
  candidate: PlanNode,
  ignoreNodeId?: string
): PlacementResult | null {
  const sitePreset = dataset.sitePresets[plan.siteConfig.sitePresetId];

  if (!sitePreset) {
    return fail(
      "unknown-site-preset",
      `Unknown site preset "${plan.siteConfig.sitePresetId}" in current plan`
    );
  }

  const candidateRect = getNodeRect(candidate);

  if (!isRectWithinSite(candidateRect, sitePreset)) {
    return fail("out-of-bounds", `Node "${candidate.id}" extends outside the site bounds`);
  }

  if (!isRectInBuildableZone(candidateRect, sitePreset)) {
    return fail(
      "outside-buildable-zone",
      `Node "${candidate.id}" must be placed within a buildable zone`
    );
  }

  if (findBlockedZoneOverlap(candidateRect, sitePreset)) {
    return fail("blocked-zone", `Node "${candidate.id}" overlaps a blocked site zone`);
  }

  const collisions = Object.values(plan.nodes)
    .filter((node) => node.id !== ignoreNodeId)
    .filter((node) => rectsOverlap(candidateRect, getNodeRect(node)))
    .map((node) => node.id);

  if (collisions.length > 0) {
    return fail(
      "footprint-collision",
      `Node "${candidate.id}" overlaps an existing footprint`,
      collisions
    );
  }

  return null;
}

export function placeNode(
  plan: PlanDocument,
  dataset: DatasetBundle,
  input: PlaceNodeInput
): PlacementResult {
  const item = dataset.placeableItems[input.catalogId];

  if (!item) {
    return fail("unknown-catalog-item", `Unknown placeable item "${input.catalogId}"`);
  }

  const candidate = createPlanNode(
    input.nodeId,
    item,
    input.position,
    normalizeRotation(input.rotation)
  );

  const placementError = evaluatePlacement(plan, dataset, candidate);
  if (placementError) {
    return placementError;
  }

  const nextPlan = clonePlan(plan);
  nextPlan.nodes[input.nodeId] = candidate;
  nextPlan.metadata.updatedAt = new Date().toISOString();

  return {
    ok: true,
    plan: nextPlan,
    node: candidate
  };
}

export function moveNode(
  plan: PlanDocument,
  dataset: DatasetBundle,
  input: MoveNodeInput
): PlacementResult {
  const existingNode = plan.nodes[input.nodeId];

  if (!existingNode) {
    return fail("unknown-node", `Unknown node "${input.nodeId}"`);
  }

  const candidate: PlanNode = {
    ...existingNode,
    position: input.position,
    rotation: normalizeRotation(input.rotation ?? existingNode.rotation)
  };

  const placementError = evaluatePlacement(plan, dataset, candidate, input.nodeId);
  if (placementError) {
    return placementError;
  }

  const nextPlan = clonePlan(plan);
  nextPlan.nodes[input.nodeId] = candidate;
  nextPlan.metadata.updatedAt = new Date().toISOString();

  return {
    ok: true,
    plan: nextPlan,
    node: candidate
  };
}

export function removeNode(plan: PlanDocument, nodeId: string): PlanDocument {
  if (!plan.nodes[nodeId]) {
    return plan;
  }

  const nextPlan = clonePlan(plan);
  delete nextPlan.nodes[nodeId];

  for (const [edgeId, edge] of Object.entries(nextPlan.edges)) {
    if (edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId) {
      delete nextPlan.edges[edgeId];
    }
  }

  nextPlan.metadata.updatedAt = new Date().toISOString();
  return nextPlan;
}

export type ConnectPortsInput = {
  edgeId?: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
};

export function createEdgeId(input: ConnectPortsInput) {
  return `edge-${input.sourceNodeId}-${input.sourcePortId}-${input.targetNodeId}-${input.targetPortId}`;
}

export function connectPorts(
  plan: PlanDocument,
  input: ConnectPortsInput
): PlanMutationResult {
  if (!plan.nodes[input.sourceNodeId]) {
    return failMutation(
      "unknown-node",
      `Unknown source node "${input.sourceNodeId}" for connection`
    );
  }

  if (!plan.nodes[input.targetNodeId]) {
    return failMutation(
      "unknown-node",
      `Unknown target node "${input.targetNodeId}" for connection`
    );
  }

  const nextPlan = clonePlan(plan);
  const edgeId = input.edgeId ?? createEdgeId(input);
  nextPlan.edges[edgeId] = {
    id: edgeId,
    sourceNodeId: input.sourceNodeId,
    sourcePortId: input.sourcePortId,
    targetNodeId: input.targetNodeId,
    targetPortId: input.targetPortId
  };
  nextPlan.metadata.updatedAt = new Date().toISOString();

  return cloneResult(nextPlan);
}

export function disconnectEdge(
  plan: PlanDocument,
  edgeId: string
): PlanMutationResult {
  if (!plan.edges[edgeId]) {
    return failMutation("unknown-edge", `Unknown edge "${edgeId}"`);
  }

  const nextPlan = clonePlan(plan);
  delete nextPlan.edges[edgeId];
  nextPlan.metadata.updatedAt = new Date().toISOString();

  return cloneResult(nextPlan);
}

export function setNodeMode(
  plan: PlanDocument,
  nodeId: string,
  modeId: string | undefined
): PlanMutationResult {
  const node = plan.nodes[nodeId];
  if (!node) {
    return failMutation("unknown-node", `Unknown node "${nodeId}"`);
  }

  const nextPlan = clonePlan(plan);
  nextPlan.nodes[nodeId] = {
    ...node,
    modeId
  };
  nextPlan.metadata.updatedAt = new Date().toISOString();

  return cloneResult(nextPlan);
}

export function setExternalInputCap(
  plan: PlanDocument,
  resourceId: string,
  cap: number | null
): PlanMutationResult {
  const nextPlan = clonePlan(plan);

  if (cap === null) {
    delete nextPlan.siteConfig.externalInputCaps[resourceId];
  } else {
    nextPlan.siteConfig.externalInputCaps[resourceId] = cap;
  }

  nextPlan.metadata.updatedAt = new Date().toISOString();
  return cloneResult(nextPlan);
}
