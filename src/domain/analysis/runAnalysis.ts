import { buildDiagnostics } from "../diagnostics/buildDiagnostics";
import type { Diagnostic } from "../diagnostics/types";
import type { DatasetBundle } from "../types";
import type { PlanDocument } from "../plan/document";
import { buildGraph, type AnalysisGraphNode } from "./buildGraph";

export type Bottleneck = {
  code: "bottleneck.external-cap";
  message: string;
  resourceId: string;
  nodeId: string;
  limitedRate: number;
};

export type AnalysisResult = {
  diagnostics: Diagnostic[];
  nodeRates: Record<string, number>;
  edgeRates: Record<string, number>;
  bottlenecks: Bottleneck[];
};

type ResourceRates = Record<string, number>;

function intersectResourceId(sourceIds: string[], targetIds: string[]) {
  return sourceIds.find((resourceId) => targetIds.includes(resourceId)) ?? null;
}

function isExternalOutputTerminal(node: AnalysisGraphNode) {
  return node.item.subtype === "terminal" && node.item.ports.every((port) => port.flow === "output");
}

function getNominalMachineInputDemand(
  node: AnalysisGraphNode,
  resourceId: string,
  dataset: DatasetBundle
) {
  const recipeId = node.item.recipeIds?.[0];
  const recipe = recipeId ? dataset.recipes[recipeId] : undefined;

  if (!recipe) {
    return 0;
  }

  const throughputMultiplier = node.node.modeId
    ? (dataset.machineModes[node.node.modeId]?.throughputMultiplier ?? 1)
    : 1;
  const baseRate = (60 / recipe.durationSeconds) * throughputMultiplier;

  return recipe.inputs
    .filter((input) => input.resourceId === resourceId)
    .reduce((sum, input) => sum + input.amount * baseRate, 0);
}

function estimateDownstreamDemand(
  nodeId: string,
  resourceId: string,
  graph: ReturnType<typeof buildGraph>,
  dataset: DatasetBundle,
  visited = new Set<string>()
): number {
  if (visited.has(nodeId)) {
    return 0;
  }

  visited.add(nodeId);
  const node = graph.nodes[nodeId];
  if (!node) {
    return 0;
  }

  let demand = getNominalMachineInputDemand(node, resourceId, dataset);

  for (const edge of node.outgoingEdges) {
    const sourcePort = node.item.ports.find((port) => port.id === edge.sourcePortId);
    const targetNode = graph.nodes[edge.targetNodeId];
    const targetPort = targetNode?.item.ports.find((port) => port.id === edge.targetPortId);

    if (
      !sourcePort ||
      sourcePort.flow !== "output" ||
      !targetNode ||
      !targetPort ||
      !sourcePort.resourceIds.includes(resourceId) ||
      !targetPort.resourceIds.includes(resourceId)
    ) {
      continue;
    }

    demand += estimateDownstreamDemand(
      targetNode.node.id,
      resourceId,
      graph,
      dataset,
      visited
    );
  }

  return demand;
}

function countOutgoingEdgesForResource(
  sourceNode: AnalysisGraphNode,
  resourceId: string,
  graph: ReturnType<typeof buildGraph>
) {
  return sourceNode.outgoingEdges.filter((edge) => {
    const sourcePort = sourceNode.item.ports.find((port) => port.id === edge.sourcePortId);
    const targetNode = graph.nodes[edge.targetNodeId];
    const targetPort = targetNode?.item.ports.find((port) => port.id === edge.targetPortId);

    if (!sourcePort || !targetPort) {
      return false;
    }

    return (
      sourcePort.flow === "output" &&
      sourcePort.resourceIds.includes(resourceId) &&
      targetPort.resourceIds.includes(resourceId)
    );
  }).length;
}

function hasUpstreamCappedExternalSource(
  nodeId: string,
  resourceId: string,
  graph: ReturnType<typeof buildGraph>,
  plan: PlanDocument,
  visited = new Set<string>()
): boolean {
  if (visited.has(nodeId)) {
    return false;
  }

  visited.add(nodeId);
  const node = graph.nodes[nodeId];

  if (!node) {
    return false;
  }

  if (
    isExternalOutputTerminal(node) &&
    plan.siteConfig.externalInputCaps[resourceId] !== undefined
  ) {
    return true;
  }

  for (const edge of node.incomingEdges) {
    const sourceNode = graph.nodes[edge.sourceNodeId];
    const sourcePort = sourceNode?.item.ports.find((port) => port.id === edge.sourcePortId);
    const targetPort = node.item.ports.find((port) => port.id === edge.targetPortId);

    if (
      !sourceNode ||
      !sourcePort ||
      !targetPort ||
      !sourcePort.resourceIds.includes(resourceId) ||
      !targetPort.resourceIds.includes(resourceId)
    ) {
      continue;
    }

    if (hasUpstreamCappedExternalSource(sourceNode.node.id, resourceId, graph, plan, visited)) {
      return true;
    }
  }

  return false;
}

