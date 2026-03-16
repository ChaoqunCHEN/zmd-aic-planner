import { buildDiagnostics } from "../diagnostics/buildDiagnostics";
import type { Diagnostic } from "../diagnostics/types";
import type { DatasetBundle } from "../types";
import type { PlanDocument } from "../plan/document";
import { buildGraph } from "./buildGraph";

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

export function runAnalysis(plan: PlanDocument, dataset: DatasetBundle): AnalysisResult {
  const diagnostics = buildDiagnostics(plan, dataset);
  const graph = buildGraph(plan, dataset);
  const machineInputRates = new Map<string, ResourceRates>();
  const machineRequiredInputRates = new Map<string, ResourceRates>();
  const machineOutputRates = new Map<string, ResourceRates>();
  const baseNodeRates = new Map<string, number>();
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
      baseNodeRates.set(nodeId, 0);
      machineInputRates.set(nodeId, {});
      machineOutputRates.set(nodeId, {});
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

          let sourceSupply = machineOutputRates.get(sourceNode.node.id)?.[resourceId] ?? 0;

          const sourceIsExternalTerminal =
            sourceNode.item.subtype === "terminal" &&
            sourceNode.item.ports.every((candidate) => candidate.flow === "output");

          if (sourceIsExternalTerminal) {
            sourceSupply = plan.siteConfig.externalInputCaps[resourceId] ?? Number.POSITIVE_INFINITY;
          }

          const outDegree = Math.max(
            1,
            sourceNode.outgoingEdges.filter((candidate) => candidate.sourcePortId === edge.sourcePortId).length
          );
          suppliedRate += sourceSupply / outDegree;
        }
      }

      inputRates[input.resourceId] = Math.min(suppliedRate, requiredRate);
      const requiredInputs = machineRequiredInputRates.get(nodeId) ?? {};
      requiredInputs[input.resourceId] = requiredRate;
      machineRequiredInputRates.set(nodeId, requiredInputs);
      nodeRatio = Math.min(nodeRatio, requiredRate === 0 ? 1 : suppliedRate / requiredRate);
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

    const sourceIsExternalTerminal =
      sourceNode.item.subtype === "terminal" &&
      sourceNode.item.ports.every((port) => port.flow === "output");

    let sourceSupply = machineOutputRates.get(sourceNode.node.id)?.[resourceId] ?? 0;
    if (sourceIsExternalTerminal) {
      const explicitCap = plan.siteConfig.externalInputCaps[resourceId];

      if (explicitCap !== undefined) {
        sourceSupply = explicitCap;
      } else {
        sourceSupply = targetNode.item.subtype === "machine"
          ? machineInputRates.get(targetNode.node.id)?.[resourceId] ?? 0
          : 0;
      }
    }

    const sourceOutEdges = sourceNode.outgoingEdges.filter(
      (candidate) => candidate.sourcePortId === edge.sourcePortId
    );
    const sourceOffered = sourceSupply / Math.max(1, sourceOutEdges.length);

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

      const candidateIsExternalTerminal =
        candidateSourceNode.item.subtype === "terminal" &&
        candidateSourceNode.item.ports.every((port) => port.flow === "output");

      let candidateSupply =
        machineOutputRates.get(candidateSourceNode.node.id)?.[candidateResourceId] ?? 0;

      if (candidateIsExternalTerminal) {
        const candidateCap = plan.siteConfig.externalInputCaps[candidateResourceId];
        candidateSupply =
          candidateCap ??
          (targetNode.item.subtype === "machine"
            ? machineInputRates.get(targetNode.node.id)?.[candidateResourceId] ?? 0
            : 0);
      }

      const candidateOutDegree = Math.max(
        1,
        candidateSourceNode.outgoingEdges.filter(
          (outgoingEdge) => outgoingEdge.sourcePortId === candidate.sourcePortId
        ).length
      );

      totalTargetOffered += candidateSupply / candidateOutDegree;
    }

    const scale =
      !Number.isFinite(targetDemand) || totalTargetOffered === 0
        ? 1
        : Math.min(1, targetDemand / totalTargetOffered);

    edgeRates[edge.id] = sourceOffered * scale;

    if (
      sourceIsExternalTerminal &&
      plan.siteConfig.externalInputCaps[resourceId] !== undefined &&
      targetNode.item.subtype === "machine"
    ) {
      const targetRequired = machineRequiredInputRates.get(targetNode.node.id)?.[resourceId] ?? 0;

      if (targetRequired > edgeRates[edge.id]) {
        bottlenecks.push({
          code: "bottleneck.external-cap",
          message: `External ${dataset.resources[resourceId]?.name ?? resourceId} supply limits node "${targetNode.node.id}".`,
          resourceId,
          nodeId: targetNode.node.id,
          limitedRate: edgeRates[edge.id]
        });
      }
    }
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