function getOfferedRateForEdge(
  edge: { sourcePortId: string },
  resourceId: string,
  sourceNode: AnalysisGraphNode,
  targetNode: AnalysisGraphNode,
  machineOutputRates: Map<string, ResourceRates>,
  machineInputRates: Map<string, ResourceRates>,
  plan: PlanDocument,
  graph: ReturnType<typeof buildGraph>,
  dataset: DatasetBundle
) {
  let sourceSupply = machineOutputRates.get(sourceNode.node.id)?.[resourceId] ?? 0;

  if (isExternalOutputTerminal(sourceNode)) {
    const explicitCap = plan.siteConfig.externalInputCaps[resourceId];

    if (explicitCap !== undefined) {
      sourceSupply = explicitCap;
    } else {
      sourceSupply = targetNode.item.subtype === "machine"
        ? machineInputRates.get(targetNode.node.id)?.[resourceId] ?? 0
        : estimateDownstreamDemand(targetNode.node.id, resourceId, graph, dataset);
    }
  }

  const sourceOutEdges = countOutgoingEdgesForResource(sourceNode, resourceId, graph);
  return sourceSupply / Math.max(1, sourceOutEdges);
}

export function runAnalysis(plan: PlanDocument, dataset: DatasetBundle): AnalysisResult {
  const diagnostics = buildDiagnostics(plan, dataset);
  const graph = buildGraph(plan, dataset);
  const machineInputRates = new Map<string, ResourceRates>();
  const machineRequiredInputRates = new Map<string, ResourceRates>();
  const machineOutputRates = new Map<string, ResourceRates>();
  const baseNodeRates = new Map<string, number>();
  const recordedBottlenecks = new Set<string>();
  const nodeRates: Record<string, number> = {};
  const edgeRates: Record<string, number> = {};
  const bottlenecks: Bottleneck[] = [];

  for (const nodeId of graph.topologicalOrder) {
    const graphNode = graph.nodes[nodeId];
    if (!graphNode) {
      continue;
    }

    const { node, item } = graphNode;
    const recipeId = item.recipeIds?.[0];
    const recipe = recipeId ? dataset.recipes[recipeId] : undefined;

    if (!recipe) {
      const passthroughInputs: ResourceRates = {};
      const passthroughOutputs: ResourceRates = {};

      for (const edge of graphNode.incomingEdges) {
        const sourceNode = graph.nodes[edge.sourceNodeId];
        if (!sourceNode) {
          continue;
        }

        const sourcePort = sourceNode.item.ports.find((candidate) => candidate.id === edge.sourcePortId);
        const targetPort = item.ports.find((candidate) => candidate.id === edge.targetPortId);

        if (!sourcePort || !targetPort) {
          continue;
        }

        const resourceId = intersectResourceId(sourcePort.resourceIds, targetPort.resourceIds);
        if (!resourceId) {
          continue;
        }

        passthroughInputs[resourceId] =
          (passthroughInputs[resourceId] ?? 0) +
          getOfferedRateForEdge(
            edge,
            resourceId,
            sourceNode,
            graphNode,
            machineOutputRates,
            machineInputRates,
            plan,
            graph,
            dataset
          );
      }

      for (const [resourceId, suppliedRate] of Object.entries(passthroughInputs)) {
        if (
          item.ports.some(
            (port) => port.flow === "output" && port.resourceIds.includes(resourceId)
          )
        ) {
          passthroughOutputs[resourceId] = suppliedRate;
        }
      }

      baseNodeRates.set(nodeId, 0);
      machineInputRates.set(nodeId, passthroughInputs);
      machineOutputRates.set(nodeId, passthroughOutputs);
      continue;
    }

    const throughputMultiplier = node.modeId
      ? (dataset.machineModes[node.modeId]?.throughputMultiplier ?? 1)
      : 1;
    const baseRate = (60 / recipe.durationSeconds) * throughputMultiplier;
    const inputRates: ResourceRates = {};
    const outputRates: ResourceRates = {};
    let nodeRatio = 1;

    for (const input of recipe.inputs) {
      const port = item.ports.find(
        (candidate) =>
          candidate.flow === "input" && candidate.resourceIds.includes(input.resourceId)
      );

      const requiredRate = input.amount * baseRate;
      let suppliedRate = 0;

      if (port) {
        for (const edge of graphNode.incomingEdges.filter((candidate) => candidate.targetPortId === port.id)) {
          const sourceNode = graph.nodes[edge.sourceNodeId];
          if (!sourceNode) {
            continue;
          }

          const sourcePort = sourceNode.item.ports.find(
            (candidate) => candidate.id === edge.sourcePortId
          );

          if (!sourcePort) {
            continue;
          }

          const resourceId = intersectResourceId(sourcePort.resourceIds, port.resourceIds);
          if (!resourceId) {
            continue;
          }

          suppliedRate += getOfferedRateForEdge(
            edge,
            resourceId,
            sourceNode,
            graphNode,
            machineOutputRates,
            machineInputRates,
            plan,
            graph,
            dataset
          );
        }
      }

      inputRates[input.resourceId] = Math.min(suppliedRate, requiredRate);
      const requiredInputs = machineRequiredInputRates.get(nodeId) ?? {};
      requiredInputs[input.resourceId] = requiredRate;
      machineRequiredInputRates.set(nodeId, requiredInputs);
      nodeRatio = Math.min(nodeRatio, requiredRate === 0 ? 1 : suppliedRate / requiredRate);

      const bottleneckKey = `${nodeId}:${input.resourceId}`;
      if (
        requiredRate > suppliedRate &&
        !recordedBottlenecks.has(bottleneckKey) &&
        hasUpstreamCappedExternalSource(nodeId, input.resourceId, graph, plan)
      ) {
        bottlenecks.push({
          code: "bottleneck.external-cap",
          message: `External ${dataset.resources[input.resourceId]?.name ?? input.resourceId} supply limits node "${nodeId}".`,
          resourceId: input.resourceId,
          nodeId,
          limitedRate: Math.max(0, suppliedRate)
        });
        recordedBottlenecks.add(bottleneckKey);
      }
    }

    if (!Number.isFinite(nodeRatio)) {
      nodeRatio = 1;
    }

    const actualCycleRate = Math.max(0, Math.min(1, nodeRatio)) * baseRate;

    for (const output of recipe.outputs) {
      outputRates[output.resourceId] = output.amount * actualCycleRate;
    }

    baseNodeRates.set(nodeId, baseRate);
    nodeRates[nodeId] = actualCycleRate;
    machineInputRates.set(nodeId, inputRates);
    machineOutputRates.set(nodeId, outputRates);
  }

  for (const edge of Object.values(graph.edges)) {
    const sourceNode = graph.nodes[edge.sourceNodeId];
    const targetNode = graph.nodes[edge.targetNodeId];

    if (!sourceNode || !targetNode) {
      continue;
    }

    const sourcePort = sourceNode.item.ports.find((port) => port.id === edge.sourcePortId);
    const targetPort = targetNode.item.ports.find((port) => port.id === edge.targetPortId);

    if (!sourcePort || !targetPort) {
      continue;
    }

    const resourceId = intersectResourceId(sourcePort.resourceIds, targetPort.resourceIds);
    if (!resourceId) {
      continue;
    }

    const sourceOffered = getOfferedRateForEdge(
      edge,
      resourceId,
      sourceNode,
      targetNode,
      machineOutputRates,
      machineInputRates,
      plan,
      graph,
      dataset
    );

    let targetDemand = Number.POSITIVE_INFINITY;
    if (targetNode.item.subtype === "machine") {
      targetDemand = machineInputRates.get(targetNode.node.id)?.[resourceId] ?? 0;
    }

    const targetInEdges = targetNode.incomingEdges.filter(
      (candidate) => candidate.targetPortId === edge.targetPortId
    );

    let totalTargetOffered = 0;
    for (const candidate of targetInEdges) {
      const candidateSourceNode = graph.nodes[candidate.sourceNodeId];
      const candidateSourcePort = candidateSourceNode?.item.ports.find(
        (port) => port.id === candidate.sourcePortId
      );

      if (!candidateSourceNode || !candidateSourcePort) {
        continue;
      }

      const candidateResourceId = intersectResourceId(
        candidateSourcePort.resourceIds,
        targetPort.resourceIds
      );

      if (candidateResourceId !== resourceId) {
        continue;
      }

      totalTargetOffered += getOfferedRateForEdge(
        candidate,
        candidateResourceId,
        candidateSourceNode,
        targetNode,
        machineOutputRates,
        machineInputRates,
        plan,
        graph,
        dataset
      );
    }

    const scale =
      !Number.isFinite(targetDemand) || totalTargetOffered === 0
        ? 1
        : Math.min(1, targetDemand / totalTargetOffered);

    edgeRates[edge.id] = sourceOffered * scale;
  }

  for (const graphNode of Object.values(graph.nodes)) {
    const isOutputTerminal =
      graphNode.item.subtype === "terminal" &&
      graphNode.item.ports.every((port) => port.flow === "output");
    const isInputTerminal =
      graphNode.item.subtype === "terminal" &&
      graphNode.item.ports.every((port) => port.flow === "input");

    if (isOutputTerminal) {
      nodeRates[graphNode.node.id] = graphNode.outgoingEdges.reduce(
        (sum, edge) => sum + (edgeRates[edge.id] ?? 0),
        0
      );
    }

    if (isInputTerminal) {
      nodeRates[graphNode.node.id] = graphNode.incomingEdges.reduce(
        (sum, edge) => sum + (edgeRates[edge.id] ?? 0),
        0
      );
    }
  }

  return {
    diagnostics,
    nodeRates,
    edgeRates,
    bottlenecks
  };
}
